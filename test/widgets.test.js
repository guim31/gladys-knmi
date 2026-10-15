import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { buildForecastContent } from '../src/widgets.js';
import { toModel } from '../src/model.js';
import { API_KEY, createAll, createWorld, document, withWarning } from './helpers/world.js';

const DEVICE = 'ext:test-integration:place:city-amsterdam';

const content = (doc, language = 'en') =>
  buildForecastContent({
    deviceExternalId: DEVICE,
    label: 'Amsterdam',
    model: toModel(doc, 0),
    language,
  });

test('the forecast fits the core vocabulary and budget, in every language and case', () => {
  const cases = [
    document('amsterdam'),
    document('alarm'),
    withWarning('alarm', { wrschklr: 'rood', lkop: 'Code rood', ltekst: 'x'.repeat(900) }),
    { liveweer: [{}], wk_verw: [], uur_verw: [] },
  ];
  for (const doc of cases) {
    for (const language of ['en', 'fr', 'de', 'es']) {
      assert.deepEqual(validateWidgetContent(content(doc, language)), [], language);
    }
  }
});

test('the forecast: live tiles, the warnings, the sun and five days', () => {
  const { components } = content(document('alarm'), 'fr');
  assert.deepEqual(
    components.map((component) => component.type),
    ['text', 'value', 'value', 'value', 'card-list', 'status', 'text'],
  );
  assert.equal(components[0].text, 'Amsterdam · Nuit nuageuse');
  const status = components.find((component) => component.type === 'status');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.color]),
    [
      ['Avertissement en cours', 'success'],
      ['Prochain avertissement', 'warning'],
      ['Soleil', undefined],
    ],
  );
  assert.match(status.items[1].value, /^Jaune · jeu/);
  const days = components.find((component) => component.type === 'card-list');
  assert.equal(days.items.length, 5);
  assert.match(days.items[0].title, /^mer\.? 14\/02 · Nuageux$/);
  assert.equal(days.items[0].subtitle, '10° / 10° · Pluie 0 % · Vent SO 4 Bft');
  assert.match(components.at(-1).text, /^Vanavond \(zeer\) zware windstoten\n/);
});

test('no warning, no KNMI text', () => {
  const { components } = content(document('amsterdam'));
  assert.equal(components.filter((component) => component.type === 'text').length, 1);
});

test('the live tiles point at features of the device', async () => {
  const world = await createWorld();
  const [device] = world.gladys.fake.discoveredDevices;
  const ids = new Set(device.features.map((feature) => feature.external_id));
  const tiles = content(document('amsterdam')).components.filter((c) => c.device_feature);
  assert.equal(tiles.length, 3);
  for (const tile of tiles) {
    assert.ok(ids.has(tile.device_feature), tile.device_feature);
  }
});

test('the widget is served from the last reading, without a request', async () => {
  const world = await createWorld({
    config: { api_key: API_KEY, places: 'Amsterdam', language: 'de' },
  });
  await createAll(world);
  const calls = world.weerlive.calls.length;

  const get = async (settings, language) =>
    (await world.gladys.fake.widgetGet('knmi_forecast', { settings, language })).data.content;
  const forecast = await get({ device: DEVICE }, 'es');
  assert.equal(forecast.components[0].text, 'Amsterdam · Nublado');
  assert.equal(world.weerlive.calls.length, calls);

  assert.match((await get({}, 'de')).components[0].text, /Wähle in den Widget-Einstellungen/);
  assert.match(
    (await get({ device: 'ext:test-integration:place:gone' }, 'fr')).components[0].text,
    /plus configuré/,
  );

  await world.gladys.fake.configUpdated({ api_key: API_KEY, places: 'Amsterdam; Utrecht' });
  const waiting = await get({ device: 'ext:test-integration:place:city-utrecht' }, 'en');
  assert.match(waiting.components[0].text, /Waiting for the first KNMI reading/);
});
