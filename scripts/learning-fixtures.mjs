// Temporary verification pages. Never overwrite author content or retain these in the final build.
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const docs = join(project, 'src/content/docs');
const marker = join(project, '.plan/learning-fixtures.json');
const definitions = [
  ['php/basics/zz-learning-test-first', 'Проверка: первый урок', 'Test: first lesson', 9901, false],
  ['php/basics/zz-learning-test-second', 'Проверка: второй урок', 'Test: second lesson', 9902, false],
  ['php/functions/zz-learning-test-third', 'Проверка: третий урок', 'Test: third lesson', 9901, false],
  ['git/zz-learning-test-single', 'Проверка: отдельный урок', 'Test: single lesson', 9901, false],
  ['php/basics/zz-learning-test-draft', 'Проверка: черновик', 'Test: draft', 9903, true],
];
const fixtures = ['ru', 'en'].flatMap((locale) => definitions.map(([slug, ru, en, order, draft]) => {
  const path = `${locale}/courses/${slug}.md`;
  const content = ['---', `title: ${JSON.stringify(locale === 'ru' ? ru : en)}`, `draft: ${draft}`, 'sidebar:', `  order: ${order}`, '---', '', locale === 'ru' ? 'Временная страница для проверки функций обучения.' : 'Temporary page for checking learning features.', ''].join('\n');
  return { path, content, hash: createHash('sha256').update(content).digest('hex') };
}));

async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
async function removeFixtures() {
  if (!await exists(marker)) { console.log('No active learning fixtures.'); return; }
  const owned = JSON.parse(await readFile(marker, 'utf8'));
  for (const entry of owned) {
    const expected = fixtures.find((fixture) => fixture.path === entry.path && fixture.hash === entry.hash);
    if (!expected) throw new Error('Unrecognized fixture marker; refusing cleanup.');
    const target = join(docs, entry.path);
    if (relative(docs, target).startsWith('..') || !basename(target).startsWith('zz-learning-test-')) throw new Error('Unsafe fixture cleanup path.');
    if (!await exists(target)) continue;
    const hash = createHash('sha256').update(await readFile(target)).digest('hex');
    if (hash !== expected.hash) throw new Error(`Fixture was edited; preserving ${entry.path}.`);
    await unlink(target);
  }
  await unlink(marker);
  console.log('Removed only owned learning fixtures.');
}

if (process.argv[2] === 'add') {
  if (await exists(marker)) throw new Error('Learning fixtures are already active.');
  for (const fixture of fixtures) if (await exists(join(docs, fixture.path))) throw new Error(`Refusing to overwrite ${fixture.path}.`);
  await mkdir(join(project, '.plan'), { recursive: true });
  await writeFile(marker, JSON.stringify(fixtures.map(({ path, hash }) => ({ path, hash }))), { flag: 'wx' });
  try {
    for (const fixture of fixtures) await writeFile(join(docs, fixture.path), fixture.content, { flag: 'wx' });
  } catch (error) { await removeFixtures(); throw error; }
  console.log(`Created ${fixtures.length} temporary RU/EN files (including two drafts).`);
} else if (process.argv[2] === 'remove') {
  await removeFixtures();
} else {
  throw new Error('Usage: node scripts/learning-fixtures.mjs add|remove');
}
