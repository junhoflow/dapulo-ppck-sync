// Usage: PLAYWRIGHT_MODULE=/absolute/path/to/@playwright/test/index.mjs PPCK_KEY=/private/path/key.json node tests/live-browser.mjs
// Controls the real deployed presentation. Run only during an authorized rehearsal with no live audience.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const keyPath = process.env.PPCK_KEY;
if (!keyPath) throw new Error('PPCK_KEY must point to the local presenter signing key.');
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-deployed-${Date.now()}`;
await mkdir(output, { recursive: true });
const browsers = [], contexts = [], pages = [], logs = [], results = { base, output, scenarios: [] };
async function context(browser, name, viewport) {
  const ctx = await browser.newContext({ viewport }); contexts.push({ ctx, name });
  await ctx.tracing.start({ screenshots: true, snapshots: true });
  const page = await ctx.newPage(); pages.push({ page, name });
  page.on('pageerror', error => logs.push({ name, error: error.message }));
  return { ctx, page };
}
async function media(p) { return p.locator('video').evaluate(v => ({ width: v.videoWidth, height: v.videoHeight, duration: v.duration, time: v.currentTime, paused: v.paused, ended: v.ended })); }
try {
  const chrome = await chromium.launch({ channel: 'chrome', headless: true }); browsers.push(chrome);
  const wk = await webkit.launch({ headless: true }); browsers.push(wk);
  results.browsers = { chrome: chrome.version(), webkit: wk.version() };
  const { page: admin } = await context(chrome, 'admin', { width: 1100, height: 1000 });
  const response = await admin.goto(new URL('admin.html', base).href);
  assert.equal(response.status(), 200);
  await expect(admin.locator('#play')).toBeDisabled();
  await admin.locator('#key').setInputFiles(keyPath);
  await expect(admin.locator('#conn')).toHaveText('실시간 연결됨', { timeout: 30000 });
  // Reset any retained rehearsal state before connecting the audience.
  await expect(admin.locator('#reset')).toBeEnabled({ timeout: 10000 }); await admin.locator('#reset').click();
  const audience = [];
  for (const [browser, name, viewport] of [[chrome, 'chrome-tablet', { width: 1024, height: 768 }], [wk, 'webkit-tablet', { width: 1180, height: 820 }]]) {
    const { page, ctx } = await context(browser, name, viewport); audience.push({ page, ctx, name });
    assert.equal((await page.goto(base)).status(), 200);
    await expect(page.locator('#ready')).toBeEnabled({ timeout: 45000 });
    assert.deepEqual(await media(page).then(({ width, height, duration }) => ({ width, height, duration })), { width: 1920, height: 1080, duration: 12 });
    await page.locator('#ready').click();
    await expect(page.locator('#headline')).toHaveText('Your ocean is ready.', { timeout: 10000 });
  }
  await expect(admin.locator('#synced-count')).toHaveText('2', { timeout: 30000 });
  await admin.screenshot({ path: `${output}/admin-ready.png`, fullPage: true });
  results.scenarios.push('Deployed HTML 200; full 1080p/12-second Blob download; audience user-gesture readiness; unauthorized admin disabled; two engines connected');
  for (let round = 0; round < 3; round++) {
    await expect(admin.locator('#restart')).toBeEnabled({ timeout: 10000 }); await admin.locator('#restart').click();
    await Promise.all(audience.map(({ page }) => expect(page.locator('#status')).toHaveText('Playing · 1080p', { timeout: 15000 })));
    // Near-simultaneous CDP/Playwright readings are only a software estimate, not panel frame timestamps.
    const positions = await Promise.all(audience.map(({ page }) => media(page)));
    const spread = Math.abs(positions[0].time - positions[1].time);
    results[`play${round + 1}`] = { positions, spreadSeconds: spread, dashboard: await admin.locator('#devices').innerText() };
    assert.ok(spread < .5, `Position spread exceeded 0.5 sec: ${spread}`);
    await admin.locator('#pause').click();
    await Promise.all(audience.map(({ page }) => expect(page.locator('#status')).toHaveText('Paused', { timeout: 10000 })));
  }
  // Resume, preload without disturbing play, and automatic end screen.
  await admin.locator('#play').click();
  await Promise.all(audience.map(({ page }) => expect(page.locator('#status')).toHaveText('Playing · 1080p', { timeout: 15000 })));
  await admin.locator('#preload').click();
  await Promise.all(audience.map(({ page }) => expect(page.locator('#status')).toHaveText('Playing · 1080p')));
  await Promise.all(audience.map(({ page }) => expect(page.locator('#status')).toHaveText('Demo complete', { timeout: 20000 })));
  await audience[0].page.screenshot({ path: `${output}/audience-end.png` });
  results.scenarios.push('Three common-clock starts; pause/resume; preload preserves playing state; natural 12-second end screen');
  // Reconnect one audience while presenter resets the common state.
  const disconnected = audience[0];
  await disconnected.ctx.setOffline(true);
  await expect(disconnected.page.locator('#conn')).toHaveText('Reconnecting…', { timeout: 20000 });
  await admin.locator('#reset').click();
  await disconnected.ctx.setOffline(false);
  await expect(disconnected.page.locator('#conn')).toHaveText('Live connection', { timeout: 20000 });
  await expect(disconnected.page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 20000 });
  await expect(admin.locator('#synced-count')).toHaveText('2', { timeout: 20000 });
  results.scenarios.push('Offline audience reconnects and restores signed retained reset without another user gesture');
  // Reload explicitly clears readiness until the viewer taps again.
  await audience[1].page.reload();
  await expect(audience[1].page.locator('#ready')).toBeEnabled({ timeout: 30000 });
  await expect(admin.locator('#ready-count')).toHaveText('1', { timeout: 20000 });
  await audience[1].page.locator('#ready').click();
  await expect(admin.locator('#synced-count')).toHaveText('2', { timeout: 20000 });
  results.scenarios.push('Reload reconnects, requires fresh audience gesture, then becomes ready');
  // Exercise full screen on Chrome from a genuine click.
  await audience[0].page.locator('#full').click();
  await expect.poll(() => audience[0].page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await audience[0].page.keyboard.press('Escape');
  // Headless Chrome can consume Escape without leaving the browser fullscreen state.
  await audience[0].page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await expect.poll(() => audience[0].page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  results.scenarios.push('Chrome full screen entered through actual button click');
  // Responsive checks use viewport changes, not physical tablet claims.
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1180, height: 820 }]) {
    await audience[0].page.setViewportSize(size);
    assert.ok(await audience[0].page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await expect(audience[0].page.locator('#full')).toBeVisible();
    await audience[0].page.screenshot({ path: `${output}/audience-${size.width}x${size.height}.png` });
  }
  await audience[0].page.setViewportSize({ width: 1024, height: 768 });
  results.scenarios.push('390×844, 844×390, 1024×768, 1180×820: no horizontal overflow');
  results.pageErrors = logs; assert.deepEqual(logs, []);
  results.status = 'passed';
} catch (error) {
  results.status = 'failed'; results.error = String(error); console.error(error); process.exitCode = 1;
  for (const { page, name } of pages) {
    results[`${name}-url`] = page.url();
    await page.screenshot({ path: `${output}/failure-${name}.png`, fullPage: true }).catch(() => {});
  }
} finally {
  results.pageErrors = logs;
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  for (const { ctx, name } of contexts) { await ctx.tracing.stop({ path: `${output}/trace-${name}.zip` }); await ctx.close(); }
  for (const browser of browsers) await browser.close();
  console.log(JSON.stringify(results));
}
