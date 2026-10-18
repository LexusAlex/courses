import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const base = (process.env.SITE_BASE ?? '/').replace(/\/$/, '');
const path = (value: string) => `${base}/${value}`;
const lesson = 'courses/php/basics/first-program/';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', (error) => errors.get(page)!.push(error.message));
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('course goals and grouped program are usable on this screen size', async ({ page }, info) => {
  await mkdir('output/screenshots', { recursive: true });
  await page.goto(path('ru/'));
  await expect(page.locator('[data-progress-resume]')).toHaveText('Начать курс');
  await page.screenshot({ path: `output/screenshots/home-${info.project.name}.png`, fullPage: true });
  await page.locator('.featured-course-outline').click();
  await expect(page.getByRole('heading', { name: 'Кому подходит', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Чему научишься', exact: true })).toBeVisible();
  await expect(page.locator('[data-course-outline] [data-lesson-row]').first()).toBeVisible();
  await expect(page.locator('[data-lesson-status]').first()).toHaveText('Не начат');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.screenshot({ path: `output/screenshots/course-${info.project.name}.png`, fullPage: true });
  await page.goto(path(`ru/${lesson}`));
  await expect(page.locator('.lesson-meta')).toContainText('LexusAlex');
  await expect(page.locator('[data-complete-and-go]')).toBeVisible();
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.screenshot({ path: `output/screenshots/lesson-dark-${info.project.name}.png`, fullPage: true });
});

test('completion survives reload and switching to the English lesson', async ({ page }) => {
  await page.goto(path(`ru/${lesson}`));
  await page.getByRole('checkbox', { name: 'Урок пройден' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Урок пройден' })).toBeChecked();
  if (!await page.locator('starlight-lang-select select:visible').count()) {
    await page.getByRole('button', { name: 'Меню', exact: true }).click();
  }
  await page.locator('starlight-lang-select select:visible').selectOption({ label: 'English' });
  await expect(page).toHaveURL(new RegExp(`/en/${lesson}$`));
  await expect(page.getByRole('checkbox', { name: 'Lesson completed' })).toBeChecked();
  await page.goto(path('en/courses/php/'));
  await expect(page.locator('[data-lesson-row]').filter({ hasText: 'Your first PHP program' }).locator('[data-lesson-status]')).toHaveText('Completed');
});

test('progress download can be imported and bad files do not erase it', async ({ page }) => {
  await page.goto(path(`ru/${lesson}`));
  await page.getByRole('checkbox', { name: 'Урок пройден' }).check();
  await page.goto(path('ru/courses/php/'));
  await page.locator('[data-progress-transfer] summary').click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать прогресс' }).click();
  const download = await downloaded;
  const raw = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(raw).state.completed).toContain('php/basics/first-program');
  await page.goto(path(`ru/${lesson}`));
  await page.getByRole('checkbox', { name: 'Урок пройден' }).uncheck();
  await page.goto(path('ru/courses/php/'));
  await page.locator('[data-progress-transfer] summary').click();
  await page.locator('[data-progress-import]').setInputFiles({ name: 'courses-progress.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await expect(page.locator('[data-transfer-status]')).toContainText('Прогресс объединён');
  await expect(page.locator('[data-lesson-status]').first()).toHaveText('Пройден');
  await page.locator('[data-progress-import]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('[data-transfer-status]')).toContainText('Файл не подходит');
  await expect(page.locator('[data-lesson-status]').first()).toHaveText('Пройден');
});

test('complete and continue saves the lesson before following its actual next target', async ({ page }) => {
  await page.goto(path(`ru/${lesson}`));
  const action = page.locator('[data-complete-and-go]');
  const target = await action.getAttribute('href');
  await action.click();
  await expect(page).toHaveURL(`http://127.0.0.1:4335${target}`);
  await page.goto(path('ru/courses/php/'));
  await expect(page.locator('[data-lesson-status]').first()).toHaveText('Пройден');
});

test('filters can show no matches and restore the course', async ({ page }) => {
  await page.goto(path('ru/'));
  await page.locator('[data-course-filter-panel] summary').click();
  await page.locator('[name="query"]').fill('nothing-matches-this-query');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.locator('[data-featured-course]')).toBeVisible();
});

test('failed progress writes keep completion on the page with a visible error', async ({ page }) => {
  await page.addInitScript(() => {
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      // Simulate a failed progress write without disabling Starlight's unrelated theme preferences.
      if (key.startsWith('courses:progress:')) throw new DOMException('Progress quota exceeded', 'QuotaExceededError');
      return save.call(this, key, value);
    };
  });
  await page.goto(path(`ru/${lesson}`));
  await page.locator('[data-complete-and-go]').click();
  await expect(page).toHaveURL(new RegExp(`/ru/${lesson}$`));
  await expect(page.locator('[data-storage-error]')).toBeVisible();
  await expect(page.locator('[data-storage-error]')).toContainText('Прогресс не сохранён');
});

test('site search opens the real indexed PHP lesson', async ({ page }) => {
  await page.goto(path('ru/'));
  await page.getByRole('button', { name: /Поиск по курсам/ }).first().click();
  await page.locator('.pagefind-ui__search-input').fill('Первая программа');
  const result = page.locator('.pagefind-ui__result-link').filter({ hasText: 'Первая программа' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(new RegExp(`/ru/${lesson}(?:#.*)?$`));
});
