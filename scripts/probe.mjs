#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Probe of the real Weerlive API with the integration's own client, read-only.
//
//   node scripts/probe.mjs [place]                 # a fake key: expects the refusal
//   WEERLIVE_KEY=... node scripts/probe.mjs Utrecht # a real key: one reading
//
// It prints what the integration would understand of the answer, never the
// key nor the request URL. Each run spends one request of the key's daily
// quota (300). The coding sessions of this repository have no network access
// to weerlive.nl: this script is meant to be run from a machine that has.
// Behind an HTTP proxy, Node's fetch needs NODE_USE_ENV_PROXY=1 (Node 24).
// -----------------------------------------------------------------------------

import { fetchWeather } from '../src/weerlive.js';
import { toModel } from '../src/model.js';
import { buildStates } from '../src/device.js';

const FAKE_KEY = 'gladys-knmi-probe-not-a-key';
const key = process.env.WEERLIVE_KEY?.trim() || FAKE_KEY;
const place = process.argv[2] ?? 'Amsterdam';
const usingFake = key === FAKE_KEY;

console.log(
  `Weerlive probe — place "${place}", ${usingFake ? 'fake key' : 'key from WEERLIVE_KEY'}`,
);

try {
  const started = Date.now();
  const document = await fetchWeather({ apiKey: key, location: place });
  const model = toModel(document, Date.now());
  console.log(`Answer in ${Date.now() - started} ms`);
  if (usingFake) {
    console.log('UNEXPECTED: the fake key was accepted.');
  }
  const ids = { externalIds: (type, id) => ({ feature: (k) => `${type}:${id}:${k}` }) };
  const states = buildStates(ids, { id: 'probe' }, model, 'en', Date.now());
  console.log(
    JSON.stringify(
      {
        place_found: model.place,
        observed_at: model.observedAt ? new Date(model.observedAt * 1000).toISOString() : null,
        warning: model.warning,
        next_warning: model.next,
        quota: model.quota,
        hourly: model.hourly.length,
        daily: model.daily.length,
        states: Object.fromEntries(
          states.map((s) => [s.device_feature_external_id.split(':').pop(), s.text ?? s.state]),
        ),
        top_level_keys: Object.keys(document),
        live_keys: Object.keys(document.liveweer[0]),
      },
      null,
      2,
    ),
  );
  process.exitCode = usingFake ? 1 : 0;
} catch (err) {
  console.log(`Refused: ${err.code ?? 'error'} — ${err.message}`);
  const expected = usingFake && err.code === 'invalid_key';
  console.log(expected ? 'OK: the fake key is refused as expected.' : 'Unexpected failure.');
  process.exitCode = expected ? 0 : 1;
}
