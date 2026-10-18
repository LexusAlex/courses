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
      lastUpdated: true,
      editLink: { baseUrl: 'https://github.com/LexusAlex/courses/edit/main/' },
      expressiveCode: {
        themes: ['github-dark', 'github-light'],
        useStarlightUiThemeColors: false,
        styleOverrides: {
          borderRadius: '0.65rem',
          borderColor: 'var(--sl-color-gray-4)',
          codeFontSize: '0.9375rem',
          codeLineHeight: '1.7',
        },
      },
      components: { MarkdownContent: './src/components/LessonContent.astro' },
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
