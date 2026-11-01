import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-real-home-${Date.now()}`;
await mkdir(output, { recursive: true });
const browsers = [], contexts = [], pages = [], result = { base, homepage: 'REAL https://dapulo.com/en — no route substitution or header stripping', observations: [] };
async function newPage(browser, name) {
 const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
 contexts.push({ context, name }); await context.tracing.start({ screenshots: true, snapshots: true });
 const page = await context.newPage(); pages.push({ page, name }); return page;
}
try {
 const chrome = await chromium.launch({ channel: 'chrome', headless: true }); browsers.push(chrome);
 const wk = await webkit.launch({ headless: true }); browsers.push(wk);
 const admin = await newPage(chrome, 'admin'); await admin.goto(new URL('admin.html', base).href);
 await admin.locator('#key').setInputFiles(process.env.PPCK_KEY);
 await expect(admin.locator('#reset')).toBeEnabled({ timeout: 30000 }); await admin.locator('#reset').click();
 const viewers = [], loads = [0, 0];
 for (const [i, browser] of [chrome, wk].entries()) {
  const page = await newPage(browser, i ? 'webkit' : 'chrome'); viewers.push(page);
  page.on('request', req => { if (req.url() === 'https://dapulo.com/en' && req.resourceType() === 'document') loads[i]++; });
  await page.goto(base); await expect(page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
  await expect(page.locator('#homepage-panel')).toBeHidden(); assert.equal(loads[i], 0);
 }
 await viewers[0].locator('#full').click();
 await expect.poll(() => viewers[0].evaluate(() => document.fullscreenElement?.id)).toBe('presentation');
 await expect(admin.locator('#play')).toBeEnabled({ timeout: 30000 }); await admin.locator('#play').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Demo complete', { timeout: 20000 })));
 for (const [i, p] of viewers.entries()) {
  await expect(p.locator('#homepage-panel')).toBeVisible();
  const content = p.frameLocator('#homepage');
  await expect(content.getByRole('heading', { level: 1 })).toContainText('Draw your coral.', { timeout: 30000 });
  const frame = p.frames().find(f => f.url() === 'https://dapulo.com/en'); assert.ok(frame);
  await frame.evaluate(() => document.fonts.ready);
  await expect.poll(() => frame.evaluate(() => [...document.images].filter(img => {
   const r = img.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
  }).every(img => img.complete && img.naturalWidth > 0)), { timeout: 15000 }).toBe(true);
  const info = await frame.evaluate(() => ({ url: location.href, width: innerWidth, height: innerHeight, contentHeight: document.documentElement.scrollHeight, heading: document.querySelector('h1')?.textContent, mobileMedia: matchMedia('(max-width: 767px)').matches }));
  assert.ok(info.width <= 390 && info.mobileMedia && info.contentHeight > info.height);
  result.observations.push(info);
  await p.screenshot({ path: `${output}/${i}-real-split-end.png`, fullPage: true });
  if (!i) await p.evaluate(() => document.exitFullscreen());
  await frame.evaluate(() => scrollTo(0, 650));
  await expect.poll(() => frame.evaluate(() => scrollY)).toBeGreaterThan(550);
  await p.locator('#replay').click(); await expect(p.locator('#status')).toHaveText('Replaying on this screen');
  assert.equal(loads[i], 1); assert.ok(await frame.evaluate(() => scrollY) > 550);
 }
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Demo complete', { timeout: 18000 })));
 for (const [i, p] of viewers.entries()) {
  const frame = p.frames().find(f => f.url() === 'https://dapulo.com/en');
  assert.equal(loads[i], 1); assert.ok(await frame.evaluate(() => scrollY) > 550);
  await expect(p.locator('#replay')).toBeVisible(); await frame.evaluate(() => scrollTo(0, 0));
  for (const size of [{ width: 1180, height: 820 }, { width: 1024, height: 768 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
   await p.setViewportSize(size);
   assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
   await p.screenshot({ path: `${output}/${i}-${size.width}x${size.height}-real-home.png`, fullPage: true });
  }
 }
 await admin.locator('#reset').click();
 for (const p of viewers) await expect(p.locator('#homepage-panel')).toBeHidden({ timeout: 10000 });
 result.status = 'passed'; result.loads = loads;
 result.scenarios = ['Natural first video end opens real mobile Dapulo homepage', 'Combined Chrome fullscreen includes iframe', 'Actual Korean homepage heading/images/fonts render', 'Iframe mobile width and independent scroll verified', 'Personal replay and its next ending retain homepage scroll with one document load', 'Four viewport layouts have no outer horizontal overflow', 'Central reset restores video-only layout'];
} catch (e) {
 result.status = 'failed'; result.error = String(e); console.error(e); process.exitCode = 1;
 for (const { page, name } of pages) await page.screenshot({ path: `${output}/failure-${name}.png`, fullPage: true }).catch(() => {});
} finally {
 await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
 for (const { context, name } of contexts) { await context.tracing.stop({ path: `${output}/trace-${name}.zip` }); await context.close(); }
 for (const browser of browsers) await browser.close(); console.log(JSON.stringify(result));
}
