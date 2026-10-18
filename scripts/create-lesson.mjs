import { mkdir, readdir, readFile, realpath, unlink, writeFile, access } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse, stringify } from 'yaml';
import { categories } from '../src/data/catalog.mjs';
import { indexCatalog } from '../src/data/catalog-tree.mjs';

/** Create an author-owned pair of drafts. Existing Markdown and MDX files are preserved.
 * @param {string} root
 * @param {{course: string, module?: string, slug: string, titleRu?: string, titleEn?: string, minutes?: number, author?: string}} options
 * @param {import('../src/data/catalog-tree.mjs').Category[]} [roots]
 */
export async function createLesson(root, options, roots = categories) {
  const validId = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  if (!validId(options.course) || !validId(options.slug) || options.slug === 'index') throw new Error('Use safe course/slug IDs; index is reserved.');
  const course = indexCatalog(roots).courseById.get(options.course)?.course;
  if (!course) throw new Error(`Unknown course: ${options.course}`);
  if (course.modules?.length ? !course.modules.some((module) => module.id === options.module) : options.module !== undefined) {
    throw new Error('Choose a declared module for this course.');
  }
  if (options.minutes !== undefined && (!Number.isSafeInteger(options.minutes) || options.minutes <= 0)) throw new Error('Minutes must be a positive integer.');
  for (const text of [options.titleRu, options.titleEn, options.author]) {
    if (text !== undefined && (typeof text !== 'string' || !text.trim() || text.length > 300)) throw new Error('Title and author must contain 1–300 characters.');
  }
  const path = ['courses', options.course, ...(options.module ? [options.module] : [])];
  const targets = ['ru', 'en'].map((locale) => join(root, locale, ...path, `${options.slug}.md`));
  let highestOrder = 0;
  for (const locale of ['ru', 'en']) {
    const directory = join(root, locale, ...path);
    for (const extension of ['md', 'mdx']) {
      try { await access(join(directory, `${options.slug}.${extension}`)); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      throw new Error(`Lesson already exists: ${locale}/${path.join('/')}/${options.slug}.${extension}`);
    }
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
      const text = await readFile(join(directory, entry.name), 'utf8');
      const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
      const order = frontmatter ? parse(frontmatter[1])?.sidebar?.order : undefined;
      if (Number.isFinite(order)) highestOrder = Math.max(highestOrder, order);
    }
  }
  if (highestOrder >= Number.MAX_SAFE_INTEGER) throw new Error('Cannot assign the next lesson order.');
  const completed = [];
  try {
    await mkdir(root, { recursive: true });
    const actualRoot = await realpath(root);
    for (const [index, target] of targets.entries()) {
      const directory = resolve(target, '..');
      await mkdir(directory, { recursive: true });
      const actualDirectory = await realpath(directory);
      if (!actualDirectory.startsWith(`${actualRoot}${sep}`)) throw new Error('Lesson directory escapes the content root.');
      const ru = index === 0;
      const data = {
        title: ru ? options.titleRu ?? `Новый урок: ${options.slug}` : options.titleEn ?? `New lesson: ${options.slug}`,
        description: ru ? 'Краткое описание урока.' : 'A short lesson description.',
        draft: true, author: options.author ?? 'LexusAlex', durationMinutes: options.minutes ?? null,
        sidebar: { order: Math.floor(highestOrder) + 1 },
      };
      const content = `---\n${stringify(data)}---\n\n${ru
        ? '## Чему научимся\n\n- Опиши результат урока.\n\n## Теория\n\nДобавь объяснение темы.\n\n## Пример\n\n```text\nДобавь пример и ожидаемый результат.\n```\n\n## Задание\n\nОпиши практическое задание.\n\n<details>\n<summary>Показать решение</summary>\n\nДобавь решение с объяснением.\n\n</details>\n\n## Проверка себя\n\n- Сформулируй вопрос для самопроверки.'
        : '## What you will learn\n\n- Describe the learning outcome.\n\n## Theory\n\nExplain the topic.\n\n## Example\n\n```text\nAdd an example and its expected output.\n```\n\n## Exercise\n\nDescribe a practical exercise.\n\n<details>\n<summary>Show solution</summary>\n\nAdd the solution and explain it.\n\n</details>\n\n## Check yourself\n\n- Add a self-check question.'}\n`;
      await writeFile(target, content, { flag: 'wx' });
      completed.push(target);
    }
  } catch (error) {
    // Roll back only files created by this call; never remove existing author content.
    for (const target of completed) await unlink(target);
    throw error;
  }
  return targets;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--') args.shift();
    const { values } = parseArgs({ args, options: {
      course: { type: 'string' }, module: { type: 'string' }, slug: { type: 'string' },
      'title-ru': { type: 'string' }, 'title-en': { type: 'string' }, minutes: { type: 'string' }, author: { type: 'string' }, help: { type: 'boolean' },
    } });
    if (values.help) console.log('pnpm lesson --course php --module basics --slug variables [--title-ru "Переменные"] [--title-en "Variables"] [--minutes 20] [--author "LexusAlex"]');
    else {
      const paths = await createLesson(fileURLToPath(new URL('../src/content/docs/', import.meta.url)), {
        course: values.course, module: values.module, slug: values.slug, titleRu: values['title-ru'], titleEn: values['title-en'],
        minutes: values.minutes === undefined ? undefined : Number(values.minutes), author: values.author,
      });
      paths.forEach((path) => console.log(`Created draft: ${path}`));
      console.log('Edit both translations and set draft: false in each when ready.');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
