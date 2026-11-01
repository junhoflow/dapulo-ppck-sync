import { config } from './config.mjs';
import { connect, publish } from './connection.mjs';
import { topic, verify, validState, positionAt, clockSample, now } from './protocol.mjs';
const el = id => document.getElementById(id), video = el('video');
if (!config.hasAudio) { el('sound').textContent = 'Silent demo'; el('sound').disabled = true; }
const id = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
el('device').textContent = `Screen ${id.slice(0, 4).toUpperCase()}`;
let client, loaded = false, ready = false, loading = false, download = 0, blobURL;
let state, appliedSeq = 0, timer, revision = 0, phase = 'loading', error = '', startError = null;
let samples = [], offset = 0, rtt = null, clockAt = 0;
const pings = new Map();
const presenterNow = () => now() + offset;
const synced = () => clockAt > 0 && now() - clockAt < 25000;
function status(text) { el('status').textContent = text; }
function cover(headline, message, step = 'DAPULO · LIVE DEMO') {
  el('cover').hidden = false; el('headline').textContent = headline;
  el('message').textContent = message; el('step').textContent = step;
}
function report() {
  if (!client?.connected) return;
  publish(client, `${topic}/presence/${id}`, { id, loaded, ready, download, phase, error,
    rtt: synced() ? Math.round(rtt) : null, synced: synced(), startError,
    visible: !document.hidden, seq: appliedSeq, position: video.currentTime,
    muted: video.muted, width: video.videoWidth, height: video.videoHeight }).catch(() => {});
}
function ping() {
  if (!client?.connected) return;
  const nonce = crypto.randomUUID(), t0 = now();
  pings.set(nonce, t0);
  for (const [key, time] of pings) if (t0 - time > 10000) pings.delete(key);
  publish(client, `${topic}/ping`, { id, nonce, t0 }).catch(() => {});
}
async function loadVideo() {
  if (loading || loaded) return;
  loading = true; error = ''; phase = 'loading'; el('retry').hidden = true;
  el('ready').disabled = true; el('ready').textContent = 'Loading video…';
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(config.video, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get('content-length')), chunks = [];
    let received = 0;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        chunks.push(value); received += value.length;
        download = total ? Math.min(99, Math.round(received / total * 100)) : 0;
        el('progress').value = download;
        el('loading').textContent = total ? `Downloading video · ${download}%` : `Downloading · ${(received / 1048576).toFixed(1)} MB`;
      }
    } else chunks.push(await response.arrayBuffer());
    if (blobURL) URL.revokeObjectURL(blobURL);
    blobURL = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Video format could not be decoded.')), { once: true });
      controller.signal.addEventListener('abort', () => reject(new Error('Video loading timed out.')), { once: true });
      video.src = blobURL; video.load();
    });
    loaded = true; download = 100; phase = 'loaded';
    el('progress').value = 100; el('loading').textContent = `1080p · ${video.duration.toFixed(1)} sec · Fully downloaded`;
    el('ready').disabled = false; el('ready').textContent = 'Get ready';
    el('message').textContent = config.hasAudio ? 'Tap once to enable video and sound.' : 'A silent 12-second demo. Tap once to get ready.';
    status('Video downloaded · Tap Get ready'); report();
  } catch (e) {
    error = `Video load failed: ${e.message}`; phase = 'error';
    cover('Let’s try that again.', 'Check your connection, then retry the video download.');
    status(error); el('retry').hidden = false; el('ready').hidden = true; report();
  } finally { clearTimeout(timeout); loading = false; }
}
el('retry').onclick = () => { el('ready').hidden = false; loadVideo(); };
async function prepare() {
  const token = ++revision; clearTimeout(timer); el('ready').disabled = true;
  try {
    // Call unmuted play directly inside the real user click. Muted priming does not unlock audio on Safari.
    video.muted = el('sound').getAttribute('aria-pressed') === 'true';
    await video.play();
    if (token !== revision) return;
    video.pause(); video.currentTime = 0; ready = true; error = ''; phase = 'ready';
    el('ready').hidden = true; el('progress').hidden = true;
    cover('Your ocean is ready.', 'Please keep this screen open. The presenter will begin shortly.', 'READY WHEN YOU ARE');
    status(synced() ? 'Ready · Waiting for the presenter' : 'Ready · Waiting for presenter connection');
    navigator.wakeLock?.request('screen').catch(() => {});
    await applyState(); report();
  } catch {
    ready = false; error = 'Playback permission needed'; phase = 'blocked';
    el('ready').disabled = false; el('ready').hidden = false; el('ready').textContent = 'Tap to allow playback';
    status('Tap again to allow video and sound'); report();
  }
}
el('ready').onclick = prepare;
el('sound').onclick = () => {
  const muted = el('sound').getAttribute('aria-pressed') !== 'true';
  el('sound').setAttribute('aria-pressed', String(muted)); el('sound').textContent = muted ? 'Sound off' : 'Sound on';
  video.muted = muted; report();
};
el('full').onclick = async () => {
  try {
    const screen = el('screen');
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (screen.requestFullscreen) await screen.requestFullscreen();
    else if (screen.webkitRequestFullscreen) screen.webkitRequestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else status('Rotate your tablet for a larger view.');
  } catch { status('Full screen unavailable · Rotate your tablet for a larger view'); }
};
function finish() {
  clearTimeout(timer); phase = 'ended'; el('count').textContent = '';
  cover('Small focus. Real growth.', 'Thank you for diving into Dapulo.', 'THANK YOU');
  el('ready').hidden = true; status('Demo complete'); report();
}
video.addEventListener('ended', finish);
async function applyState() {
  if (!state || !ready || !loaded || !synced()) return;
  if (Math.abs(presenterNow() - state.issuedAt) > 12 * 3600000) return;
  const current = state, token = ++revision; clearTimeout(timer); video.pause();
  appliedSeq = current.seq; el('count').textContent = ''; error = '';
  if (current.mode === 'waiting') {
    video.currentTime = 0; startError = null; phase = 'ready';
    cover('Your ocean is ready.', 'Please keep this screen open. The presenter will begin shortly.', 'READY WHEN YOU ARE');
    status('Ready · Waiting for the presenter'); report(); return;
  }
  if (current.mode === 'paused') {
    video.currentTime = positionAt(current, presenterNow(), video.duration); phase = 'paused';
    cover('A moment to breathe.', 'The presenter has paused the demo.', 'PAUSED');
    status('Paused'); report(); return;
  }
  video.currentTime = positionAt(current, presenterNow(), video.duration);
  function start() {
    if (token !== revision) return;
    const left = current.at - presenterNow();
    if (left > 4) {
      phase = 'scheduled'; el('count').textContent = String(Math.ceil(left / 1000));
      cover('Dive in with us.', 'The demo is about to begin.', 'STARTING TOGETHER');
      timer = setTimeout(start, Math.min(left, 50)); return;
    }
    const expected = positionAt(current, presenterNow(), video.duration);
    if (expected >= video.duration - 0.05) { video.currentTime = video.duration; finish(); return; }
    if (Math.abs(video.currentTime - expected) > 0.12) video.currentTime = expected;
    el('count').textContent = ''; el('cover').hidden = true;
    startError = Math.round(presenterNow() - current.at); phase = 'starting';
    video.play().then(() => {
      if (token !== revision) return;
      phase = 'playing'; status('Playing · 1080p'); report();
    }).catch(() => {
      if (token !== revision) return;
      ready = false; error = 'Autoplay blocked'; phase = 'blocked';
      cover('One quick tap.', 'Your browser needs a tap to begin the demo.');
      el('ready').hidden = false; el('ready').disabled = false; el('ready').textContent = 'Tap to play';
      status('Playback permission needed'); report();
    });
  }
  start(); report();
}
function onConnection(connected) {
  el('conn').textContent = connected ? 'Live connection' : 'Reconnecting…';
  el('conn').classList.toggle('online', connected);
  if (connected) {
    samples = []; clockAt = 0;
    client.subscribe([`${topic}/state`, `${topic}/preload`, `${topic}/pong/${id}`], { qos: 1 }, error => {
      if (error) return status('Live subscription failed · Reload this page');
      ping(); setTimeout(ping, 300); setTimeout(ping, 900); report();
    });
  }
}
try {
  client = connect(id, onConnection);
  client.on('message', async (path, bytes) => {
    const received = now(), msg = await verify(bytes.toString()); if (!msg) return;
    if (path === `${topic}/preload` && msg.kind === 'preload' && synced() && Math.abs(presenterNow() - msg.issuedAt) < 10000) {
      if (!loaded) loadVideo(); report();
    } else if (path === `${topic}/state` && validState(msg)) {
      if (state && msg.seq <= state.seq) return;
      state = msg;
      if (msg.preload && !loaded) loadVideo();
      await applyState();
    } else if (path === `${topic}/pong/${id}` && msg.kind === 'pong' && msg.id === id && pings.has(msg.nonce)) {
      const t0 = pings.get(msg.nonce); pings.delete(msg.nonce);
      if (msg.t0 !== t0 || !Number.isFinite(msg.t1) || !Number.isFinite(msg.t2)) return;
      const sample = { ...clockSample(t0, msg.t1, msg.t2, received), received };
      samples = samples.filter(s => received - s.received < 20000); samples.push(sample);
      const best = samples.reduce((a, b) => a.rtt < b.rtt ? a : b);
      offset = best.offset; rtt = best.rtt; const first = !synced(); clockAt = received;
      if (first || phase === 'scheduled') await applyState(); report();
    }
  });
} catch (e) { status(e.message); }
setInterval(ping, 5000); setInterval(report, 2000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { ping(); if (ready) navigator.wakeLock?.request('screen').catch(() => {}); applyState(); }
  report();
});
video.addEventListener('waiting', () => { if (ready && state?.mode === 'playing') { phase = 'buffering'; report(); } });
video.addEventListener('playing', () => { phase = 'playing'; report(); });
loadVideo();
