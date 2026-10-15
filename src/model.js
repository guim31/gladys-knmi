// -----------------------------------------------------------------------------
// From a raw Weerlive document to the values the integration publishes.
//
// Field names are the Dutch ones of the API (golles/python-weerlive maps them,
// MIT): temp, gtemp (feels like), lv (humidity), luchtd (hPa), windbft,
// windkmh, windrgr (degrees), zicht (metres), sup / sunder (sunrise / sunset,
// local time of the Netherlands), wrschklr (KNMI warning colour), lkop / ltekst
// (warning title and text, in Dutch), alarm, wrsch_gts / wrsch_gc (start and
// colour of the next warning). A missing value ("_", "-", null) becomes null:
// that feature is not published this time, the others are.
// -----------------------------------------------------------------------------

export const API_TIMEZONE = 'Europe/Amsterdam';

// KNMI warning colours, in order: the published level (0-3).
export const WARNING_COLORS = ['green', 'yellow', 'orange', 'red'];
const DUTCH_COLORS = { groen: 0, geel: 1, oranje: 2, rood: 3 };

/** @returns {number|null} 0 (green) to 3 (red), null when unknown */
export function warningLevel(code) {
  if (typeof code !== 'string') {
    return null;
  }
  const level = DUTCH_COLORS[code.trim().toLowerCase()];
  return level ?? null;
}

function number(value) {
  if (value === null || value === undefined || value === '' || value === '-' || value === '_') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '_' ? null : trimmed;
}

function clockTime(value) {
  const trimmed = text(value);
  return trimmed && /^\d{1,2}:\d{2}$/.test(trimmed) ? trimmed.padStart(5, '0') : null;
}

/** "14-02-2024" -> "2024-02-14" */
function isoDay(value) {
  const match = text(value)?.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

const round = (value, digits = 1) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * @param {object} document raw Weerlive answer
 * @param {number} fetchedAt ms timestamp of the request
 */
export function toModel(document, fetchedAt) {
  const live = document.liveweer?.[0] ?? {};
  const api = document.api?.[0] ?? {};
  const visibility = number(live.zicht);
  const hourly = (document.uur_verw ?? [])
    .map((hour) => ({
      timestamp: number(hour.timestamp),
      image: text(hour.image),
      temperature: number(hour.temp),
      precipitation: number(hour.neersl),
      windBeaufort: number(hour.windbft),
    }))
    .filter((hour) => hour.timestamp !== null);
  const daily = (document.wk_verw ?? [])
    .map((day) => ({
      day: isoDay(day.dag),
      image: text(day.image),
      min: number(day.min_temp),
      max: number(day.max_temp),
      windBeaufort: number(day.windbft),
      windDirection: number(day.windrgr),
      rainChance: number(day.neersl_perc_dag),
      sunChance: number(day.zond_perc_dag),
    }))
    .filter((day) => day.day !== null);
  const nextLevel = warningLevel(live.wrsch_gc);
  const nextAt = number(live.wrsch_gts);
  return {
    fetchedAt,
    place: text(live.plaats),
    observedAt: number(live.timestamp),
    image: text(live.image),
    summary: text(live.samenv),
    forecastText: text(live.verw),
    temperature: number(live.temp),
    feelsLike: number(live.gtemp),
    humidity: number(live.lv),
    pressure: number(live.luchtd),
    windBeaufort: number(live.windbft),
    windSpeed: number(live.windkmh),
    windDirection: number(live.windrgr),
    visibility: visibility === null ? null : round(visibility / 1000),
    sunrise: clockTime(live.sup),
    sunset: clockTime(live.sunder),
    warning: {
      level: warningLevel(live.wrschklr),
      alarm: number(live.alarm) === null ? null : number(live.alarm) > 0,
      title: text(live.lkop),
      text: text(live.ltekst),
    },
    next: {
      level: nextLevel !== null && nextAt !== null && nextAt > 0 ? nextLevel : 0,
      at: nextLevel !== null && nextAt !== null && nextAt > 0 ? nextAt : null,
    },
    hourly,
    daily,
    quota: { max: number(api.max_verz), remaining: number(api.rest_verz) },
  };
}

/**
 * Precipitation forecast for the hour in progress (mm): the first hourly slot
 * that has not ended yet.
 * @param {object} model
 * @param {number} now ms
 */
export function precipitationNextHour(model, now) {
  const slot = model.hourly.find((hour) => (hour.timestamp + 3600) * 1000 > now);
  return slot?.precipitation ?? null;
}
