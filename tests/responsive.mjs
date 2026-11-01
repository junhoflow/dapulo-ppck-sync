import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-responsive-${Date.now()}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext(); await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage(), result = [];
try {
 await page.goto(process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/');
 await expect(page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
 for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1180, height: 820 }]) {
  await page.setViewportSize(size);
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  for (const id of ['full']) {
   await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await page.screenshot({ path: `${output}/${size.width}x${size.height}.png`, fullPage: true });
  result.push({ ...size, fullScreenButtonInViewport: true, horizontalOverflow: false });
 }
 await page.setViewportSize({ width: 1024, height: 768 });
 await page.screenshot({ path: `${output}/audience-ready.png` });
 console.log(JSON.stringify({ status: 'passed', result }));
 await writeFile(`${output}/results.json`, JSON.stringify({ status: 'passed', result }, null, 2));
} catch (e) { await page.screenshot({ path: `${output}/failure.png` }); console.error(e); process.exitCode = 1; }
finally { await context.tracing.stop({ path: `${output}/trace.zip` }); await browser.close(); }
