import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { buildSidebar, catalogPages, indexCatalog } from '../src/data/catalog-tree.mjs';
import { scaffoldContent } from './scaffold-content.mjs';

const translated = (id) => ({ ru: `Русский ${id}`, en: `English ${id}` });
const category = (id, extra = {}) => ({ id, title: translated(id), description: translated(`${id} description`), ...extra });
const course = (id, modules = []) => ({ id, title: translated(id), description: translated(`${id} description`), modules });

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'courses-catalog-test-'));
  t.after(async () => {
    // Only remove the temporary directory created by this test.
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('courses-catalog-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('courses remain discoverable below thirty category ancestors', () => {
  let tree = category('leaf', { courses: [course('photography')] });
  for (let depth = 30; depth >= 1; depth--) tree = category(`level-${depth}`, { children: [tree] });
  const index = indexCatalog([tree]);
  assert.equal(index.categoryById.size, 31);
  assert.equal(index.categoryById.get('leaf').ancestors.length, 30);
  assert.equal(index.courseById.get('photography').category.id, 'leaf');
  assert.equal(index.courseById.get('photography').ancestors[0].title.ru, 'Русский level-1');
  let group = buildSidebar([tree])[0];
  for (let depth = 1; depth <= 30; depth++) group = group.items[1];
  assert.equal(group.label, 'Русский leaf');
  assert.equal(group.translations.en, 'English leaf');
  assert.equal(group.items[1].items[0].slug, 'courses/photography');
});

test('a category can contain child categories and its own courses', () => {
  const tree = [category('arts', {
    children: [category('photography', { courses: [course('camera')] })],
    courses: [course('composition')],
  })];
  const group = buildSidebar(tree)[0];
  assert.equal(group.items.length, 3);
  assert.equal(group.items[0].slug, 'directions/arts');
  assert.equal(group.items[1].label, 'Русский photography');
  assert.equal(group.items[1].translations.en, 'English photography');
  assert.equal(group.items[1].items[1].items[0].slug, 'courses/camera');
  assert.equal(group.items[2].label, 'Русский composition');
  assert.equal(group.items[2].translations.en, 'English composition');
  assert.equal(group.items[2].items[0].slug, 'courses/composition');
});

test('moving a category preserves routes and updates translated ancestor trails', () => {
  const moved = category('photography', { courses: [course('camera', [category('exposure')])] });
  const before = [category('arts', { children: [moved] }), category('hobbies')];
  const after = [category('arts'), category('hobbies', { children: [moved] })];
  const expected = ['courses/camera', 'courses/camera/exposure', 'directions/arts', 'directions/hobbies', 'directions/photography'];
  assert.deepEqual(catalogPages(before).map((page) => page.path).sort(), expected);
  assert.deepEqual(catalogPages(after).map((page) => page.path).sort(), expected);
  const entry = indexCatalog(after).courseById.get('camera');
  assert.deepEqual([...entry.ancestors, entry.category].map((item) => item.title.ru), ['Русский hobbies', 'Русский photography']);
  assert.deepEqual([...entry.ancestors, entry.category].map((item) => item.title.en), ['English hobbies', 'English photography']);
});

test('moving a course updates ownership without changing course or module paths', () => {
  const camera = course('camera', [category('exposure')]);
  const before = [category('arts', { courses: [camera] }), category('hobbies')];
  const after = [category('arts'), category('hobbies', { courses: [camera] })];
  assert.deepEqual(catalogPages(before).map((page) => page.path).sort(), catalogPages(after).map((page) => page.path).sort());
  const entry = indexCatalog(after).courseById.get('camera');
  assert.equal(entry.category.title.ru, 'Русский hobbies');
  assert.equal(entry.category.title.en, 'English hobbies');
});

test('empty categories retain an overview route and a bilingual menu entry', () => {
  const tree = [category('empty')];
  assert.deepEqual(catalogPages(tree).map((page) => page.path), ['directions/empty']);
  const [group] = buildSidebar(tree);
  assert.equal(group.label, 'Русский empty');
  assert.equal(group.translations.en, 'English empty');
  assert.equal(group.items.length, 1);
  assert.equal(group.items[0].slug, 'directions/empty');
  assert.deepEqual(buildSidebar([]), []);
  assert.deepEqual(catalogPages([]), []);
});

test('category cycles fail clearly instead of recursing indefinitely', () => {
  const root = category('root');
  root.children = [category('child', { children: [root] })];
  assert.throws(() => indexCatalog([root]), /cycle.*root/i);
});

test('duplicate category IDs in different branches are rejected', () => {
  assert.throws(() => indexCatalog([
    category('arts', { children: [category('same')] }),
    category('science', { children: [category('same')] }),
  ]), /Duplicate category id "same"/);
});

test('duplicate course IDs across category depths are rejected', () => {
  assert.throws(() => indexCatalog([category('arts', {
    courses: [course('same')], children: [category('photo', { courses: [course('same')] })],
  })]), /Duplicate course id "same"/);
});

test('module IDs must be unique in a course but can repeat across courses', () => {
  assert.throws(() => indexCatalog([category('arts', {
    courses: [course('camera', [category('basics'), category('basics')])],
  })]), /Duplicate module id "basics"/);
  assert.deepEqual(catalogPages([category('arts', {
    courses: [course('camera', [category('basics')]), course('lighting', [category('basics')])],
  })]).filter((page) => page.props.module).map((page) => page.path), ['courses/camera/basics', 'courses/lighting/basics']);
});

for (const field of ['title', 'description']) {
  for (const locale of ['ru', 'en']) {
    test(`missing ${field}.${locale} translation is reported`, () => {
      const entry = category('photo');
      entry[field][locale] = ' ';
      assert.throws(() => indexCatalog([entry]), new RegExp(`${field}\\.${locale} is required`));
    });
  }
}

test('unsafe IDs cannot become filesystem paths', () => {
  for (const id of ['../outside', 'nested/path', 'Bad-ID', 'фото', '', 42]) {
    assert.throws(() => indexCatalog([category(id)]), /id must contain/);
  }
});

test('invalid category children, course lists and modules are reported', () => {
  assert.throws(() => indexCatalog([category('photo', { children: 'wrong' })]), /children must be an array/);
  assert.throws(() => indexCatalog([category('photo', { children: null })]), /children must be an array/);
  assert.throws(() => indexCatalog([category('photo', { courses: {} })]), /courses must be an array/);
  assert.throws(() => indexCatalog([category('photo', { courses: [course('camera', {})] })]), /modules must be an array/);
});

test('scaffolding creates nested category, course and module pages in both languages', async (t) => {
  const root = await temporaryDirectory(t);
  const tree = [category('arts', { children: [category('photo', {
    courses: [course('camera', [category('exposure')])],
  })] })];
  assert.equal(await scaffoldContent(root, tree), 10);
  assert.match(await readFile(join(root, 'ru/directions/photo/index.mdx'), 'utf8'), /title: "Русский photo"/);
  assert.match(await readFile(join(root, 'en/directions/photo/index.mdx'), 'utf8'), /title: "English photo"/);
  assert.match(await readFile(join(root, 'en/directions/photo/index.mdx'), 'utf8'), /<Catalog category="photo" \/>/);
  assert.match(await readFile(join(root, 'ru/courses/camera/exposure/index.mdx'), 'utf8'), /<Catalog course="camera" module="exposure" \/>/);
  assert.match(await readFile(join(root, 'en/courses/camera/exposure/index.mdx'), 'utf8'), /label: "Section overview"/);
  assert.equal(await scaffoldContent(root, tree), 0);
});

test('scaffolding preserves legacy area pages and author content byte-for-byte', async (t) => {
  const root = await temporaryDirectory(t);
  const target = join(root, 'ru/directions/photo/index.mdx');
  await mkdir(dirname(target), { recursive: true });
  const authored = Buffer.from('---\r\ntitle: Мой заголовок\r\n---\r\n<Catalog area="photo" />\r\nАвторский текст.\r\n');
  await writeFile(target, authored);
  assert.equal(await scaffoldContent(root, [category('photo')]), 3);
  assert.deepEqual(await readFile(target), authored);
});

test('invalid catalog data is rejected before scaffolding writes any pages', async (t) => {
  const root = await temporaryDirectory(t);
  await assert.rejects(scaffoldContent(root, [category('../outside')]), /id must contain/);
  assert.deepEqual(await readdir(root), []);
});
