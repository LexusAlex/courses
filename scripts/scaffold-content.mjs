import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, locales, ui } from '../src/data/catalog.mjs';
import { catalogPages } from '../src/data/catalog-tree.mjs';

/** Create missing bilingual structure without changing author-owned files.
 * @param {string} root
 * @param {import('../src/data/catalog-tree.mjs').Category[]} [roots]
 */
export async function scaffoldContent(root, roots = categories) {
  const pages = catalogPages(roots);
  let created = 0;

  async function page(locale, path, title, description, props, order = 0) {
    const target = join(root, locale, path, 'index.mdx');
    const attributes = Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(' ');
    const contents = [
      '---', `title: ${JSON.stringify(title)}`, `description: ${JSON.stringify(description)}`,
      'sidebar:', `  order: ${order}`,
      ...(props.module ? [`  label: ${JSON.stringify(locale === 'ru' ? 'О разделе' : 'Section overview')}`] : []),
      'tableOfContents: false', 'prev: false', 'next: false', '---', '',
      "import Catalog from '@components/Catalog.astro';", '',
      path ? `${description}\n\n<Catalog ${attributes} />` : '<Catalog />', '',
    ].join('\n');
    await mkdir(dirname(target), { recursive: true });
    try {
      await writeFile(target, contents, { flag: 'wx' });
      created++;
    } catch (error) {
      // Existing content belongs to the author and must never be overwritten.
      if (error.code !== 'EEXIST') throw error;
    }
  }

  for (const locale of locales) {
    await page(locale, '', ui[locale].title, ui[locale].intro, {});
    for (const entry of pages) {
      await page(locale, entry.path, entry.title[locale], entry.description[locale], entry.props, entry.order);
    }
  }
  return created;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
  const created = await scaffoldContent(root);
  console.log(`Course structure: ${created} new pages; existing files preserved.`);
}
