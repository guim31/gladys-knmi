// -----------------------------------------------------------------------------
// Dashboard widget "KNMI forecast": the place's live tiles, the KNMI warning in
// force and the next one, sunrise / sunset, and the 5-day forecast.
//
// The content is built from the last reading kept by the integration: showing
// the widget never spends a request of the daily quota. Core budget: 8
// components at most, 2 texts, 1 focal (the day list), 1 status.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { TEXT, LEVEL_NAMES, conditionsLabel, compass, formatDateTime, formatDay } from './i18n.js';

export const WIDGET_KEY = 'knmi_forecast';
export const WIDGET_TTL_SECONDS = 600;

const LEVEL_COLORS = [
  WIDGET_COLORS.SUCCESS,
  WIDGET_COLORS.WARNING,
  WIDGET_COLORS.WARNING,
  WIDGET_COLORS.DANGER,
];

const message = (text) => ({
  ttl_seconds: 60,
  components: [{ type: 'text', variant: 'body', text }],
});

export const pickPlaceContent = (language) => message(TEXT[language].pickPlace);
export const unknownPlaceContent = (language) => message(TEXT[language].unknownPlace);
export const waitingContent = (language) => message(TEXT[language].waiting);

const degrees = (value) => (value === null ? '–' : `${Math.round(value)}°`);

function dayItem(day, language) {
  const conditions = conditionsLabel(day.image, language, '') || '';
  const parts = [`${degrees(day.min)} / ${degrees(day.max)}`];
  if (day.rainChance !== null) {
    parts.push(`${TEXT[language].rain} ${day.rainChance} %`);
  }
  if (day.windBeaufort !== null) {
    const direction = compass(day.windDirection, language);
    parts.push(`${TEXT[language].wind} ${direction ? `${direction} ` : ''}${day.windBeaufort} Bft`);
  }
  return {
    title: conditions
      ? `${formatDay(day.day, language)} · ${conditions}`
      : formatDay(day.day, language),
    subtitle: parts.join(' · '),
  };
}

/**
 * @param {object} options
 * @param {string} options.deviceExternalId
 * @param {string} options.label place label
 * @param {object} options.model last reading
 * @param {string} options.language
 */
export function buildForecastContent({ deviceExternalId, label, model, language }) {
  const text = TEXT[language];
  const feature = (key) => `${deviceExternalId}:${key}`;
  const level = model.warning.level ?? 0;
  const conditions = conditionsLabel(model.image, language, model.summary);
  const components = [
    {
      type: 'text',
      variant: 'heading',
      text: conditions ? `${label} · ${conditions}` : label,
    },
    { type: 'value', label: text.temperature, device_feature: feature('temperature') },
    { type: 'value', label: text.feelsLike, device_feature: feature('feels_like') },
    { type: 'value', label: text.wind, device_feature: feature('wind_speed') },
  ];

  const items = [
    {
      label: text.warningNow,
      value: LEVEL_NAMES[language][level],
      color: LEVEL_COLORS[level],
      icon: level >= 1 ? 'alert-triangle' : 'check-circle',
    },
  ];
  if (model.next.at !== null && model.next.level >= 1) {
    items.push({
      label: text.warningNext,
      value: `${LEVEL_NAMES[language][model.next.level]} · ${formatDateTime(model.next.at, language)}`,
      color: LEVEL_COLORS[model.next.level],
      icon: 'clock',
    });
  }
  if (model.sunrise && model.sunset) {
    items.push({ label: text.sun, value: `↑ ${model.sunrise} · ↓ ${model.sunset}`, icon: 'sun' });
  }

  const days = model.daily.slice(0, 5).map((day) => dayItem(day, language));
  if (days.length > 0) {
    components.push({ type: 'card-list', display: 'list', items: days });
  }
  components.push({ type: 'status', items });

  // The KNMI text (Dutch) only when there is something to say.
  if ((level >= 1 || model.warning.alarm) && model.warning.title) {
    const body = model.warning.text
      ? `${model.warning.title}\n${model.warning.text}`
      : model.warning.title;
    components.push({ type: 'text', variant: 'body', text: body.slice(0, 300) });
  }

  return { ttl_seconds: WIDGET_TTL_SECONDS, components };
}
