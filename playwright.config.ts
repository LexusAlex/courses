import { defineConfig } from '@playwright/test';

const base = (process.env.SITE_BASE ?? '/').replace(/\/$/, '');
const origin = 'http://127.0.0.1:4335';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright-results',
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'output/playwright-report', open: 'never' }]],
  use: { baseURL: origin, browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4335',
    url: `${origin}${base}/ru/`,
    reuseExistingServer: false,
    timeout: 30000,
    stdout: 'pipe',
  },
});
