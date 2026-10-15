// -----------------------------------------------------------------------------
// Conformity with the Gladys core, on every device discovered from realistic
// fixtures (real Weerlive answers: Amsterdam, Groningen, an announced warning,
// an answer with missing values), for a Gladys house and typed places, in
// every feature-name language.
//
// The table (test/fixtures/gladys-feature-table.json) is extracted from the
// core code: a category/type couple missing there shows as "undefined" or
// without icon in Gladys, a poll frequency outside its list is a 400 on
// discovery, a feature without min/max is a 422 on "Add to Gladys".
// Do not loosen this test to make it pass: fix the integration.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { API_KEY, createAll, createWorld, document, fixture } from './helpers/world.js';

const table = JSON.parse(
  await readFile(new URL('./fixtures/gladys-feature-table.json', import.meta.url), 'utf8'),
);

const routes = {
  '52.37,4.89': document('amsterdam'),
  Groningen: document('groningen'),
  Purmerend: document('alarm'),
  Zwolle: fixture('invalid.json'),
};
const places = 'Groningen; Purmerend; Zwolle; 52.09,5.12';

const scenarios = [
  { label: 'French names (default)', config: {} },
  { label: 'English names', config: { language: 'en' } },
  { label: 'German names', config: { language: 'de' } },
  { label: 'Spanish names', config: { language: 'es' } },
];

for (const scenario of scenarios) {
  test(`every discovered device follows the Gladys rules (${scenario.label})`, async () => {
    const world = await createWorld({
      config: { api_key: API_KEY, house: 'huis', places, ...scenario.config },
      routes: { ...routes, '52.09,5.12': document('groningen') },
    });
    try {
      const devices = world.gladys.fake.discoveredDevices;
      assert.equal(devices.length, 5, 'the house and four typed places');
      // Every state of every place is accepted by the fake Gladys (numbers or texts).
      await createAll(world);
      assert.ok(world.gladys.fake.states.length >= 80);

      const deviceIds = new Set();
      for (const device of devices) {
        const where = device.name;
        assert.ok(!deviceIds.has(device.external_id), `${where}: duplicate device external_id`);
        deviceIds.add(device.external_id);

        // should_poll: true if and only if poll_frequency is provided, in ms.
        if (device.poll_frequency === undefined) {
          assert.notEqual(device.should_poll, true, `${where}: should_poll without poll_frequency`);
        } else {
          assert.equal(device.should_poll, true, `${where}: poll_frequency without should_poll`);
          assert.ok(
            table.poll_frequencies_ms.includes(device.poll_frequency),
            `${where}: poll_frequency ${device.poll_frequency} is not one of ${table.poll_frequencies_ms}`,
          );
        }

        assert.ok(device.features.length > 0, `${where}: no feature`);
        const externalIds = new Set();
        const names = new Set();
        for (const feature of device.features) {
          const at = `${where} / ${feature.name}`;
          const pair = table.pairs[`${feature.category}/${feature.type}`];
          assert.ok(
            pair,
            `${at}: ${feature.category}/${feature.type} is not a couple Gladys knows`,
          );
          assert.ok(
            pair.label_en && pair.label_fr && pair.icon,
            `${at}: couple without label or icon`,
          );

          assert.equal(typeof feature.min, 'number', `${at}: min must be a number`);
          assert.equal(typeof feature.max, 'number', `${at}: max must be a number`);
          assert.ok(
            Number.isFinite(feature.min) && Number.isFinite(feature.max),
            `${at}: finite min/max`,
          );
          assert.ok(feature.min <= feature.max, `${at}: min > max`);
          assert.equal(typeof feature.read_only, 'boolean', `${at}: read_only must be a boolean`);
          assert.equal(
            typeof feature.has_feedback,
            'boolean',
            `${at}: has_feedback must be a boolean`,
          );
          if (feature.unit !== undefined) {
            assert.ok(table.units.includes(feature.unit), `${at}: unknown unit ${feature.unit}`);
          }

          assert.ok(!externalIds.has(feature.external_id), `${at}: duplicate external_id`);
          externalIds.add(feature.external_id);
          assert.ok(!names.has(feature.name), `${at}: duplicate feature name on the device`);
          names.add(feature.name);
        }
      }

      // The published values stay within the bounds of their feature.
      const features = new Map(
        devices.flatMap((device) => device.features).map((f) => [f.external_id, f]),
      );
      for (const state of world.gladys.fake.states) {
        const feature = features.get(state.device_feature_external_id);
        assert.ok(feature, `state for an unknown feature ${state.device_feature_external_id}`);
        if (state.text !== undefined) {
          assert.equal(feature.category, 'text');
          assert.ok(state.text.length > 0, `${feature.name}: empty text`);
        } else {
          assert.ok(
            state.state >= feature.min && state.state <= feature.max,
            `${feature.name}: ${state.state} outside ${feature.min}..${feature.max}`,
          );
        }
      }
    } finally {
      await world.stop();
    }
  });
}
