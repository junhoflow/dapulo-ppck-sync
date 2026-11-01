import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-frames-${Date.now()}`;
await mkdir(output, { recursive: true });
const contexts = [], browsers = [], pages = [], result = { base, scenarios: [] };
async function newPage(browser, name) {
 const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
 contexts.push({ context, name }); await context.tracing.start({ screenshots: true, snapshots: true });
 const page = await context.newPage(); pages.push({ page, name }); return page;
}
async function frame(page) {
 return page.locator('video').evaluate(v => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 36;
  const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0, 64, 36);
  const pixels = ctx.getImageData(0, 0, 64, 36).data;
  let brightness = 0; for (let i = 0; i < pixels.length; i += 4) brightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
  return { time: v.currentTime, duration: v.duration, paused: v.paused, width: v.videoWidth, height: v.videoHeight, brightness: brightness / (64 * 36 * 3) };
 });
}
try {
 const chrome = await chromium.launch({ channel: 'chrome', headless: true }); browsers.push(chrome);
 const wk = await webkit.launch({ headless: true }); browsers.push(wk);
 const admin = await newPage(chrome, 'admin'); await admin.goto(new URL('admin.html', base).href);
 await admin.locator('#key').setInputFiles(process.env.PPCK_KEY);
 await expect(admin.locator('#reset')).toBeEnabled({ timeout: 30000 }); await admin.locator('#reset').click();
 const viewers = [];
 for (const [browser, name] of [[chrome, 'chrome'], [wk, 'webkit']]) {
  const p = await newPage(browser, name); viewers.push(p); await p.goto(base);
  await expect(p.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
  await expect(p.locator('#ready')).toBeHidden(); assert.equal(await p.locator('#cover').count(), 0);
  const first = await frame(p); assert.equal(first.time, 0); assert.equal(first.paused, true); assert.ok(first.brightness > 20);
  assert.equal(first.width, 1920); assert.equal(first.height, 1080);
  result[`${name}First`] = first; await p.screenshot({ path: `${output}/${name}-first.png` });
 }
 await expect(admin.locator('#play')).toBeEnabled({ timeout: 30000 });
 const start = Date.now(); await admin.locator('#play').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Playing · 1080p', { timeout: 3000 })));
 result.playObservedAfterMs = Date.now() - start;
 await admin.locator('#pause').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Paused', { timeout: 10000 })));
 for (const p of viewers) { assert.equal((await frame(p)).paused, true); assert.equal(await p.locator('#count').count(), 0); }
 await admin.locator('#restart').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Demo complete', { timeout: 18000 })));
 for (let i = 0; i < viewers.length; i++) {
  const p = viewers[i]; await expect.poll(() => frame(p).then(f => f.time)).toBeGreaterThan(11.99);
  const last = await frame(p); assert.equal(last.paused, true); assert.ok(last.brightness > 20);
  result[`${i}Last`] = last; await p.screenshot({ path: `${output}/${i}-last.png` });
 }
 await admin.locator('#reset').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 10000 })));
 for (const p of viewers) await expect.poll(() => frame(p).then(f => f.time)).toBe(0);
 result.scenarios = ['Automatic silent-video readiness without audience tap', 'First video frame paused on entry', 'No overlay/countdown, start under 3 sec', 'Pause keeps video visible', 'Natural end keeps final decoded frame', 'Reset returns to first video frame'];
 result.status = 'passed';
} catch (error) {
 result.status = 'failed'; result.error = String(error); console.error(error); process.exitCode = 1;
 for (const { page, name } of pages) await page.screenshot({ path: `${output}/failure-${name}.png` }).catch(() => {});
} finally {
 await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
 for (const { context, name } of contexts) { await context.tracing.stop({ path: `${output}/trace-${name}.zip` }); await context.close(); }
 for (const browser of browsers) await browser.close(); console.log(JSON.stringify(result));
}
