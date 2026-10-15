import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBody } from '../src/weerlive.js';
import { precipitationNextHour, toModel, warningLevel } from '../src/model.js';
import { document, fixture, withWarning } from './helpers/world.js';

const FETCHED = Date.parse('2025-08-02T12:20:00Z');

test('a real Amsterdam answer gives every value, in the published units', () => {
  const model = toModel(document('amsterdam'), FETCHED);
  assert.equal(model.place, 'Amsterdam');
  assert.equal(model.temperature, 19.1);
  assert.equal(model.feelsLike, 16.5);
  assert.equal(model.humidity, 70);
  assert.equal(model.pressure, 1014.41);
  assert.equal(model.windBeaufort, 4);
  assert.equal(model.windSpeed, 28.6);
  assert.equal(model.windDirection, 312.5);
  assert.equal(model.visibility, 34.1, 'metres become kilometres');
  assert.equal(model.sunrise, '06:01');
  assert.equal(model.sunset, '21:32');
  assert.deepEqual(model.warning, {
    level: 0,
    alarm: false,
    title: 'Er zijn geen waarschuwingen',
    text: 'Er zijn momenteel geen waarschuwingen van kracht.',
  });
  assert.deepEqual(model.next, { level: 0, at: null }, '"-" means no announced warning');
  assert.equal(model.daily.length, 5);
  assert.equal(model.daily[0].day, '2025-08-02');
  assert.equal(model.hourly.length, 24);
  assert.deepEqual(model.quota, { max: 300, remaining: 0 });
});

test('the alarm answer announces a yellow warning for later', () => {
  const model = toModel(document('alarm'), FETCHED);
  assert.equal(model.warning.alarm, true);
  assert.equal(model.warning.level, 0);
  assert.equal(model.warning.title, 'Vanavond (zeer) zware windstoten');
  assert.deepEqual(model.next, { level: 1, at: 1708621200 });
});

test('the KNMI colours map to levels 0 to 3, anything else is unknown', () => {
  assert.deepEqual(
    ['groen', 'geel', 'oranje', 'rood', 'Oranje ', '-', undefined].map(warningLevel),
    [0, 1, 2, 3, 2, null, null],
  );
  const red = toModel(withWarning('alarm', { wrschklr: 'rood' }), FETCHED);
  assert.equal(red.warning.level, 3);
});

test('a missing value is null: only that feature is skipped', () => {
  const model = toModel(parseBody(fixture('invalid.json')), FETCHED);
  assert.equal(model.pressure, null);
  assert.equal(model.temperature, 12.2);
  assert.equal(model.visibility, 100);
});

test('the coming-hour precipitation is the first hourly slot not yet over', () => {
  const model = toModel(document('alarm'), FETCHED);
  // 14-02-2024 22:08 local: the first slot is 23:00 (0 mm), then 00:00, then 01:00 (0.1 mm).
  assert.equal(precipitationNextHour(model, 1707944883 * 1000), 0);
  assert.equal(precipitationNextHour(model, (1707955200 + 60) * 1000), 0.1);
  assert.equal(precipitationNextHour(model, Date.parse('2030-01-01')), null);
});
