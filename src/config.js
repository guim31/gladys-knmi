// -----------------------------------------------------------------------------
// Integration configuration: defaults (mirroring the manifest `config_schema`),
// normalization, and the places the user asked for.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// The refresh intervals offered in the form, in minutes. Weerlive refreshes its
// observations every 10 minutes: asking more often only spends the quota.
export const REFRESH_MINUTES = [10, 15, 20, 30, 60];

// The free Weerlive key allows 300 requests a day (`max_verz` in every
// answer). The integration plans for 240, leaving room for restarts, the
// "Test" button and the key check of a new configuration.
export const DAILY_BUDGET = 240;

// One device per place, at most: five places at the 10-minute pace would need
// 720 requests a day, so the pace slows down with the number of places.
export const MAX_PLACES = 5;

export const DEFAULT_CONFIG = {
  api_key: '',
  house: '',
  places: '',
  refresh_minutes: '10',
  language: 'fr',
};

/**
 * @param {Record<string, unknown>} [raw] config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const minutes = Number.parseInt(raw.refresh_minutes ?? DEFAULT_CONFIG.refresh_minutes, 10);
  return {
    api_key: text(raw.api_key),
    house: text(raw.house),
    places: text(raw.places),
    refresh_minutes: REFRESH_MINUTES.includes(minutes) ? minutes : REFRESH_MINUTES[0],
    language: LANGUAGES.includes(raw.language) ? raw.language : DEFAULT_CONFIG.language,
  };
}

export const isConfigured = (config) => config.api_key !== '';

/**
 * Minutes between two reads of one place: the configured interval, slowed
 * down so that every place together stays within the daily budget.
 * @param {number} refreshMinutes
 * @param {number} placeCount
 */
export function effectiveMinutes(refreshMinutes, placeCount) {
  const floor = Math.ceil((Math.max(placeCount, 1) * 24 * 60) / DAILY_BUDGET);
  return Math.max(refreshMinutes, floor);
}

const COORDINATES = /^\s*(-?\d{1,3}(?:[.,]\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/;

/** A stable, id-safe slug: "Den Haag" -> "den-haag", "'s-Hertogenbosch" -> "s-hertogenbosch". */
export function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Coordinates rounded to two decimals (about 1 km): enough for a weather
 * forecast, and no more precise than needed when sent to Weerlive.
 */
export function roundCoordinates(latitude, longitude) {
  const round = (value) => Math.round(value * 100) / 100;
  return { latitude: round(latitude), longitude: round(longitude) };
}

function coordinatesPlace(latitude, longitude, label) {
  const rounded = roundCoordinates(latitude, longitude);
  const id = `geo-${slug(rounded.latitude.toFixed(2))}_${slug(rounded.longitude.toFixed(2))}`;
  return {
    id,
    label: label ?? `${rounded.latitude.toFixed(2)}, ${rounded.longitude.toFixed(2)}`,
    query: `${rounded.latitude.toFixed(2)},${rounded.longitude.toFixed(2)}`,
  };
}

/**
 * The places typed in the configuration: city names or "latitude,longitude",
 * separated by semicolons or line breaks.
 * @returns {{ places: Array<{ id, label, query }>, invalid: string[] }}
 */
export function parsePlaces(text) {
  const places = [];
  const invalid = [];
  for (const entry of text.split(/[;\n]/)) {
    const value = entry.trim();
    if (value === '') {
      continue;
    }
    const match = value.match(COORDINATES);
    if (match) {
      const latitude = Number(match[1].replace(',', '.'));
      const longitude = Number(match[2].replace(',', '.'));
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        places.push(coordinatesPlace(latitude, longitude));
      } else {
        invalid.push(value);
      }
      continue;
    }
    const id = slug(value);
    // Digits only, but not a coordinate pair: a typo, not a town.
    if (id === '' || value.length > 60 || /^[\d\s.,+-]+$/.test(value)) {
      invalid.push(value);
      continue;
    }
    places.push({ id: `city-${id}`, label: value, query: value });
  }
  return { places, invalid };
}

/**
 * Every place to follow: the chosen Gladys house first, then the typed ones,
 * without duplicates, MAX_PLACES at most.
 * @param {object} config normalized config
 * @param {Array<{ selector, name, latitude, longitude }>} houses from getHouses()
 * @returns {{ places: Array<{ id, label, query, house? }>, invalid: string[],
 *   dropped: number, unlocatedHouse: boolean }}
 */
export function resolvePlaces(config, houses = []) {
  const all = [];
  let unlocatedHouse = false;
  if (config.house !== '') {
    const house = houses.find((candidate) => candidate.selector === config.house);
    if (house && Number.isFinite(house.latitude) && Number.isFinite(house.longitude)) {
      const place = coordinatesPlace(house.latitude, house.longitude, house.name);
      // The house keeps its own id: moving the house keeps the same device.
      all.push({ ...place, id: `house-${slug(house.selector)}`, house: house.selector });
    } else {
      unlocatedHouse = true;
    }
  }
  const { places, invalid } = parsePlaces(config.places);
  all.push(...places);
  const seen = new Set();
  const unique = all.filter((place) => {
    if (seen.has(place.id)) {
      return false;
    }
    seen.add(place.id);
    return true;
  });
  return {
    places: unique.slice(0, MAX_PLACES),
    invalid,
    dropped: Math.max(unique.length - MAX_PLACES, 0),
    unlocatedHouse,
  };
}
