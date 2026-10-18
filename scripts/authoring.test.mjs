import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';
import { createLesson } from './create-lesson.mjs';

test('lesson creation produces matching RU/EN drafts with the next shared order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'courses-author-'));
  await mkdir(join(root, 'en/courses/php/basics'), { recursive: true });
  await writeFile(join(root, 'en/courses/php/basics/existing.md'), '---\ntitle: Existing\nsidebar:\n  order: 8.5\n---\nAuthor text\n');
  const paths = await createLesson(root, { course: 'php', module: 'basics', slug: 'variables', titleRu: 'Переменные', titleEn: 'Variables', minutes: 20 });
  assert.equal(paths.length, 2);
  for (const [index, path] of paths.entries()) {
    const text = await readFile(path, 'utf8');
    const data = parse(text.split('---')[1]);
    assert.equal(data.draft, true);
    assert.equal(data.sidebar.order, 9);
    assert.equal(data.durationMinutes, 20);
    assert.equal(data.title, index ? 'Variables' : 'Переменные');
    assert.match(text, index ? /## Exercise/ : /## Задание/);
    assert.match(text, /<details>/);
  }
});

test('a collision in either language preserves every existing file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'courses-preserve-'));
  await mkdir(join(root, 'en/courses/php/basics'), { recursive: true });
  const original = join(root, 'en/courses/php/basics/variables.mdx');
  await writeFile(original, 'Author-owned content');
  await assert.rejects(createLesson(root, { course: 'php', module: 'basics', slug: 'variables' }), /exist/i);
  assert.equal(await readFile(original, 'utf8'), 'Author-owned content');
  await assert.rejects(readFile(join(root, 'ru/courses/php/basics/variables.md')), { code: 'ENOENT' });
});

test('invalid lesson destinations and durations fail before creating files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'courses-reject-'));
  for (const options of [
    { course: 'missing', slug: 'lesson' }, { course: 'php', slug: 'lesson' },
    { course: 'php', module: 'unknown', slug: 'lesson' },
    { course: 'php', module: 'basics', slug: '../outside' },
    { course: 'php', module: 'basics', slug: 'index' },
    { course: 'php', module: 'basics', slug: 'lesson', minutes: -1 },
  ]) await assert.rejects(createLesson(root, options));
});
