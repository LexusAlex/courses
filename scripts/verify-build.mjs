import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { categories, locales } from '../src/data/catalog.mjs';
import { catalogPages, indexCatalog } from '../src/data/catalog-tree.mjs';

if (existsSync('.env')) loadEnvFile('.env');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const base = `/${(process.env.SITE_BASE || '').split('/').filter(Boolean).join('/')}`.replace(/^\/$/, '');
const origin = new URL(process.env.SITE_URL || 'https://lexusalex.ru').origin;
const structuralPages = catalogPages(categories);
const expectedPaths = ['', ...structuralPages.map((page) => page.path)];
const { categoryById, courseById } = indexCatalog(categories);
const requiredPageCount = expectedPaths.length * locales.length;

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const output = await files(root);
const htmlFiles = output.filter((path) => path.endsWith('.html'));
assert.ok(htmlFiles.length >= requiredPageCount, `The build must contain at least ${requiredPageCount} localized structural pages.`);
const rootPage = await readFile(join(root, 'index.html'), 'utf8');
assert.ok(rootPage.includes(`${base}/ru/`), 'The site root must redirect to the Russian catalog.');

for (const locale of locales) {
  const catalog = await readFile(join(root, locale, 'index.html'), 'utf8');
  assert.ok(catalog.includes('data-course-filters'), `${locale}: missing course filters`);
  assert.equal([...catalog.matchAll(/\bdata-course-card(?:\s|=|>)/g)].length, courseById.size, `${locale}: all courses must be accessible without JavaScript`);
  const featured = /<article\b[^>]*data-featured-course[^>]*>([\s\S]*?)<\/article>/.exec(catalog);
  assert.equal(Boolean(featured), courseById.size > 0, `${locale}: homepage must feature the first course`);
  if (featured) {
    const manifest = JSON.parse(decodeAttribute(/\bdata-lessons="([^"]*)"/.exec(featured[1])?.[1] ?? '[]'));
    const resume = [...featured[1].matchAll(/<a\b[^>]*>/g)].find((tag) => tag[0].includes('data-progress-resume'))?.[0];
    const firstCourse = [...courseById.values()][0].course;
    assert.ok(featured[1].includes(`href="${base}/${locale}/courses/${firstCourse.id}/"`), `${locale}: featured course needs its outline link`);
    if (manifest.length) {
      assert.ok(resume?.includes(`href="${base}/${manifest[0].path}/"`), `${locale}: featured start must open its first translated lesson`);
      assert.ok(manifest[0].path.startsWith(`${locale}/courses/${firstCourse.id}/`), `${locale}: featured lesson belongs to the wrong course or language`);
    } else {
      assert.equal(resume, undefined, `${locale}: an empty course must not have a false start action`);
    }
    assert.ok(featured.index < catalog.indexOf('data-course-filter-panel'), `${locale}: featured action must appear before filters`);
  }
  for (const path of expectedPaths) {
    const page = await readFile(join(root, locale, path, 'index.html'), 'utf8');
    assert.match(page, new RegExp(`<html\\b[^>]*\\blang=["']${locale}["']`), `${locale}/${path}: wrong page language`);
    const other = locale === 'ru' ? 'en' : 'ru';
    assert.ok(page.includes(`${base}/${other}/${path ? `${path}/` : ''}`), `${locale}/${path}: missing equivalent page in ${other}`);
  }
  for (const entry of structuralPages) {
    const page = await readFile(join(root, locale, entry.path, 'index.html'), 'utf8');
    if (entry.props.course && !entry.props.module) {
      assert.ok(page.includes('class="course-metadata"'), `${locale}/${entry.path}: missing difficulty/duration`);
      assert.ok(page.includes('data-course-progress'), `${locale}/${entry.path}: missing progress state`);
    }
    const breadcrumb = /<nav\b[^>]*class="catalog-breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/.exec(page)?.[1];
    assert.ok(breadcrumb, `${locale}/${entry.path}: missing breadcrumbs`);
    const courseEntry = entry.props.course ? courseById.get(entry.props.course) : undefined;
    const categoryEntry = categoryById.get(entry.props.category ?? courseEntry?.category.id ?? '');
    const linkedCategories = courseEntry
      ? [...categoryEntry.ancestors, categoryEntry.category]
      : categoryEntry.ancestors;
    let previousPosition = -1;
    for (const category of linkedCategories) {
      const position = breadcrumb.indexOf(`href="${base}/${locale}/directions/${category.id}/"`);
      assert.ok(position > previousPosition, `${locale}/${entry.path}: missing or unordered ancestor ${category.id}`);
      previousPosition = position;
    }
    if (entry.props.module) {
      assert.ok(breadcrumb.includes(`href="${base}/${locale}/courses/${entry.props.course}/"`), `${locale}/${entry.path}: missing parent course`);
    }
    assert.ok(breadcrumb.includes('aria-current="page"'), `${locale}/${entry.path}: missing current breadcrumb`);
  }
}

