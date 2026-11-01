// Layout fixture is synthetic: it does not bypass dapulo.com's live embedding policy.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'http://127.0.0.1:18932/';
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-home-panel-${Date.now()}`;
await mkdir(output, { recursive: true });
const browsers = [], contexts = [], pages = [], result = { base, homepage: 'SYNTHETIC LAYOUT FIXTURE — not live dapulo.com', scenarios: [] };
const fixture = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#faf8f2;color:#234b43;font:16px sans-serif}header{background:#fff0b3;padding:16px;font-size:13px;position:sticky;top:0}section{min-height:550px;padding:30px 22px;box-sizing:border-box;border-bottom:1px solid #ddd}h1{font-size:34px}p{line-height:1.7}</style><header>레이아웃 검증용 · 실제 홈페이지 아님</header><section><h1>Dapulo<br>모바일 홈페이지 영역</h1><p>실제 dapulo.com은 현재 외부 삽입이 차단되어 있습니다.</p><p>승인 후 공개 홈페이지의 프레임 허용 설정을 바꾸면 이 영역에 실제 사이트가 표시됩니다.</p></section><section id="more"><h2>독립 스크롤 확인</h2><p>왼쪽 영상은 각자 다시 볼 수 있습니다.</p></section><section><h2>스크롤 유지 확인</h2></section></html>`;
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
  await page.route('https://dapulo.com/', route => { loads[i]++; return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture }); });
  await page.goto(base); await expect(page.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
  await expect(page.locator('#homepage-panel')).toBeHidden(); assert.equal(loads[i], 0);
 }
 await viewers[0].locator('#full').click();
 await expect.poll(() => viewers[0].evaluate(() => document.fullscreenElement?.id)).toBe('presentation');
 await expect(admin.locator('#play')).toBeEnabled({ timeout: 30000 }); await admin.locator('#play').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Demo complete', { timeout: 20000 })));
 for (const [i, p] of viewers.entries()) {
  await expect(p.locator('#homepage-panel')).toBeVisible();
  await expect(p.frameLocator('#homepage').getByText('레이아웃 검증용 · 실제 홈페이지 아님')).toBeVisible();
  // Bound assertion waits for the CSS transition, rather than sleeping.
  await expect.poll(async () => {
   const left = await p.locator('#screen').boundingBox(), right = await p.locator('#homepage').boundingBox();
   return right.x > left.x + left.width && right.width >= 300 && right.width <= 390;
  }).toBe(true);
  await p.screenshot({ path: `${output}/${i}-end-split-fixture.png`, fullPage: true });
  if (!i) {
    await expect.poll(() => p.evaluate(() => document.fullscreenElement?.id)).toBe('presentation');
    await p.evaluate(() => document.exitFullscreen());
  }
  const frame = p.frames().find(f => f.url() === 'https://dapulo.com/');
  await frame.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => frame.evaluate(() => scrollY)).toBeGreaterThan(550);
  await p.locator('#replay').click(); await expect(p.locator('#status')).toHaveText('Replaying on this screen');
  await expect(p.locator('#homepage-panel')).toBeVisible(); assert.equal(loads[i], 1);
  assert.ok(await frame.evaluate(() => scrollY) > 550);
  // Go back to the fixture top for a clearly labelled review screenshot.
  await frame.evaluate(() => window.scrollTo(0, 0));
  for (const size of [{ width: 1180, height: 820 }, { width: 1024, height: 768 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
   await p.setViewportSize(size); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
   await p.screenshot({ path: `${output}/${i}-${size.width}x${size.height}-fixture.png`, fullPage: true });
  }
 }
 await admin.locator('#reset').click();
 for (const p of viewers) await expect(p.locator('#homepage-panel')).toBeHidden({ timeout: 10000 });
 result.status = 'passed'; result.loads = loads;
 result.scenarios = ['Homepage absent/unrequested before video ends', 'End shifts video left and opens mobile-width panel including Chrome fullscreen', 'Homepage frame scrolls independently', 'Personal replay keeps homepage open and preserves its scroll without reloading', 'Tablet landscape and phone portrait layouts have no horizontal overflow', 'Central reset restores video-only view'];
} catch (e) {
 result.status = 'failed'; result.error = String(e); console.error(e); process.exitCode = 1;
 for (const { page, name } of pages) await page.screenshot({ path: `${output}/failure-${name}.png`, fullPage: true }).catch(() => {});
} finally {
 await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
 for (const { context, name } of contexts) { await context.tracing.stop({ path: `${output}/trace-${name}.zip` }); await context.close(); }
 for (const browser of browsers) await browser.close(); console.log(JSON.stringify(result));
}
