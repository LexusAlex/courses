import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Verify the public artifact, not just the success of its upload.
 * @param {string} input @param {{timeoutMs?: number}} [options]
 */
export async function checkDeployment(input, { timeoutMs = 10000 } = {}) {
  const base = new URL(input);
  assert.ok(['https:', 'http:'].includes(base.protocol) && !base.username && !base.password && !base.search && !base.hash, 'Use a public HTTP(S) site URL without credentials, query or fragment.');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  async function load(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'courses-deployment-check' } });
    assert.ok(response.ok, `${url}: HTTP ${response.status}`);
    const final = new URL(response.url);
    assert.ok(final.origin === base.origin && final.pathname.startsWith(base.pathname), `${url}: redirected outside the configured site base`);
    return { body: await response.text(), type: response.headers.get('content-type') ?? '', url: final };
  }
  const [root, ...pages] = await Promise.all([base, new URL('ru/', base), new URL('en/', base)].map(load));
  const russian = new URL('ru/', base);
  const redirectTag = /<meta\b[^>]*\bhttp-equiv=["']refresh["'][^>]*>/i.exec(root.body)?.[0] ?? '';
  const refreshTarget = /\bcontent=["']\s*\d+(?:\.\d+)?\s*;\s*url=([^"']+)["']/i.exec(redirectTag)?.[1];
  const redirected = root.url.href === russian.href && root.body.includes('data-course-list') && /<html\b[^>]*\blang=["']ru["']/.test(root.body);
  const htmlRedirect = refreshTarget && new URL(refreshTarget, base).href === russian.href;
  assert.ok(/text\/html/.test(root.type) && (redirected || htmlRedirect), 'Root must serve the built HTML redirect to Russian.');
  const assets = new Map();
  for (const [index, page] of pages.entries()) {
    const locale = index ? 'en' : 'ru';
    assert.ok(/text\/html/.test(page.type) && /<html\b/i.test(page.body) && page.body.includes('data-course-list'), `${locale}: expected the built course catalog HTML`);
    assert.match(page.body, new RegExp(`<html\\b[^>]*\\blang=["']${locale}["']`), `${locale}: wrong page language`);
    let hasCss = false;
    let hasJs = false;
    for (const match of page.body.matchAll(/<(?:script|link)\b[^>]*>/g)) {
      const tag = match[0];
      const kind = tag.startsWith('<script') ? 'js' : /\brel=["']stylesheet["']/.test(tag) ? 'css' : undefined;
      const value = /\b(?:src|href)=["']([^"']+)["']/.exec(tag)?.[1];
      if (!kind || !value) continue;
      const target = new URL(value.replaceAll('&amp;', '&'), new URL(`${locale}/`, base));
      if (target.origin !== base.origin) continue;
      assert.ok(target.pathname.startsWith(base.pathname), `${locale}: asset bypasses the site base: ${target.pathname}`);
      assets.set(target.href, kind);
      if (kind === 'css') hasCss = true;
      else hasJs = true;
    }
    assert.ok(hasCss && hasJs, `${locale}: missing built CSS or JavaScript assets`);
  }
  await Promise.all([...assets].map(async ([url, kind]) => {
    const resource = await load(url);
    assert.ok(resource.body.trim() && !/^\s*<!doctype html|^\s*<html/i.test(resource.body), `${url}: received HTML instead of an asset`);
    assert.ok(kind === 'css' ? /text\/css/.test(resource.type) : /javascript|ecmascript/.test(resource.type), `${url}: invalid ${kind === 'css' ? 'CSS' : 'JavaScript'} content type`);
  }));
  return { pages: 3, assets: assets.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { url: { type: 'string' }, attempts: { type: 'string', default: '1' }, delay: { type: 'string', default: '3000' } } });
    const attempts = Number(values.attempts);
    const delay = Number(values.delay);
    assert.ok(Number.isSafeInteger(attempts) && attempts >= 1 && attempts <= 20 && Number.isSafeInteger(delay) && delay >= 0 && delay <= 10000, 'Invalid retry settings');
    assert.ok(values.url, 'Usage: pnpm smoke --url https://lexusalex.ru/courses/ [--attempts 12 --delay 5000]');
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await checkDeployment(values.url);
        console.log(`Verified deployment: ${result.pages} pages and ${result.assets} CSS/JS assets at ${values.url}`);
        break;
      } catch (error) {
        if (attempt === attempts) throw error;
        console.error(`Deployment not ready (${attempt}/${attempts}): ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
