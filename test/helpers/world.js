// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake Weerlive serving real
// answers (test/fixtures/weerlive), a temporary /data, and the integration
// wired on top through registerHandlers — the very wiring of index.js.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';

// LOG_LEVEL is read on every log call: keep the test output readable
// (LOG_LEVEL=debug npm test shows the integration's lines).
process.env.LOG_LEVEL ??= 'silent';

export const API_KEY = 'test-key-0123456789';

export function fixture(name) {
  return readFileSync(new URL(`../fixtures/weerlive/${name}`, import.meta.url), 'utf8');
}

export const document = (name) => JSON.parse(fixture(`${name}.json`));

/**
 * A real answer with its warning fields replaced, e.g.
 * withWarning('alarm', { wrschklr: 'oranje', lkop: 'Code oranje' }).
 */
export function withWarning(name, live) {
  const doc = document(name);
  Object.assign(doc.liveweer[0], live);
  return doc;
}

/**
 * A fake Weerlive: `routes` maps the `locatie` parameter to a document, a
 * raw text (the error sentences), a status number, or a function returning one.
 */
export function createFakeWeerlive(routes = {}) {
  const calls = [];
  const fetch = async (url) => {
    const parsed = new URL(url);
    const location = parsed.searchParams.get('locatie');
    calls.push({ location, key: parsed.searchParams.get('key'), host: parsed.host });
    let answer = routes[location] ?? routes['*'];
    if (typeof answer === 'function') {
      answer = answer(location);
    }
    if (answer instanceof Error) {
      throw answer;
    }
    if (answer === undefined) {
      return new Response('Not found', { status: 404 });
    }
    if (typeof answer === 'number') {
      return new Response('error', { status: answer });
    }
    const body = typeof answer === 'string' ? answer : JSON.stringify(answer);
    return new Response(body, { status: 200 });
  };
  return { fetch, calls, routes };
}

export const HOUSES = [
  { id: 'h1', name: 'Huis', selector: 'huis', latitude: 52.37403, longitude: 4.88969 },
  { id: 'h2', name: 'Chalet', selector: 'chalet', latitude: null, longitude: null },
];

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.routes] fake Weerlive routes
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {string} [options.dataDir]
 * @param {boolean} [options.timers]
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = { api_key: API_KEY, places: 'Amsterdam' },
  routes = { Amsterdam: document('amsterdam') },
  devices = [],
  houses = HOUSES,
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-knmi-')),
  timers = false,
  connect = true,
} = {}) {
  const weerlive = createFakeWeerlive(routes);
  const gladys = createFakeGladys({ config, devices, houses });
  const integration = registerHandlers(gladys, {
    store: new Store(dataDir),
    fetch: weerlive.fetch,
    timers,
  });
  if (connect) {
    await gladys.connect();
    await integration.ready;
  }
  return { gladys, weerlive, ...integration, dataDir };
}

/** The user adds every discovered device in Gladys. */
export async function createAll(world) {
  for (const device of world.gladys.fake.discoveredDevices) {
    await world.gladys.fake.deviceCreated(device);
  }
}

/** Let the work started by a fired timer run to its end (requests, writes under /data). */
export async function settle(app) {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.allSettled([...app.inFlight.values()]);
    await app.store.flush();
  }
}
