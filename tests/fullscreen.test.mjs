import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../homepage-panel.mjs', import.meta.url), 'utf8');
function fixture({ kind = 'standard', reject = false, ipad = true } = {}) {
  const nodes = new Map(), messages = [];
  function node(id) {
    const classes = new Set();
    const value = { hidden: true, textContent: '', classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
    }, hasAttribute: key => value[key] !== undefined, getBoundingClientRect() {} };
    nodes.set(id, value); return value;
  }
  for (const id of ['presentation', 'homepage-panel', 'homepage', 'full', 'leave-expanded']) node(id);
  const screen = nodes.get('presentation');
  const document = { getElementById: id => nodes.get(id), addEventListener() {} };
  let requests = 0, exits = 0, nativeVideo = 0;
  if (kind === 'standard') {
    document.fullscreenEnabled = true;
    screen.requestFullscreen = async () => { requests++; if (reject) throw Error('denied'); document.fullscreenElement = screen; };
    document.exitFullscreen = async () => { exits++; document.fullscreenElement = null; };
  } else if (kind === 'webkit') {
    document.webkitFullscreenEnabled = true;
    screen.webkitRequestFullscreen = async () => { requests++; document.webkitFullscreenElement = screen; };
    document.webkitExitFullscreen = async () => { exits++; document.webkitFullscreenElement = null; };
  }
  const api = runInNewContext(source.replace(/^export /gm, '') + '\n({showHomepage,hideHomepage,togglePresentationFullscreen})', {
    document, window: { addEventListener() {} }, navigator: { userAgent: ipad ? 'iPad' : 'Chrome', platform: '', maxTouchPoints: ipad ? 5 : 0 },
  });
  return { api, screen, document, nodes, messages, video: { webkitEnterFullscreen() { nativeVideo++; } },
    toggle: () => api.togglePresentationFullscreen({ webkitEnterFullscreen() { nativeVideo++; } }, message => messages.push(message)),
    counts: () => ({ requests, exits, nativeVideo }) };
}

test('iPad with standard fullscreen requests the complete presentation and keeps it after video ends', async () => {
  const f = fixture();
  f.api.showHomepage();
  assert.equal(f.nodes.get('full').textContent, 'Full screen');
  await f.toggle();
  assert.equal(f.document.fullscreenElement, f.screen);
  assert.equal(f.nodes.get('full').textContent, 'Exit full screen');
  f.api.showHomepage();
  assert.equal(f.counts().exits, 0);
  assert.equal(f.nodes.get('leave-expanded').hidden, false);
  await f.nodes.get('leave-expanded').onclick();
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(f.nodes.get('full').textContent, 'Full screen');
});

test('older prefixed iPad fullscreen also enters and exits the whole presentation', async () => {
  const f = fixture({ kind: 'webkit' });
  f.api.showHomepage(); await f.toggle();
  assert.equal(f.document.webkitFullscreenElement, f.screen);
  await f.toggle();
  assert.deepEqual(f.counts(), { requests: 1, exits: 1, nativeVideo: 0 });
});

test('unavailable or rejected document fullscreen falls back to a clearly named large view', async () => {
  for (const options of [{ kind: 'none' }, { reject: true }]) {
    const f = fixture(options);
    f.api.showHomepage(); await f.toggle();
    assert.equal(f.screen.classList.contains('is-expanded'), true);
    assert.equal(f.nodes.get('full').textContent, 'Large view');
    assert.equal(f.counts().nativeVideo, 0, 'Never hide the website inside video-only fullscreen');
    await f.toggle();
    assert.equal(f.screen.classList.contains('is-expanded'), false);
  }
});

test('video-only fullscreen remains available before the website opens', async () => {
  const f = fixture({ kind: 'none' });
  await f.toggle(); assert.equal(f.counts().nativeVideo, 1);
  f.api.showHomepage({ nativeVideoFullscreen: true });
  assert.equal(f.screen.classList.contains('is-expanded'), true);
  assert.equal(f.nodes.get('homepage').src, 'https://dapulo.com/');
});
