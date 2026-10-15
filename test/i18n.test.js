// -----------------------------------------------------------------------------
// Every text Gladys shows exists in the four languages of its interface
// (English, French, German, Spanish): the manifest, the texts of the code and
// the documentation. German says "du", never the polite "Sie"; Spanish says
// "usted".
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LANGUAGES } from '../src/config.js';
import {
  COMPASS,
  CONDITIONS,
  FEATURE_NAMES,
  IMAGE_CONDITIONS,
  LEVEL_NAMES,
  MESSAGES,
  REPORT,
  TEXT,
} from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const docs = Object.fromEntries(
  await Promise.all(
    ['en', 'fr', 'de', 'es'].map(async (lang) => [
      lang,
      await readFile(new URL(`../docs/${lang}.md`, import.meta.url), 'utf8'),
    ]),
  ),
);

const LANGS = ['en', 'fr', 'de', 'es'];
const POLITE_GERMAN = /(?<!\p{L})(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)(?!\p{L})/u;
// Spanish "tú" forms that would break the "usted" register.
const FAMILIAR_SPANISH = /(?<!\p{L})(tú|tu|tus|te|ti|contigo)(?!\p{L})/iu;

// Upper bounds, in characters: what the Gladys interface shows without cutting.
const MAX = {
  catalog: 100,
  widgetLabel: 30,
  label: 60,
  placeholder: 60,
  description: 300,
  message: 200,
  short: 60,
  featureName: 40,
};

const sorted = (keys) => [...keys].sort();

function textProblems(text, path, lang, max) {
  if (typeof text !== 'string' || text.trim() === '') {
    return [`${path} is empty`];
  }
  const found = [];
  if (text.length > max) {
    found.push(`${path} has ${text.length} characters (${max} at most)`);
  }
  if (lang === 'de' && POLITE_GERMAN.test(text)) {
    found.push(`${path} uses the polite German form: "${text}"`);
  }
  if (lang === 'es' && FAMILIAR_SPANISH.test(text)) {
    found.push(`${path} uses the familiar Spanish form: "${text}"`);
  }
  return found;
}

/** Checks one multi-language object; returns its problems. */
function problems(value, path, max) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [`${path} must be a multi-language object`];
  }
  const found = [];
  if (JSON.stringify(sorted(Object.keys(value))) !== JSON.stringify(sorted(LANGS))) {
    found.push(`${path} has [${Object.keys(value)}], expected exactly [${LANGS}]`);
  }
  for (const [lang, text] of Object.entries(value)) {
    found.push(...textProblems(text, `${path}.${lang}`, lang, max));
  }
  return found;
}

