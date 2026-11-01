import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-replay-${Date.now()}`;
await mkdir(output, { recursive: true });
const contexts = [], browsers = [], pages = [], result = { base };
async function newPage(browser, name) {
 const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
 contexts.push({ context, name }); await context.tracing.start({ screenshots: true, snapshots: true });
 const page = await context.newPage(); pages.push({ page, name }); return { page, context };
}
const media = p => p.locator('video').evaluate(v => ({ time: v.currentTime, paused: v.paused }));
try {
 const chrome = await chromium.launch({ channel: 'chrome', headless: true }); browsers.push(chrome);
 const wk = await webkit.launch({ headless: true }); browsers.push(wk);
 const { page: admin } = await newPage(chrome, 'admin'); await admin.goto(new URL('admin.html', base).href);
 await admin.locator('#key').setInputFiles(process.env.PPCK_KEY);
 await expect(admin.locator('#reset')).toBeEnabled({ timeout: 30000 }); await admin.locator('#reset').click();
 const viewers = [];
 for (const [browser, name] of [[chrome, 'chrome'], [wk, 'webkit']]) {
  const viewer = await newPage(browser, name); viewers.push(viewer); await viewer.page.goto(base);
  await expect(viewer.page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
  await expect(viewer.page.locator('#replay')).toBeHidden();
  assert.deepEqual(await media(viewer.page), { time: 0, paused: true });
 }
 const [a, b] = viewers.map(v => v.page);
 await expect(admin.locator('#play')).toBeEnabled({ timeout: 30000 }); await admin.locator('#play').click();
 await Promise.all(viewers.map(({ page }) => expect(page.locator('#status')).toHaveText('Playing · 1080p', { timeout: 5000 })));
 await Promise.all(viewers.map(({ page }) => expect(page.locator('#status')).toHaveText('Demo complete', { timeout: 18000 })));
 for (const { page } of viewers) {
  await expect(page.getByRole('button', { name: 'Watch again', exact: true })).toBeVisible();
  const screen = await page.locator('#screen').boundingBox(), button = await page.locator('#replay').boundingBox();
  assert.ok(Math.abs(button.x + button.width / 2 - screen.x - screen.width / 2) < 2);
  assert.ok(Math.abs(button.y + button.height / 2 - screen.y - screen.height / 2) < 2);
 }
 await a.screenshot({ path: `${output}/center-replay-button.png` });
 await a.getByRole('button', { name: 'Watch again', exact: true }).click();
 await expect(a.locator('#status')).toHaveText('Replaying on this screen');
 await expect.poll(() => media(a).then(v => v.time), { timeout: 5000 }).toBeGreaterThan(.8);
 assert.equal((await media(b)).paused, true); assert.ok((await media(b)).time > 11.99);
 await a.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
 await expect(a.locator('#status')).toHaveText('Replaying on this screen');
 assert.equal((await media(a)).paused, false);
 // Disconnect the replaying audience: local playback must continue from its in-memory clip.
 await viewers[0].context.setOffline(true);
 await expect(a.locator('#conn')).toHaveText('Reconnecting…');
 await expect.poll(() => media(a).then(v => v.time), { timeout: 5000 }).toBeGreaterThan(1.8);
 await viewers[0].context.setOffline(false);
 await expect(a.locator('#conn')).toHaveText('Live connection', { timeout: 20000 });
 await expect(a.locator('#status')).toHaveText('Replaying on this screen');
 await b.getByRole('button', { name: 'Watch again', exact: true }).click();
 await expect(b.locator('#status')).toHaveText('Replaying on this screen');
 result.independentPositions = await Promise.all([media(a), media(b)]);
 assert.ok(result.independentPositions[0].time > result.independentPositions[1].time + .7);
 await Promise.all(viewers.map(({ page }) => expect(page.locator('#status')).toHaveText('Demo complete', { timeout: 18000 })));
 for (const { page } of viewers) { await expect(page.locator('#replay')).toBeVisible(); assert.ok((await media(page)).time > 11.99); }
 // A later central reset remains authoritative on all screens, including an active personal replay.
 await a.locator('#replay').click(); await expect(a.locator('#status')).toHaveText('Replaying on this screen');
 await admin.locator('#reset').click();
 for (const { page } of viewers) {
  await expect(page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 10000 });
  await expect(page.locator('#replay')).toBeHidden(); await expect.poll(() => media(page)).toEqual({ time: 0, paused: true });
 }
 result.status = 'passed';
 result.scenarios = ['First play remains presenter-only', 'Centered replay button appears only after end', 'Click replays only that viewer', 'Personal replay survives visibility refresh/offline/reconnect of same state', 'Other viewer can start at its own time', 'Local repeat ends on final frame with replay button again', 'New presenter reset overrides individual replay'];
} catch (error) {
 result.status = 'failed'; result.error = String(error); console.error(error); process.exitCode = 1;
 for (const { page, name } of pages) await page.screenshot({ path: `${output}/failure-${name}.png` }).catch(() => {});
} finally {
 await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
 for (const { context, name } of contexts) { await context.tracing.stop({ path: `${output}/trace-${name}.zip` }); await context.close(); }
 for (const browser of browsers) await browser.close(); console.log(JSON.stringify(result));
}
