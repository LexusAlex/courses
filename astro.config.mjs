import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { sidebar } from './src/data/catalog.mjs';

if (existsSync('.env')) loadEnvFile('.env');

const inputBase = process.env.SITE_BASE ?? '/';
if (!/^\/?[a-zA-Z0-9_/-]*$/.test(inputBase) || inputBase.includes('..')) {
  throw new Error('SITE_BASE must be a URL path, for example / or /docs/.');
}
const base = `/${inputBase.split('/').filter(Boolean).join('/')}/`.replace(/^\/\/$/, '/');

export default defineConfig({
  site: process.env.SITE_URL || 'https://lexusalex.ru',
  base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    starlight({
      title: 'courses',
      description: 'Курсы по разным направлениям / Courses across different subjects',
      favicon: '/favicon.svg',
      defaultLocale: 'ru',
      locales: {
        ru: { label: 'Русский', lang: 'ru' },
        en: { label: 'English', lang: 'en' },
      },
      sidebar: sidebar(),
      pagination: false,
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
