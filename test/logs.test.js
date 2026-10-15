// -----------------------------------------------------------------------------
// Quiet logs: nothing at info level for a normal cycle, one line when a
// problem starts and one when it ends, never the API key.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_KEY, createAll, createWorld, document, settle } from './helpers/world.js';

const MINUTE = 60_000;

/** Capture every line the loggers write, at the given level. */
function capture(t, level) {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  const lines = [];
  // The SDK logger writes through console.log (debug, info) and console.error.
  for (const stream of ['log', 'info', 'warn', 'error', 'debug']) {
    t.mock.method(console, stream, (...args) => lines.push(args.join(' ')));
  }
  return lines;
}

async function running(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1754137084 * 1000 });
  const world = await createWorld({ timers: true });
  t.after(() => world.stop());
  await createAll(world);
  await settle(world.app);
  return world;
}

async function tick(t, world, minutes) {
  for (let i = 0; i < minutes; i += 1) {
    t.mock.timers.tick(MINUTE);
    await settle(world.app);
  }
}

test('a normal refresh cycle writes nothing at info level', async (t) => {
  const world = await running(t);
  const lines = capture(t, 'info');
  world.weerlive.routes.Amsterdam.liveweer[0].temp = 21;
  await tick(t, world, 30);
  assert.ok(world.weerlive.calls.length >= 4);
  assert.deepEqual(lines, []);
});

test('a failure is said once, its end once, and the key never appears', async (t) => {
  const world = await running(t);
  const lines = capture(t, 'debug');
  world.weerlive.routes.Amsterdam = 503;
  await tick(t, world, 40);
  world.weerlive.routes.Amsterdam = document('amsterdam');
  await tick(t, world, 20);

  const at = (level) => lines.filter((line) => line.includes(`[${level}]`));
  assert.equal(at('WARN').length, 1, at('WARN').join('\n'));
  assert.match(at('WARN')[0], /Weerlive request failed \(Weerlive answered HTTP 503\)/);
  assert.equal(at('INFO').length, 1, at('INFO').join('\n'));
  assert.match(at('INFO')[0], /Weerlive answers again/);
  assert.ok(
    lines.some((line) => line.includes('[DEBUG]')),
    'the rest is in debug',
  );
  for (const line of lines) {
    assert.ok(!line.includes(API_KEY), `the key leaked: ${line}`);
    assert.ok(!line.includes('weerlive_api_v2.php'), `the URL leaked: ${line}`);
  }
  assert.deepEqual(
    world.gladys.fake.connectionStatuses.map((s) => s.connected),
    [true, false, true],
  );
});

test('nothing of the config secret reaches the logs, even in debug, even on errors', async (t) => {
  const lines = capture(t, 'debug');
  const world = await createWorld({
    config: { api_key: API_KEY, places: 'Amsterdam; Nowhere', language: 'en' },
    routes: { Amsterdam: 'Vraag eerst een API-key op' },
  });
  await createAll(world);
  await world.gladys.fake.action('test_connection', {});
  await world.stop();
  assert.ok(lines.length > 0);
  assert.ok(lines.every((line) => !line.includes(API_KEY)));
});
