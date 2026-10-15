// -----------------------------------------------------------------------------
// Configuration, connection status and the "Test the connection" action, on
// the full wiring (src/app.js) and the SDK's fake Gladys.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES } from '../src/i18n.js';
import { API_KEY, createAll, createWorld, document, fixture } from './helpers/world.js';

test('not configured: no device, a status that says what to do', async () => {
  const world = await createWorld({ config: {} });
  assert.deepEqual(world.gladys.fake.discoveredDevices, []);
  assert.deepEqual(world.gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.notConfigured,
  });
  assert.equal(world.weerlive.calls.length, 0);
  assert.deepEqual(await world.gladys.fake.action('test_connection', {}), {
    success: true,
    data: { message: MESSAGES.notConfigured },
  });
});

test('one device per place: the Gladys house and the typed towns', async () => {
  const world = await createWorld({
    config: { api_key: API_KEY, house: 'huis', places: 'Groningen; Maastricht' },
    routes: { '52.37,4.89': document('amsterdam'), '*': document('groningen') },
  });
  assert.deepEqual(
    world.gladys.fake.discoveredDevices.map((device) => [device.name, device.external_id]),
    [
      ['KNMI Huis', 'ext:test-integration:place:house-huis'],
      ['KNMI Groningen', 'ext:test-integration:place:city-groningen'],
      ['KNMI Maastricht', 'ext:test-integration:place:city-maastricht'],
    ],
  );
  assert.deepEqual(
    world.weerlive.calls.map((call) => call.location),
    ['52.37,4.89'],
    'one request checks the key; the house is sent rounded',
  );
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
  const names = world.gladys.fake.discoveredDevices[0].features.map((f) => f.name);
  assert.ok(names.includes('Température ressentie'), 'French names by default');
});

test('a refused key is said in the status and by the test action', async () => {
  const world = await createWorld({ routes: { Amsterdam: fixture('invalid-api-key.txt') } });
  assert.deepEqual(world.gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.invalidKey,
  });
  const ack = await world.gladys.fake.action('test_connection', {});
  assert.deepEqual(ack.data.message, MESSAGES.invalidKey);

  // The user fixes the key: everything comes back.
  world.weerlive.routes.Amsterdam = document('amsterdam');
  await world.gladys.fake.configUpdated({ api_key: 'another-key', places: 'Amsterdam' });
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
});

test('the test action reports the place found and the quota left, in four languages', async () => {
  const world = await createWorld({
    config: { api_key: API_KEY, places: 'Groningen; Delft; 999,999' },
    routes: { '*': document('groningen') },
  });
  const ack = await world.gladys.fake.action('test_connection', {});
  assert.equal(ack.success, true);
  const report = ack.data.message;
  assert.deepEqual(Object.keys(report), ['en', 'fr', 'de', 'es']);
  assert.equal(
    report.en,
    'Key accepted. "Groningen" read as Groningen by Weerlive. 299 requests left today. ' +
      '2 place(s), one reading every 12 min each. Ignored: 999,999.',
  );
  assert.match(report.de, /Schlüssel akzeptiert/);
});

test('a Gladys house without location', async () => {
  const world = await createWorld({ config: { api_key: API_KEY, house: 'chalet' } });
  assert.deepEqual(world.gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.unlocatedHouse,
  });
  assert.deepEqual(world.gladys.fake.discoveredDevices, []);
});

test('a new configuration replaces the places and forgets the old readings', async () => {
  const world = await createWorld();
  await createAll(world);
  await world.gladys.fake.configUpdated({ api_key: API_KEY, places: 'Groningen' });
  assert.deepEqual(
    world.gladys.fake.discoveredDevices.map((device) => device.name),
    ['KNMI Groningen'],
  );
  assert.equal(world.app.store.reading('city-amsterdam'), null);
});

test('a scan request publishes the devices again; the features are read-only', async () => {
  const world = await createWorld();
  const before = world.gladys.fake.requests.length;
  await world.gladys.fake.scanRequest();
  assert.ok(world.gladys.fake.requests.length > before);
  await createAll(world);
  const [device] = world.gladys.fake.discoveredDevices;
  const ack = await world.gladys.fake.setValue(device, device.features[0], 1);
  assert.equal(ack.success, false);
});

test('after a reconnection (Gladys restarted), the status is sent again', async () => {
  const world = await createWorld();
  const before = world.gladys.fake.connectionStatuses.length;
  await world.gladys.disconnect();
  await world.gladys.connect();
  assert.equal(world.gladys.fake.connectionStatuses.length, before + 1);
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
  assert.equal(world.weerlive.calls.length, 1, 'the reading kept is reused');
});
