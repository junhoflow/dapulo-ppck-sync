// Isolated native-input regression: real PPCK origin and real dapulo.com iframe.
// MQTT is disconnected in these test pages, and a local ended event only opens the existing panel.
// This avoids sending presenter commands to the user's live tablets during input diagnostics.
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const out = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-scroll-input-${Date.now()}`;
await mkdir(out, { recursive: true });
const results = { base, scope: 'real homepage/native input; isolated MQTT and synthetic panel-opening end event; separate browser per case', cases: [] };
for (const [engine, name, touch] of [[chromium, 'chrome-wheel', false], [webkit, 'webkit-wheel', false], [chromium, 'chrome-touch-fullscreen', true]]) {
 if (process.env.PPCK_CASE && process.env.PPCK_CASE !== name) continue;
 let browser, context, page, homeFrame;
 const result = { name };
 try {
  browser = await engine.launch({ ...(engine === chromium ? { channel: 'chrome' } : {}), headless: true });
  context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: touch, isMobile: touch });
  await context.tracing.start({ screenshots: true, snapshots: true });
  page = await context.newPage();
  await page.routeWebSocket('wss://broker.emqx.io:8084/mqtt', socket => socket.onMessage(() => {}));
  await page.goto(base);
  await expect(page.locator('#loading')).toContainText('Fully downloaded', { timeout: 30000 });
  if (touch) { await page.locator('#full').click(); await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('presentation'); }
  await page.locator('video').evaluate(video => video.dispatchEvent(new Event('ended')));
  await expect(page.frameLocator('#homepage').getByRole('heading', { level: 1 })).toContainText('Draw your coral.', { timeout: 30000 });
  const frame = homeFrame = page.frames().find(frame => frame.url() === 'https://dapulo.com/en');
  for (const scope of [page, frame]) await scope.evaluate(() => { window.__wheelInput = []; addEventListener('wheel', e => queueMicrotask(() => window.__wheelInput.push({target:e.target.tagName, prevented:e.defaultPrevented, dy:e.deltaY})), {capture:true,passive:true}); });
  await expect.poll(() => page.locator('#homepage-panel').evaluate(e => e.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  const box = await page.locator('#homepage').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height * .7;
  result.before = await frame.evaluate(() => scrollY);
  if (touch) {
   const cdp = await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
   for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 22 }] });
    await page.evaluate(() => new Promise(requestAnimationFrame));
   }
   await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else { await page.mouse.move(x, y); await page.mouse.wheel(0, 650); }
  await expect.poll(() => frame.evaluate(() => scrollY), { timeout: 5000 }).toBeGreaterThan(100);
  result.after = await frame.evaluate(() => scrollY);
  result.host = await page.locator('#homepage-panel').evaluate(e => ({ transform: getComputedStyle(e).transform, inert: e.inert }));
  result.fullscreen = await page.evaluate(() => document.fullscreenElement?.id || null);
  result.status = 'passed';
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
 } catch (error) {
  result.status = 'failed'; result.error = String(error); result.url = page?.url(); process.exitCode = 1;
  result.frameDiagnostic = await homeFrame?.evaluate(() => ({wheel:window.__wheelInput, y:scrollY, h1Top:document.querySelector('h1')?.getBoundingClientRect().top, scrollers:[...document.querySelectorAll('*')].filter(e=>e.scrollTop>0).map(e=>({tag:e.tagName,class:e.className,y:e.scrollTop}))})).catch(()=>null);
  result.parentDiagnostic = await page?.evaluate(() => ({wheel:window.__wheelInput, y:scrollY})).catch(()=>null);
  await page?.screenshot({ path: `${out}/failure-${name}.png`, fullPage: true }).catch(() => {});
 } finally {
  results.cases.push(result);
  await context?.tracing.stop({ path: `${out}/trace-${name}.zip` }); await browser?.close();
 }
}
results.status = results.cases.every(result => result.status === 'passed') ? 'passed' : 'failed';
await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
