// -----------------------------------------------------------------------------
// One Gladys device per followed place, and the states of its features.
//
// Every feature is read-only. Feature keys are forever (the external ids of
// the history, the scenes and the dashboards are built on them): add new keys,
// never rename one.
// -----------------------------------------------------------------------------

import { DEVICE_POLL_FREQUENCIES } from '@gladysassistant/integration-sdk';
import { FEATURE_NAMES, TEXT, conditionsLabel, formatDateTime } from './i18n.js';
import { precipitationNextHour } from './model.js';

export const DEVICE_TYPE = 'place';

// Text states are capped: the KNMI warning text is a paragraph, not a page.
export const MAX_TEXT_LENGTH = 500;

// The order of the Gladys device page.
export const FEATURES = [
  {
    key: 'temperature',
    category: 'temperature-sensor',
    type: 'decimal',
    unit: 'celsius',
    min: -50,
    max: 60,
  },
  {
    key: 'feels_like',
    category: 'temperature-sensor',
    type: 'decimal',
    unit: 'celsius',
    min: -60,
    max: 60,
  },
  {
    key: 'humidity',
    category: 'humidity-sensor',
    type: 'decimal',
    unit: 'percent',
    min: 0,
    max: 100,
  },
  {
    key: 'pressure',
    category: 'pressure-sensor',
    type: 'decimal',
    unit: 'hPa',
    min: 900,
    max: 1100,
  },
  { key: 'wind_beaufort', category: 'speed-sensor', type: 'integer', min: 0, max: 12 },
  {
    key: 'wind_speed',
    category: 'speed-sensor',
    type: 'decimal',
    unit: 'kilometer-per-hour',
    min: 0,
    max: 250,
  },
  {
    key: 'wind_direction',
    category: 'angle-sensor',
    type: 'integer',
    unit: 'degree',
    min: 0,
    max: 360,
  },
  { key: 'visibility', category: 'distance-sensor', type: 'decimal', unit: 'km', min: 0, max: 100 },
  {
    key: 'precipitation_next_hour',
    category: 'precipitation-sensor',
    type: 'decimal',
    unit: 'millimeter-per-hour',
    min: 0,
    max: 100,
  },
  { key: 'conditions', category: 'text', type: 'text', min: 0, max: 0 },
  { key: 'sunrise', category: 'text', type: 'text', min: 0, max: 0 },
  { key: 'sunset', category: 'text', type: 'text', min: 0, max: 0 },
  // 0 green, 1 yellow, 2 orange, 3 red: a scene compares it with "≥ 2".
  { key: 'warning_level', category: 'risk', type: 'integer', min: 0, max: 3 },
  { key: 'warning_title', category: 'text', type: 'text', min: 0, max: 0 },
  { key: 'warning_text', category: 'text', type: 'text', min: 0, max: 0 },
  { key: 'weather_alarm', category: 'input', type: 'binary', min: 0, max: 1 },
  { key: 'next_warning_level', category: 'risk', type: 'integer', min: 0, max: 3 },
  { key: 'next_warning_time', category: 'text', type: 'text', min: 0, max: 0 },
];

export const deviceIds = (gladys, place) => gladys.externalIds(DEVICE_TYPE, place.id);

/**
 * @param {object} gladys
 * @param {{ id, label }} place
 * @param {string} language feature names, fixed at creation
 */
export function buildDevice(gladys, place, language) {
  const ids = deviceIds(gladys, place);
  return {
    name: `KNMI ${place.label}`,
    external_id: ids.device,
    // The container refreshes by itself (Gladys#3198); the core's poll is a
    // fallback that the poller skips while its own timer runs.
    should_poll: true,
    poll_frequency: DEVICE_POLL_FREQUENCIES.EVERY_MINUTES,
    params: [{ name: 'place', value: place.query }],
    features: FEATURES.map((feature) => ({
      name: FEATURE_NAMES[language][feature.key],
      external_id: ids.feature(feature.key),
      category: feature.category,
      type: feature.type,
      ...(feature.unit ? { unit: feature.unit } : {}),
      min: feature.min,
      max: feature.max,
      read_only: true,
      has_feedback: false,
      keep_history: feature.category !== 'text',
    })),
  };
}

const clip = (value) =>
  value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH - 1)}…` : value;

/**
 * The values of one place, in the publishStates format. A value the answer
 * does not carry is left out: Gladys keeps the previous one.
 * @param {object} gladys
 * @param {{ id }} place
 * @param {object} model from toModel()
 * @param {string} language
 * @param {number} now ms
 */
export function buildStates(gladys, place, model, language, now) {
  const ids = deviceIds(gladys, place);
  const none = TEXT[language].none;
  const values = {
    temperature: model.temperature,
    feels_like: model.feelsLike,
    humidity: model.humidity,
    pressure: model.pressure,
    wind_beaufort: model.windBeaufort === null ? null : Math.round(model.windBeaufort),
    wind_speed: model.windSpeed,
    wind_direction: model.windDirection === null ? null : Math.round(model.windDirection) % 360,
    visibility: model.visibility,
    precipitation_next_hour: precipitationNextHour(model, now),
    conditions: conditionsLabel(model.image, language, model.summary),
    sunrise: model.sunrise,
    sunset: model.sunset,
    warning_level: model.warning.level,
    warning_title: model.warning.title,
    warning_text: model.warning.text,
    weather_alarm: model.warning.alarm === null ? null : Number(model.warning.alarm),
    next_warning_level: model.next.level,
    next_warning_time: model.next.at === null ? none : formatDateTime(model.next.at, language),
  };
  const states = [];
  for (const feature of FEATURES) {
    const value = values[feature.key];
    if (value === null || value === undefined) {
      continue;
    }
    const id = ids.feature(feature.key);
    states.push(
      feature.category === 'text'
        ? { device_feature_external_id: id, text: clip(String(value)) }
        : { device_feature_external_id: id, state: value },
    );
  }
  return states;
}
