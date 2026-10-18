import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { checkDeployment } from './check-deployment.mjs';

async function fixture(t, mode = 'valid') {
  const server = createServer((request, response) => {
    const url = request.url;
    if (mode === '404' || (mode === 'broken-css' && url.endsWith('.css'))) { response.writeHead(404).end('Missing'); return; }
    if (url.endsWith('.css')) { response.writeHead(200, { 'content-type': 'text/css' }).end('body { color: black }'); return; }
    if (url.endsWith('.js')) { response.writeHead(200, { 'content-type': mode === 'html-script' ? 'text/html' : 'text/javascript' }).end(mode === 'html-script' ? '<html>Wrong resource</html>' : 'console.log("courses")'); return; }
    response.setHeader('content-type', 'text/html');
    if (url === '/courses/') {
      if (mode === 'http-redirect') { response.writeHead(302, { location: '/courses/ru/' }).end(); return; }
      const target = mode === 'wrong-redirect' ? '/courses/en/' : '/courses/ru/';
      // Astro emits a valid minimal HTML document without an explicit <html> element.
      response.end(`<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="2;url=${target}"><body><a href="${target}">Go</a></body>`); return;
    }
    const locale = url.includes('/en/') ? 'en' : 'ru';
    const assetBase = mode === 'wrong-base' ? '/' : '/courses/';
    response.end(mode === 'source' ? '<html><body>Repository files, not a built website</body></html>'
      : `<html lang="${locale}"><head><link rel="stylesheet" href="${assetBase}_astro/site.css"></head><body><section data-course-list>Courses</section><script src="${assetBase}_astro/site.js"></script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/courses/`;
}

test('deployment check accepts a bilingual site with working CSS and JavaScript', async (t) => {
  const result = await checkDeployment(await fixture(t));
  assert.equal(result.pages, 3);
  assert.equal(result.assets, 2);
});

test('deployment check follows a real HTTP redirect to the Russian catalog', async (t) => {
  assert.equal((await checkDeployment(await fixture(t, 'http-redirect'))).pages, 3);
});

for (const mode of ['404', 'source', 'broken-css', 'html-script', 'wrong-base', 'wrong-redirect']) {
  test(`deployment check rejects ${mode} instead of reporting success`, async (t) => {
    await assert.rejects(checkDeployment(await fixture(t, mode)), /HTTP|built|asset|language|base|HTML|JavaScript|CSS/i);
  });
}
