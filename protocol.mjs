import { config } from './config.mjs';
const encoder = new TextEncoder();
export const topic = `dapulo/ppck/v2/${config.room}`;
export const now = () => performance.timeOrigin + performance.now();
export const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const unb64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
const publicKey = crypto.subtle.importKey('jwk', config.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
export async function sign(payload, key) {
  const body = JSON.stringify({ ...payload, room: config.room, v: 2 });
  return JSON.stringify({ body, signature: b64(await crypto.subtle.sign(algorithm, key, encoder.encode(body))) });
}
export async function verify(raw) {
  try {
    if (raw.length > 12000) return null;
    const { body, signature } = JSON.parse(raw);
    if (typeof body !== 'string' || typeof signature !== 'string') return null;
    if (!await crypto.subtle.verify(algorithm, await publicKey, unb64(signature), encoder.encode(body))) return null;
    const payload = JSON.parse(body);
    return payload.room === config.room && payload.v === 2 ? payload : null;
  } catch { return null; }
}
export function validState(s) {
  return s?.kind === 'state' && ['waiting', 'playing', 'paused'].includes(s.mode)
    && Number.isSafeInteger(s.seq) && Number.isFinite(s.at) && Number.isFinite(s.issuedAt)
    && Number.isFinite(s.position) && s.position >= 0 && s.position <= 60;
}
export function positionAt(state, time, duration = 12) {
  return Math.min(duration, Math.max(0, state.position + (state.mode === 'playing' ? Math.max(0, time - state.at) / 1000 : 0)));
}
export function clockSample(t0, t1, t2, t3) {
  return { rtt: Math.max(0, (t3 - t0) - (t2 - t1)), offset: ((t1 - t0) + (t2 - t3)) / 2 };
}
