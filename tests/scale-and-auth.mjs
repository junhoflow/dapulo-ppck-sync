import { mkdir, writeFile } from 'node:fs/promises';
import { config } from '../config.mjs';
import { topic } from '../protocol.mjs';
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const { connect } = await import(process.env.MQTT_MODULE || 'mqtt');
const base = process.env.PPCK_URL || 'https://junhoflow.github.io/dapulo-ppck-sync/';
const output = process.env.PPCK_EVIDENCE || `/private/tmp/ppck-scale-${Date.now()}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = [], pages = []; let adversary;
const result = { base, screens: 6, scenarios: [] };
async function page(name) {
 const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
 contexts.push({ context, name }); await context.tracing.start({ screenshots: true, snapshots: true });
 const p = await context.newPage(); pages.push(p); return p;
}
try {
 const admin = await page('admin'); await admin.goto(new URL('admin.html', base).href);
 await admin.locator('#key').setInputFiles(process.env.PPCK_KEY);
 await expect(admin.locator('#reset')).toBeEnabled({ timeout: 30000 }); await admin.locator('#reset').click();
 const viewers = [];
 for (let i = 0; i < 6; i++) {
  const p = await page(`audience-${i}`); viewers.push(p);
  if (i === 5) await p.addInitScript(() => { Object.defineProperty(performance, 'timeOrigin', { value: performance.timeOrigin + 120000 }); });
  if (i === 4) {
    let first = true;
    await p.route('**/27233.mp4', route => { if (first) { first = false; return route.fulfill({ status: 503, body: 'simulated temporary video failure' }); } return route.continue(); });
  }
  await p.goto(base);
  if (i === 4) { await expect(p.locator('#retry')).toBeVisible(); await admin.locator('#preload').click(); }
  await expect(p.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 30000 });
 }
 await expect(admin.locator('#connected-count')).toHaveText('6', { timeout: 30000 });
 await expect(admin.locator('#synced-count')).toHaveText('6', { timeout: 30000 });
 await contexts[0].context.setOffline(true);
 await expect(admin.locator('#conn')).toHaveText('재연결 중', { timeout: 10000 });
 await contexts[0].context.setOffline(false);
 await expect(admin.locator('#conn')).toHaveText('실시간 연결됨', { timeout: 20000 });
 await expect(admin.locator('#restart')).toBeEnabled({ timeout: 20000 });
 result.scenarios.push('Presenter reconnects with its in-memory signing key; failed video fetch recovered by signed preload command and automatic silent-video readiness');
 await admin.locator('#restart').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Playing · 1080p', { timeout: 15000 })));
 const positions = await Promise.all(viewers.map(p => p.locator('video').evaluate(v => v.currentTime)));
 result.positions = positions; result.spreadSeconds = Math.max(...positions) - Math.min(...positions);
 result.dashboard = await admin.locator('#devices').innerText();
 result.scenarios.push('Six isolated Chrome audience contexts start together; last screen clock skewed +120 seconds and corrected by presenter ping/pong');
 adversary = connect(config.broker, { reconnectPeriod: 0, connectTimeout: 10000 });
 await new Promise((resolve, reject) => { adversary.once('connect', resolve); adversary.once('error', reject); });
 const forged = JSON.stringify({ body: JSON.stringify({ v: 2, room: config.room, kind: 'state', mode: 'paused', seq: 9999999999999, at: Date.now(), issuedAt: Date.now(), position: 0 }), signature: 'AAAA' });
 await new Promise((resolve, reject) => adversary.publish(`${topic}/state`, forged, { qos: 1, retain: false }, e => e ? reject(e) : resolve()));
 await Promise.all(viewers.map((p, i) => expect.poll(() => p.locator('video').evaluate(v => v.currentTime), { timeout: 10000 }).toBeGreaterThan(positions[i] + .7)));
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Playing · 1080p')));
 result.scenarios.push('Forged high-sequence unsigned control published to actual public broker: all six viewers continued playback');
 await admin.locator('#reset').click();
 await Promise.all(viewers.map(p => expect(p.locator('#status')).toHaveText('Ready · Waiting for the presenter', { timeout: 10000 })));
 await admin.screenshot({ path: `${output}/admin-six-ready.png`, fullPage: true });
 await viewers[0].screenshot({ path: `${output}/audience-ready.png` });
 result.status = 'passed';
} catch (error) {
 result.status = 'failed'; result.error = String(error); console.error(error); process.exitCode = 1;
 for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${output}/failure-${i}.png` }).catch(() => {});
} finally {
 adversary?.end(true); await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
 for (const { context, name } of contexts) { await context.tracing.stop({ path: `${output}/trace-${name}.zip` }); await context.close(); }
 await browser.close(); console.log(JSON.stringify(result));
}
