// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTION_KEYS, SCENE_TRIGGER_KEYS, WIDGET_KEYS } from '../src/app.js';
import { DEFAULT_CONFIG, LANGUAGES, REFRESH_MINUTES } from '../src/config.js';
import { WARNING_COLORS } from '../src/model.js';
import { eventData } from '../src/warnings.js';
import { createWorld } from './helpers/world.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

const allFields = [
  ...manifest.config_schema,
  ...[...(manifest.actions ?? []), ...(manifest.scene_triggers ?? [])].flatMap(
    (item) => item.fields ?? [],
  ),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

test('identity: KNMI, weather (environment), cloud only, the house location requested', () => {
  assert.equal(manifest.type, 'device');
  assert.equal(manifest.name, 'KNMI');
  assert.deepEqual(manifest.categories, ['environment']);
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.equal(manifest.location, true, 'getHouses() needs it');
  assert.equal(manifest.docker_image, `ghcr.io/guim31/gladys-knmi:${manifest.version}`);
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('source "houses" and the capability fields require Gladys >= 5.2.0', () => {
  assert.ok(allFields.some((field) => field.source === 'houses'));
  assert.ok(isAtLeast(minGladysVersion(), [5, 2, 0]), manifest.gladys_version);
});

test('every action, trigger and widget of the manifest has its handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions), ACTION_KEYS);
  assert.deepEqual(keysOf(manifest.scene_triggers), SCENE_TRIGGER_KEYS);
  assert.deepEqual(keysOf(manifest.widgets), WIDGET_KEYS);
  assert.equal(manifest.scene_actions, undefined);
});

test('the handlers are registered on the Gladys client', async () => {
  const world = await createWorld({ config: {} });
  const ack = await world.gladys.fake.widgetGet('knmi_forecast', { settings: {} });
  assert.equal(ack.success, true);
  assert.equal((await world.gladys.fake.action('test_connection', {})).success, true);
});

test('config_schema defaults and options match the code', () => {
  const fields = Object.fromEntries(manifest.config_schema.map((field) => [field.key, field]));
  for (const field of manifest.config_schema) {
    if (field.default !== undefined) {
      assert.equal(DEFAULT_CONFIG[field.key], field.default, field.key);
    }
  }
  assert.deepEqual(
    fields.refresh_minutes.options.map((option) => option.value),
    REFRESH_MINUTES.map(String),
  );
  assert.deepEqual(
    fields.language.options.map((option) => option.value),
    LANGUAGES,
  );
  assert.equal(fields.api_key.type, 'secret');
  for (const section of manifest.config_schema.filter((f) => f.type === 'section')) {
    assert.equal(section.default, undefined);
    assert.ok(!(section.key in DEFAULT_CONFIG));
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('the trigger filters and variables match the event data', () => {
  const [trigger] = manifest.scene_triggers;
  const data = eventData({
    deviceExternalId: 'ext:x:place:a',
    placeLabel: 'A',
    model: { warning: { title: 't', text: 'x' }, next: { at: null }, observedAt: 1 },
    event: { phase: 'current', level: 2 },
  });
  for (const field of trigger.fields) {
    assert.ok(field.key in data, `filter ${field.key} is not in the event`);
  }
  assert.deepEqual(
    Object.keys(data).sort(),
    [...new Set([...keysOf(trigger.fields), ...keysOf(trigger.variables)])].sort(),
  );
  const levels = trigger.fields.find((field) => field.key === 'level');
  assert.deepEqual(
    levels.options.map((option) => option.value),
    WARNING_COLORS.slice(1),
  );
  for (const variable of trigger.variables) {
    assert.equal(typeof data[variable.key], variable.type, variable.key);
  }
});

test('dynamic selects declare a source and no static options', () => {
  for (const field of allFields.filter((f) => f.source !== undefined)) {
    assert.ok(['devices', 'houses'].includes(field.source));
    assert.equal(field.options, undefined, field.key);
    assert.equal(field.default, undefined, field.key);
  }
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});

test('the manifest says the integration is not affiliated with KNMI nor Weerlive', () => {
  const intro = manifest.config_schema.find((field) => field.key === 'intro');
  assert.match(intro.description.en, /Not affiliated with KNMI or Weerlive/);
});
