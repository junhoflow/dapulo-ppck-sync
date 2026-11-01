import { config } from './config.mjs';
export function connect(id, onConnection) {
  if (!window.mqtt) throw new Error('Realtime library failed to load. Reload this page.');
  const client = window.mqtt.connect(config.broker, {
    clientId: `ppck_${id}`, clean: true, reconnectPeriod: 2000, connectTimeout: 10000,
    keepalive: 20, resubscribe: true, queueQoSZero: false,
  });
  client.on('connect', () => onConnection(true));
  for (const name of ['offline', 'close', 'error']) client.on(name, () => onConnection(false));
  // Browser offline emulation (and some Wi-Fi transitions) leaves an existing WebSocket open.
  // Explicitly stop it while offline, then reconnect and resubscribe on return.
  window.addEventListener('offline', () => { onConnection(false); client.end(true); });
  window.addEventListener('online', () => { if (!client.connected) client.reconnect(); });
  return client;
}
export function publish(client, path, value, retain = false) {
  return new Promise((resolve, reject) => {
    if (!client.connected) return reject(new Error('Realtime connection is offline.'));
    const timeout = setTimeout(() => reject(new Error('Command acknowledgement timed out. Check audience state before retrying.')), 10000);
    client.publish(path, typeof value === 'string' ? value : JSON.stringify(value), { qos: 1, retain }, error => { clearTimeout(timeout); error ? reject(error) : resolve(); });
  });
}
