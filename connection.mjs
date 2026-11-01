import { config } from './config.mjs';
export function connect(id, onConnection) {
  if (!window.mqtt) throw new Error('Realtime library failed to load. Reload this page.');
  const client = window.mqtt.connect(config.broker, {
    clientId: `ppck_${id}`, clean: true, reconnectPeriod: 2000, connectTimeout: 10000,
    keepalive: 20, resubscribe: true, queueQoSZero: false,
  });
  client.on('connect', () => onConnection(true));
  for (const name of ['offline', 'close', 'error']) client.on(name, () => onConnection(false));
  return client;
}
export function publish(client, path, value, retain = false) {
  return new Promise((resolve, reject) => {
    if (!client.connected) return reject(new Error('Realtime connection is offline.'));
    client.publish(path, typeof value === 'string' ? value : JSON.stringify(value), { qos: 1, retain }, error => error ? reject(error) : resolve());
  });
}
