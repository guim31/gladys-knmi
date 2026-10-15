// -----------------------------------------------------------------------------
// "New KNMI warning": one event per new warning, never on the first look,
// never again after a restart.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toModel } from '../src/model.js';
import { newWarnings, seenWarnings } from '../src/warnings.js';
import { API_KEY, createAll, createWorld, document, settle, withWarning } from './helpers/world.js';

const MINUTE = 60_000;
const model = (doc) => toModel(doc, 0);
const green = () => model(document('amsterdam'));
const orange = (title = 'Code oranje: zware windstoten') =>
  model(
    withWarning('amsterdam', { wrschklr: 'oranje', lkop: title, ltekst: 'Zeer zware windstoten.' }),
  );

test('the first look records, it does not fire', () => {
  assert.deepEqual(newWarnings(null, orange()), []);
});

test('a warning in force fires once, when it starts or is replaced', () => {
  assert.deepEqual(newWarnings(seenWarnings(green()), orange()), [{ phase: 'current', level: 2 }]);
  assert.deepEqual(newWarnings(seenWarnings(orange()), orange()), [], 'the same warning');
  assert.deepEqual(
    newWarnings(seenWarnings(orange()), orange('Code oranje: gladheid')),
    [{ phase: 'current', level: 2 }],
    'another orange warning',
  );
  const yellow = model(withWarning('amsterdam', { wrschklr: 'geel', lkop: 'Code geel' }));
  assert.deepEqual(newWarnings(seenWarnings(orange()), green()), [], 'the end is no new warning');
  assert.deepEqual(newWarnings(seenWarnings(green()), yellow), [{ phase: 'current', level: 1 }]);
});

test('an announced warning fires once per colour and start', () => {
  const announced = model(document('alarm'));
  assert.deepEqual(newWarnings(seenWarnings(green()), announced), [
    { phase: 'upcoming', level: 1 },
  ]);
  assert.deepEqual(newWarnings(seenWarnings(announced), announced), []);
  const later = model(withWarning('alarm', { wrsch_gts: 1708707600, wrsch_gc: 'oranje' }));
  assert.deepEqual(newWarnings(seenWarnings(announced), later), [{ phase: 'upcoming', level: 2 }]);
});

test('the scene event carries the filters and the declared variables', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1754137084 * 1000 });
  const dataDir = mkdtempSync(join(tmpdir(), 'gladys-knmi-'));
  const world = await createWorld({ timers: true, dataDir });
  t.after(() => world.stop());
  await createAll(world);
  await settle(world.app);
  assert.deepEqual(world.gladys.fake.sceneEvents, []);

  world.weerlive.routes.Amsterdam = withWarning('amsterdam', {
    wrschklr: 'oranje',
    lkop: 'Code oranje',
    ltekst: 'Zware windstoten tot 100 km/u.',
  });
  t.mock.timers.tick(10 * MINUTE);
  await settle(world.app);
  assert.deepEqual(world.gladys.fake.sceneEvents, [
    {
      key: 'knmi_warning',
      data: {
        device: 'ext:test-integration:place:city-amsterdam',
        level: 'orange',
        phase: 'current',
        place: 'Amsterdam',
        level_number: 2,
        title: 'Code oranje',
        text: 'Zware windstoten tot 100 km/u.',
        starts_at: '2025-08-02T12:18:04.000Z',
      },
    },
  ]);
  assert.equal(
    world.gladys.fake.lastState('ext:test-integration:place:city-amsterdam:warning_level'),
    2,
  );

  // Restarted while the warning lasts: nothing fires again.
  await world.stop();
  t.mock.timers.tick(10 * MINUTE);
  const again = await createWorld({
    timers: true,
    dataDir,
    devices: world.gladys.fake.discoveredDevices,
    routes: world.weerlive.routes,
  });
  t.after(() => again.stop());
  await settle(again.app);
  assert.equal(again.weerlive.calls.length, 1);
  assert.deepEqual(again.gladys.fake.sceneEvents, []);
});

test('no event for a place whose device was not added', async () => {
  const world = await createWorld({
    config: { api_key: API_KEY, places: 'Amsterdam' },
    routes: { Amsterdam: document('amsterdam') },
  });
  world.weerlive.routes.Amsterdam = document('alarm');
  await world.gladys.fake.action('test_connection', {});
  assert.deepEqual(world.gladys.fake.sceneEvents, []);
});
