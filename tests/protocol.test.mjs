import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockSample, positionAt, verify, validState } from '../protocol.mjs';
test('clock estimation removes clock skew and presenter processing time', () => {
  assert.deepEqual(clockSample(1000, 6050, 6060, 1110), { rtt: 100, offset: 5000 });
  assert.deepEqual(clockSample(6000, 1050, 1060, 6110), { rtt: 100, offset: -5000 });
});
test('common timeline supports scheduled start, pause, reconnect and end clamp', () => {
  const state = { mode: 'playing', at: 10000, position: 2 };
  assert.equal(positionAt(state, 9000), 2);
  assert.equal(positionAt(state, 12000), 4);
  assert.equal(positionAt(state, 50000), 12);
  assert.equal(positionAt({ ...state, mode: 'paused' }, 50000), 2);
});
test('unauthenticated and malformed control messages are rejected', async () => {
  assert.equal(await verify('{"type":"play"}'), null);
  assert.equal(await verify('{"body":"play","signature":"AAAA"}'), null);
  assert.equal(await verify('a'.repeat(13000)), null);
  assert.equal(validState({ kind: 'state', mode: 'playing', seq: 1, at: 5, issuedAt: 3, position: -10 }), false);
  assert.equal(validState({ kind: 'state', mode: 'playing', seq: 1, at: 5, issuedAt: 3, position: 0 }), true);
});
