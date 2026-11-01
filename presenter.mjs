import { config } from './config.mjs';
import { topic, sign, verify, validState, positionAt, now } from './protocol.mjs';
import { connect, publish } from './connection.mjs';
const el = id => document.getElementById(id);
const controls = ['play', 'pause', 'restart', 'reset', 'preload'];
const audienceURL = new URL('./', location.href).href;
el('audience-link').href = audienceURL; el('audience-link').textContent = audienceURL;
let key, client, connected = false, busy = false, subscribed = false;
let state = { mode: 'waiting', position: 0, seq: 0, at: 0 }, sequence = 0;
const devices = new Map(), pingLimits = new Map();
function activeDevices() { return [...devices.values()].filter(d => now() - d.seen < 15000); }
function render() {
  const active = activeDevices(), prepared = active.filter(d => d.loaded && d.ready && !d.error && d.visible);
  const synced = prepared.filter(d => d.synced && d.rtt !== null && d.rtt < 1000);
  el('connected-count').textContent = active.length;
  el('ready-count').textContent = prepared.length; el('synced-count').textContent = synced.length;
  const allReady = active.length > 0 && synced.length === active.length;
  el('readiness').textContent = !key ? '발표자 키를 열어주세요.' : !connected ? '중계 서버 재연결 중입니다.' :
    allReady ? `관객 ${active.length}대 모두 준비되었습니다. 재생할 수 있습니다.` :
      `각 태블릿에서 Get ready를 누르고 화면을 켜 두세요. 준비/시계 보정 ${synced.length}/${active.length}대`;
  for (const id of controls) el(id).disabled = !key || !connected || !subscribed || busy || (['play', 'restart'].includes(id) && !allReady);
  el('devices').replaceChildren(...active.map(d => {
    const row = document.createElement('tr');
    for (const text of [d.id.slice(0, 4).toUpperCase(), `${d.download}%${d.loaded ? ' · 1080p' : ''}`,
      d.error || `${d.ready ? '준비' : '터치 필요'} · ${d.phase}${d.muted ? ' · 음소거' : ''}`,
      d.rtt === null ? '보정 중' : `${d.rtt} ms`, d.startError === null ? '—' : `${d.startError} ms`, d.visible ? '열림' : '백그라운드']) {
      const cell = document.createElement('td'); cell.textContent = String(text).slice(0, 140); row.append(cell);
    }
    return row;
  }));
}
async function send(mode, restart = false, preload = false) {
  if (!key || !connected || busy) return;
  busy = true; render();
  if (preload) {
    try { await publish(client, `${topic}/preload`, await sign({ kind: 'preload', issuedAt: now() }, key)); el('sent').textContent = '사전 로딩 확인 명령 전송 완료'; }
    catch (e) { el('sent').textContent = e.message; }
    finally { busy = false; render(); }
    return;
  }
  const timestamp = now(), position = mode === 'waiting' || restart ? 0 : positionAt(state, timestamp);
  const next = { kind: 'state', mode, position, at: timestamp + (mode === 'playing' ? 3000 : 0),
    issuedAt: timestamp, seq: sequence = Math.max(Math.floor(timestamp), sequence + 1), preload };
  try {
    const encoded = await sign(next, key);
    await publish(client, `${topic}/state`, encoded, true);
    state = next;
    el('sent').textContent = `${mode === 'playing' ? '3초 뒤 재생 예약' : mode === 'paused' ? '일시정지' : preload ? '사전 로딩 확인' : '전체 초기화'} · 중계 서버 수신 확인 · ${new Date().toLocaleTimeString('ko-KR')}`;
  } catch (e) { el('sent').textContent = `전송 실패: ${e.message} 연결 복구 후 상태를 확인하세요.`; }
  finally { busy = false; render(); }
}
el('play').onclick = () => send('playing'); el('restart').onclick = () => send('playing', true);
el('pause').onclick = () => send('paused'); el('reset').onclick = () => send('waiting');
el('preload').onclick = () => send(state.mode, false, true);
el('key').onchange = async () => {
  try {
    const file = el('key').files[0]; if (!file || file.size > 10000) throw new Error('올바른 키 파일을 선택하세요.');
    const jwk = JSON.parse(await file.text());
    if (jwk.x !== config.publicKey.x || jwk.y !== config.publicKey.y || typeof jwk.d !== 'string') throw new Error('이 발표에 해당하는 키가 아닙니다.');
    const imported = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    if (!await verify(await sign({ kind: 'key-check' }, imported))) throw new Error('키 검증에 실패했습니다.');
    key = imported; el('key-status').textContent = '제어 권한 확인 완료 · 키는 현재 탭 메모리에만 보관됩니다.';
    el('key').value = '';
    if (!client) startConnection();
    render();
  } catch (e) { el('key-status').textContent = e.message; }
};
function startConnection() {
  client = connect(`presenter_${crypto.randomUUID().slice(0, 12)}`, online => {
    connected = online; subscribed = false;
    el('conn').textContent = online ? '실시간 연결됨' : '재연결 중'; el('conn').classList.toggle('online', online);
    if (online) client.subscribe([`${topic}/presence/+`, `${topic}/ping`, `${topic}/state`], { qos: 1 }, error => {
      subscribed = !error;
      if (error) el('sent').textContent = '제어 채널 구독 실패. 새로고침 후 키를 다시 열어주세요.';
      render();
    });
    render();
  });
  client.on('message', async (path, bytes) => {
    if (bytes.length > 12000) return;
    if (path === `${topic}/state`) {
      const next = await verify(bytes.toString());
      if (validState(next) && next.seq > state.seq && Math.abs(now() - next.issuedAt) < 12 * 3600000) {
        state = next; sequence = Math.max(sequence, next.seq);
      }
      return;
    }
    try {
      const msg = JSON.parse(bytes.toString());
      if (!/^[a-f0-9]{12}$/.test(msg.id)) return;
      if (path === `${topic}/ping` && typeof msg.nonce === 'string' && msg.nonce.length < 80 && Number.isFinite(msg.t0)) {
        const t1 = now(); if (t1 - (pingLimits.get(msg.id) || 0) < 100) return;
        if (pingLimits.size > 500) pingLimits.clear(); pingLimits.set(msg.id, t1);
        const signed = await sign({ kind: 'pong', id: msg.id, nonce: msg.nonce, t0: msg.t0, t1, t2: now() }, key);
        await publish(client, `${topic}/pong/${msg.id}`, signed);
      } else if (path === `${topic}/presence/${msg.id}` && (devices.has(msg.id) || devices.size < 200) &&
        typeof msg.loaded === 'boolean' && typeof msg.ready === 'boolean' && Number.isFinite(msg.download)) {
        devices.set(msg.id, { ...msg, seen: now() }); render();
      }
    } catch { /* Ignore malformed/untrusted public-broker payloads. */ }
  });
}
setInterval(() => {
  for (const [id, device] of devices) if (now() - device.seen > 60000) devices.delete(id);
  render();
}, 1000);
render();