const localized = (locale) => htmlFiles
  .map((path) => relative(root, path).split(sep).join('/'))
  .filter((path) => path.startsWith(`${locale}/`))
  .map((path) => path.slice(locale.length + 1))
  .sort();
assert.deepEqual(localized('ru'), localized('en'), 'Russian and English page structures must match.');

let checked = 0;
let checkedLessons = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const path = relative(root, file).split(sep).join('/').replace(/index\.html$/, '');
  const pageUrl = new URL(`${base}/${path}`, origin);
  const lessonPage = /^(ru|en)\/courses\/([^/]+)\/(.+)\/$/.exec(path);
  const filterPanel = /<details\b[^>]*data-course-filter-panel[^>]*>/.exec(html)?.[0];
  if (filterPanel) {
    const count = [...html.matchAll(/\bdata-course-card(?:\s|=|>)/g)].length;
    assert.equal(/\bopen(?:\s|=|>)/.test(filterPanel), count > 1, `${path}: filters must start collapsed only for a single course`);
  }
  if (lessonPage && !expectedPaths.includes(path.slice(lessonPage[1].length + 1).replace(/\/$/, ''))) {
    assert.ok(html.includes('class="lesson-learning"'), `${path}: missing lesson controls`);
    if (html.includes('class="expressive-code')) {
      const copyLabel = lessonPage[1] === 'en' ? 'Copy to clipboard' : 'Копировать';
      assert.ok(html.includes(`title="${copyLabel}"`), `${path}: code block controls use the wrong language`);
    }
    const serialized = /\bdata-lessons="([^"]*)"/.exec(html)?.[1];
    assert.ok(serialized, `${path}: missing lesson manifest`);
    const sequence = JSON.parse(decodeAttribute(serialized));
    const position = sequence.findIndex((lesson) => `${lesson.path}/` === path);
    assert.ok(position >= 0, `${path}: current lesson missing from manifest`);
    const nav = /<nav\b[^>]*class="lesson-navigation"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
    for (const [relation, offset] of [['prev', -1], ['next', 1]]) {
      const link = [...nav.matchAll(/<a\b[^>]*>/g)].find((tag) => tag[0].includes(`rel="${relation}"`));
      const expected = sequence[position + offset];
      assert.equal(link ? /\bhref="([^"]*)"/.exec(link[0])?.[1] : undefined, expected ? `${base}/${expected.path}/` : undefined, `${path}: wrong ${relation} lesson`);
      if (expected) assert.ok(expected.path.startsWith(`${lessonPage[1]}/courses/${lessonPage[2]}/`), `${path}: navigation crosses a course or language boundary`);
    }
    checkedLessons++;
  }
  for (const tag of html.matchAll(/<(?:a|img|script|link|source)\b[^>]*>/g)) {
    // Canonical/hreflang URLs describe pages; they are not fetched resources.
    // The built-in 404 page intentionally describes URLs that do not exist.
    if (/^<link\b/.test(tag[0]) && /\brel=["'](?:canonical|alternate)["']/.test(tag[0])) continue;
    const attribute = /\b(?:href|src)=["']([^"']*)["']/.exec(tag[0]);
    if (!attribute) continue;
    const raw = attribute[1].replaceAll('&amp;', '&');
    if (!raw || raw.startsWith('#') || /^(?:data|mailto|tel|javascript|blob):/i.test(raw)) continue;
    const target = new URL(raw, pageUrl);
    if (target.origin !== origin) continue;
    const pathname = decodeURIComponent(target.pathname);
    assert.ok(!base || pathname === base || pathname.startsWith(`${base}/`), `${path}: link bypasses SITE_BASE: ${raw}`);
    const local = resolve(root, `.${pathname.slice(base.length) || '/'}`);
    assert.ok(local === resolve(root) || local.startsWith(`${resolve(root)}${sep}`), `Link escapes build directory: ${raw}`);
    let entry;
    try { entry = await stat(local); } catch { assert.fail(`${path}: missing link or asset ${raw}`); }
    if (entry.isDirectory()) {
      await stat(join(local, 'index.html')).catch(() => assert.fail(`${path}: missing index for ${raw}`));
    }
    checked++;
  }
}
console.log(`Verified ${htmlFiles.length} HTML pages, ${requiredPageCount} required localized routes, filters/metadata/progress, ${checkedLessons} lesson navigations, complete breadcrumbs, locale parity and ${checked} internal links/assets at ${base || '/'}.`);

function decodeAttribute(value) {
  return value.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replaceAll('&quot;', '"').replaceAll('&amp;', '&');
}
