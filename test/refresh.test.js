// -----------------------------------------------------------------------------
// The container refreshes by itself (Gladys#3198), within the Weerlive quota,
// and only publishes what changed.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STATE_HEARTBEAT_MS, msUntilQuotaReset } from '../src/app.js';
import { API_KEY, createAll, createWorld, document, fixture, settle } from './helpers/world.js';

const MINUTE = 60_000;
// 02-08-2025 14:18 in Amsterdam, the time of the fixture.
const START = 1754137084 * 1000;
const TEMPERATURE = 'ext:test-integration:place:city-amsterdam:temperature';

function clock(t, now = START) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now });
}

async function tick(t, world, ms) {
  // One minute at a time: the integration's tick re-arms itself every minute.
  for (let elapsed = 0; elapsed < ms; elapsed += MINUTE) {
    t.mock.timers.tick(Math.min(MINUTE, ms - elapsed));
    await settle(world.app);
  }
}

/** A world where the user added the Amsterdam device, on a running clock. */
async function addedWorld(t, options = {}) {
  clock(t, options.now);
  const world = await createWorld({ timers: true, ...options });
  t.after(() => world.stop());
  await createAll(world);
  await settle(world.app);
  return world;
}

test('the states refresh every 10 minutes without any onPoll from the core', async (t) => {
  const world = await addedWorld(t);
  const reads = () => world.weerlive.calls.length;
  assert.equal(reads(), 1, 'one reading to check the key, reused when the device is added');
  assert.equal(world.gladys.fake.lastState(TEMPERATURE), 19.1);

  world.weerlive.routes.Amsterdam.liveweer[0].temp = 20.4;
  await tick(t, world, 9 * MINUTE);
  assert.equal(reads(), 1, 'not before the period');
  await tick(t, world, MINUTE);
  assert.equal(reads(), 2, 'read again after 10 minutes, by the container itself');
  assert.equal(world.gladys.fake.lastState(TEMPERATURE), 20.4);

  await tick(t, world, 10 * MINUTE);
  assert.equal(reads(), 3);
});

test("the core's onPoll is a fallback: it never spends a request while the tick runs", async (t) => {
  const world = await addedWorld(t);
  const [device] = world.gladys.fake.discoveredDevices;
  for (let i = 0; i < 9; i += 1) {
    await tick(t, world, MINUTE);
    assert.deepEqual(await world.gladys.fake.poll(device), { success: true });
  }
  assert.equal(world.weerlive.calls.length, 1, 'polled every minute, read once');

  // The tick stalls: the core takes over, once a period.
  world.app.stop();
  t.mock.timers.tick(MINUTE);
  await world.gladys.fake.poll(device);
  await world.gladys.fake.poll(device);
  assert.equal(world.weerlive.calls.length, 2);
});

test('only the values that changed are published again, and all of them every 12 h', async (t) => {
  const world = await addedWorld(t);
  const first = world.gladys.fake.states.length;
  assert.equal(first, 18, 'every feature once');

  await tick(t, world, 10 * MINUTE);
  assert.equal(world.gladys.fake.states.length, first, 'same answer: nothing sent');

  world.weerlive.routes.Amsterdam.liveweer[0].lv = 71;
  await tick(t, world, 10 * MINUTE);
  const sent = world.gladys.fake.states.slice(first);
  assert.deepEqual(
    sent.map((s) => s.device_feature_external_id.split(':').pop()),
    ['humidity'],
  );

  t.mock.timers.tick(STATE_HEARTBEAT_MS - 20 * MINUTE);
  await tick(t, world, 10 * MINUTE);
  assert.ok(world.gladys.fake.states.length >= first * 2, 'heartbeat: everything again');
});

test('a device just added gets every state at once, from the last reading', async (t) => {
  clock(t);
  const world = await createWorld({ timers: true });
  t.after(() => world.stop());
  assert.equal(world.weerlive.calls.length, 1, 'the key check');
  assert.equal(world.gladys.fake.states.length, 0, 'nothing published before the device exists');

  await tick(t, world, 3 * MINUTE);
  await createAll(world);
  assert.equal(world.weerlive.calls.length, 1, 'no new request: the reading is 3 min old');
  assert.equal(world.gladys.fake.states.length, 18);
  assert.deepEqual(world.gladys.fake.widgetRefreshes, ['knmi_forecast']);

  // Deleted and added again: the SDK forgot, everything is sent again.
  await world.gladys.fake.deviceCreated(world.gladys.fake.discoveredDevices[0]);
  assert.equal(world.gladys.fake.states.length, 36);
});

test('a restart reuses the reading kept in /data instead of spending the quota', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'gladys-knmi-'));
  const first = await addedWorld(t, { dataDir });
  await first.stop();
  const devices = first.gladys.fake.discoveredDevices;

  t.mock.timers.tick(4 * MINUTE);
  const second = await createWorld({ timers: true, dataDir, devices });
  t.after(() => second.stop());
  await settle(second.app);
  assert.equal(second.weerlive.calls.length, 0, 'read 4 min ago: no request');

  await tick(t, second, 6 * MINUTE);
  assert.equal(second.weerlive.calls.length, 1, 'then read at the normal pace');
});

test('several places share the quota: each is read less often', async (t) => {
  const amsterdam = document('amsterdam');
  const world = await addedWorld(t, {
    config: { api_key: API_KEY, places: 'Amsterdam; Groningen; Purmerend' },
    routes: {
      Amsterdam: amsterdam,
      Groningen: document('groningen'),
      Purmerend: document('alarm'),
    },
  });
  assert.equal(world.weerlive.calls.length, 3);
  // 3 places: 18 minutes each (3 × 80 = 240 requests a day).
  await tick(t, world, 17 * MINUTE);
  assert.equal(world.weerlive.calls.length, 3);
  await tick(t, world, MINUTE);
  assert.equal(world.weerlive.calls.length, 6);
  // A whole day stays within the budget.
  await tick(t, world, 24 * 60 * MINUTE - 18 * MINUTE);
  assert.ok(world.weerlive.calls.length <= 243, `${world.weerlive.calls.length} requests`);
});

test('the daily limit stops every request until midnight in the Netherlands', async (t) => {
  const world = await addedWorld(t);
  world.weerlive.routes.Amsterdam = fixture('rate-limit.txt');
  await tick(t, world, 10 * MINUTE);
  assert.equal(world.weerlive.calls.length, 2);
  assert.deepEqual(world.gladys.fake.connectionStatus.connected, false);
  assert.match(world.gladys.fake.connectionStatus.message.en, /Daily Weerlive limit/);

  // 14:28 in Amsterdam: nothing until 00:05.
  const wait = msUntilQuotaReset(Date.now());
  assert.equal(Math.round(wait / MINUTE), 9 * 60 + 37);
  world.weerlive.routes.Amsterdam = document('amsterdam');
  await tick(t, world, wait - MINUTE);
  assert.equal(world.weerlive.calls.length, 2, 'no request while the quota is spent');
  await tick(t, world, 2 * MINUTE);
  assert.equal(world.weerlive.calls.length, 3);
  assert.equal(world.gladys.fake.connectionStatus.connected, true);
});

test('Gladys unreachable: no request', async (t) => {
  const world = await addedWorld(t);
  world.gladys.connected = false;
  await tick(t, world, 30 * MINUTE);
  assert.equal(world.weerlive.calls.length, 1);
});
