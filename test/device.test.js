import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { FEATURES, MAX_TEXT_LENGTH, buildDevice, buildStates } from '../src/device.js';
import { toModel } from '../src/model.js';
import { parseBody } from '../src/weerlive.js';
import { document, fixture, withWarning } from './helpers/world.js';

const gladys = createFakeGladys();
const place = { id: 'city-amsterdam', label: 'Amsterdam', query: 'Amsterdam' };
const NOW = 1754137084 * 1000;

const valuesOf = (states) =>
  Object.fromEntries(
    states.map((s) => [s.device_feature_external_id.split(':').pop(), s.text ?? s.state]),
  );

test('one read-only device per place, its id built from the place', () => {
  const device = buildDevice(gladys, place, 'en');
  assert.equal(device.external_id, 'ext:test-integration:place:city-amsterdam');
  assert.equal(device.name, 'KNMI Amsterdam');
  assert.equal(device.features.length, FEATURES.length);
  assert.ok(device.features.every((feature) => feature.read_only === true));
  assert.ok(
    device.features.every((feature) => feature.external_id.startsWith(`${device.external_id}:`)),
  );
});

test('the states of a real answer, in English', () => {
  const states = buildStates(gladys, place, toModel(document('amsterdam'), NOW), 'en', NOW);
  assert.deepEqual(valuesOf(states), {
    temperature: 19.1,
    feels_like: 16.5,
    humidity: 70,
    pressure: 1014.41,
    wind_beaufort: 4,
    wind_speed: 28.6,
    wind_direction: 313,
    visibility: 34.1,
    precipitation_next_hour: 0,
    conditions: 'Cloudy',
    sunrise: '06:01',
    sunset: '21:32',
    warning_level: 0,
    warning_title: 'Er zijn geen waarschuwingen',
    warning_text: 'Er zijn momenteel geen waarschuwingen van kracht.',
    weather_alarm: 0,
    next_warning_level: 0,
    next_warning_time: 'None',
  });
});

test('an announced warning, in French: level and local start time', () => {
  const now = 1707944883 * 1000;
  const values = valuesOf(buildStates(gladys, place, toModel(document('alarm'), now), 'fr', now));
  assert.equal(values.weather_alarm, 1);
  assert.equal(values.next_warning_level, 1);
  assert.match(values.next_warning_time, /^jeu\.? 22\/02.*18:00$/);
  assert.equal(values.conditions, 'Nuit nuageuse', 'wolkennacht, seen in real answers');
});

test('a missing value is left out, the text states are never empty nor too long', () => {
  const now = 1711718284 * 1000;
  const values = valuesOf(
    buildStates(gladys, place, toModel(parseBody(fixture('invalid.json')), now), 'de', now),
  );
  assert.equal(values.pressure, undefined);
  assert.equal(values.temperature, 12.2);

  const long = withWarning('alarm', { ltekst: 'x'.repeat(2000), lkop: '   ' });
  const states = buildStates(gladys, place, toModel(long, now), 'es', now);
  const texts = states.filter((s) => s.text !== undefined);
  assert.ok(texts.every((s) => s.text.length > 0 && s.text.length <= MAX_TEXT_LENGTH));
  assert.equal(valuesOf(states).warning_title, undefined, 'a blank title is not published');
});
