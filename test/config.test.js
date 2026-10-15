import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  effectiveMinutes,
  normalizeConfig,
  parsePlaces,
  resolvePlaces,
} from '../src/config.js';
import { HOUSES } from './helpers/world.js';

test('the defaults: French texts, a reading every 10 minutes, nothing to follow', () => {
  assert.deepEqual(normalizeConfig(), {
    api_key: '',
    house: '',
    places: '',
    refresh_minutes: 10,
    language: 'fr',
  });
  assert.equal(DEFAULT_CONFIG.language, 'fr');
});

test('values from the form are trimmed and checked', () => {
  const config = normalizeConfig({
    api_key: '  abc ',
    refresh_minutes: '30',
    language: 'de',
    places: ' Utrecht ',
  });
  assert.equal(config.api_key, 'abc');
  assert.equal(config.refresh_minutes, 30);
  assert.equal(config.language, 'de');
  assert.equal(config.places, 'Utrecht');
  assert.equal(normalizeConfig({ refresh_minutes: '1' }).refresh_minutes, 10);
  assert.equal(normalizeConfig({ language: 'nl' }).language, 'fr');
});

test('the pace slows down with the number of places, to stay within the quota', () => {
  assert.equal(effectiveMinutes(10, 1), 10);
  assert.equal(effectiveMinutes(10, 2), 12);
  assert.equal(effectiveMinutes(10, 5), 30);
  assert.equal(effectiveMinutes(60, 5), 60);
  for (let places = 1; places <= 5; places += 1) {
    const perDay = (places * 24 * 60) / effectiveMinutes(10, places);
    assert.ok(perDay <= 240, `${places} places: ${perDay} requests a day`);
  }
});

test('typed places: towns and coordinates, with stable ids', () => {
  const { places, invalid } = parsePlaces(
    "Amsterdam; 's-Hertogenbosch\nDen Haag ; 52,091 5,122;52.0907,5.1214;999,999",
  );
  assert.deepEqual(
    places.map((place) => [place.id, place.query]),
    [
      ['city-amsterdam', 'Amsterdam'],
      ['city-s-hertogenbosch', "'s-Hertogenbosch"],
      ['city-den-haag', 'Den Haag'],
      ['geo-52-09_5-12', '52.09,5.12'],
      ['geo-52-09_5-12', '52.09,5.12'],
    ],
  );
  assert.deepEqual(invalid, ['999,999']);
});

test('the Gladys house comes first, duplicates go, five places at most', () => {
  const result = resolvePlaces(
    normalizeConfig({ house: 'huis', places: 'Utrecht;Utrecht;Delft;Gouda;Breda;Zwolle' }),
    HOUSES,
  );
  assert.deepEqual(
    result.places.map((place) => place.id),
    ['house-huis', 'city-utrecht', 'city-delft', 'city-gouda', 'city-breda'],
  );
  assert.equal(result.places[0].label, 'Huis');
  assert.equal(result.places[0].query, '52.37,4.89', 'rounded to about 1 km');
  assert.equal(result.dropped, 1);
  assert.equal(result.unlocatedHouse, false);
});

test('a house without location, or gone, is said, not guessed', () => {
  const unlocated = resolvePlaces(normalizeConfig({ house: 'chalet' }), HOUSES);
  assert.deepEqual(unlocated.places, []);
  assert.equal(unlocated.unlocatedHouse, true);
  assert.equal(resolvePlaces(normalizeConfig({ house: 'gone' }), HOUSES).unlocatedHouse, true);
});