/** Every multi-language object of the manifest, with its length limit. */
function manifestTexts(root) {
  const texts = [];
  const walk = (value, path, key) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`, key));
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const isText =
      ['label', 'description', 'placeholder'].includes(key) ||
      Object.keys(value).some((child) => LANGS.includes(child));
    if (isText) {
      const max =
        path === 'manifest.description' || /^manifest\.widgets\[\d+\]\.description$/.test(path)
          ? MAX.catalog
          : /^manifest\.widgets\[\d+\]\.label$/.test(path)
            ? MAX.widgetLabel
            : /^manifest\.config_schema\[\d+\]\.description$/.test(path)
              ? 1000
              : (MAX[key] ?? MAX.label);
      texts.push({ path, value, max });
      return;
    }
    for (const [child, item] of Object.entries(value)) {
      walk(item, `${path}.${child}`, child);
    }
  };
  walk(root, 'manifest', null);
  return texts;
}

// Tables written one language at a time: same keys everywhere, no empty text.
function tableProblems(table, name, max, render = (value) => value) {
  const found = [];
  if (JSON.stringify(sorted(Object.keys(table))) !== JSON.stringify(sorted(LANGS))) {
    found.push(`${name} has [${Object.keys(table)}], expected exactly [${LANGS}]`);
  }
  for (const lang of LANGS) {
    const entries = table[lang] ?? {};
    if (
      JSON.stringify(sorted(Object.keys(entries))) !== JSON.stringify(sorted(Object.keys(table.en)))
    ) {
      found.push(`${name}.${lang} does not have the keys of ${name}.en`);
    }
    for (const [key, value] of Object.entries(entries)) {
      found.push(...textProblems(render(value), `${name}.${lang}.${key}`, lang, max));
    }
  }
  return found;
}

test('the configuration offers the four languages', () => {
  assert.deepEqual(LANGUAGES, LANGS);
});

test('every text of the manifest is in English, French, German and Spanish', () => {
  const texts = manifestTexts(manifest);
  assert.ok(texts.length >= 40, `only ${texts.length} texts found in the manifest`);
  const found = texts.flatMap(({ path, value, max }) => problems(value, path, max));
  assert.deepEqual(found, []);
});

test('the name is the same in every language', () => {
  assert.equal(typeof manifest.name, 'string');
  assert.ok(manifest.name.length >= 3 && manifest.name.length <= 30);
});

test('the feature names, conditions and short texts exist in every language', () => {
  assert.deepEqual(
    [
      ...tableProblems(FEATURE_NAMES, 'FEATURE_NAMES', MAX.featureName),
      ...tableProblems(CONDITIONS, 'CONDITIONS', MAX.featureName),
      ...tableProblems(TEXT, 'TEXT', MAX.short),
    ],
    [],
  );
  for (const key of Object.values(IMAGE_CONDITIONS)) {
    assert.ok(CONDITIONS.en[key], `condition ${key}`);
  }
  for (const lang of LANGS) {
    assert.equal(LEVEL_NAMES[lang].length, 4);
    assert.equal(COMPASS[lang].length, 16);
  }
});

test('every message of the code has the four languages', () => {
  const found = Object.entries(MESSAGES).flatMap(([key, value]) =>
    problems(value, `MESSAGES.${key}`, MAX.message),
  );
  const render = (value) => (typeof value === 'function' ? value('Huis', 'Utrecht', 120) : value);
  found.push(...tableProblems(REPORT, 'REPORT', MAX.message, render));
  assert.deepEqual(found, []);
});

// --- Documentation ------------------------------------------------------------

const headings = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => /^#{1,3} /.test(line))
    .map((line) => line.match(/^#+/)[0].length);

test('the four documentations have the same sections', () => {
  const reference = headings(docs.en);
  assert.ok(
    reference.filter((level) => level === 2).length >= 9,
    'presentation, prerequisites, configuration, devices, widget, trigger, scenes, troubleshooting, limits',
  );
  for (const lang of LANGS) {
    assert.deepEqual(headings(docs[lang]), reference, `docs/${lang}.md sections`);
    assert.ok(docs[lang].length >= 3000, `docs/${lang}.md is too short`);
  }
});

test('the documentation says it was developed without the account and is not affiliated', () => {
  assert.match(docs.en, /Developed without .*feedback welcome/i);
  assert.match(docs.en, /not affiliated with KNMI/i);
  assert.match(docs.fr, /sans lien avec le KNMI/i);
  assert.match(docs.de, /keine Verbindung zu KNMI/i);
  assert.match(docs.es, /no tiene relación con el KNMI/i);
  assert.ok(!POLITE_GERMAN.test(docs.de), 'docs/de.md uses the polite form');
});

test('the guard catches a missing language, an empty text and the wrong register', () => {
  assert.equal(problems({ en: 'Light', fr: 'Éclairage', de: 'Licht' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'Light', fr: 'Éclairage', de: '', es: 'Luz' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a'.repeat(61), es: 'a' }, 'x', 60).length, 1);
  for (const polite of ['Wählen Sie', 'Ihr Gerät', 'mit Ihrem']) {
    assert.equal(problems({ en: 'a', fr: 'a', de: polite, es: 'a' }, 'x', 60).length, 1, polite);
  }
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a', es: 'Elige tu casa' }, 'x', 60).length, 1);
  assert.deepEqual(
    problems({ en: 'a', fr: 'a', de: 'Siebenschläfer', es: 'Elija su casa' }, 'x', 60),
    [],
  );
  const forgotten = structuredClone(manifest);
  delete forgotten.scene_triggers[0].fields[1].label.de;
  const found = manifestTexts(forgotten).flatMap(({ path, value, max }) =>
    problems(value, path, max),
  );
  assert.deepEqual(found, [
    'manifest.scene_triggers[0].fields[1].label has [en,fr,es], expected exactly [en,fr,de,es]',
  ]);
});
