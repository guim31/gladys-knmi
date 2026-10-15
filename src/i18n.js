// -----------------------------------------------------------------------------
// Every text the container produces, in the four languages of the Gladys
// interface. German says "du", Spanish "usted". The KNMI warning title and text
// come from the API, in Dutch: they are published as they are, never
// translated by guesswork.
// -----------------------------------------------------------------------------

// Feature names, fixed at the creation of the device (in the configured language).
export const FEATURE_NAMES = {
  en: {
    temperature: 'Temperature',
    feels_like: 'Feels like',
    humidity: 'Humidity',
    pressure: 'Air pressure',
    wind_beaufort: 'Wind (Beaufort)',
    wind_speed: 'Wind speed',
    wind_direction: 'Wind direction',
    visibility: 'Visibility',
    precipitation_next_hour: 'Precipitation, coming hour',
    conditions: 'Conditions',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    warning_level: 'KNMI warning level',
    warning_title: 'KNMI warning',
    warning_text: 'KNMI warning text',
    weather_alarm: 'Weather alarm',
    next_warning_level: 'Next KNMI warning level',
    next_warning_time: 'Next KNMI warning from',
  },
  fr: {
    temperature: 'Température',
    feels_like: 'Température ressentie',
    humidity: 'Humidité',
    pressure: 'Pression atmosphérique',
    wind_beaufort: 'Vent (Beaufort)',
    wind_speed: 'Vitesse du vent',
    wind_direction: 'Direction du vent',
    visibility: 'Visibilité',
    precipitation_next_hour: 'Précipitations, heure à venir',
    conditions: 'Conditions',
    sunrise: 'Lever du soleil',
    sunset: 'Coucher du soleil',
    warning_level: 'Niveau d’avertissement KNMI',
    warning_title: 'Avertissement KNMI',
    warning_text: 'Texte de l’avertissement KNMI',
    weather_alarm: 'Alarme météo',
    next_warning_level: 'Niveau du prochain avertissement',
    next_warning_time: 'Prochain avertissement à partir de',
  },
  de: {
    temperature: 'Temperatur',
    feels_like: 'Gefühlte Temperatur',
    humidity: 'Luftfeuchtigkeit',
    pressure: 'Luftdruck',
    wind_beaufort: 'Wind (Beaufort)',
    wind_speed: 'Windgeschwindigkeit',
    wind_direction: 'Windrichtung',
    visibility: 'Sichtweite',
    precipitation_next_hour: 'Niederschlag, kommende Stunde',
    conditions: 'Wetterlage',
    sunrise: 'Sonnenaufgang',
    sunset: 'Sonnenuntergang',
    warning_level: 'KNMI-Warnstufe',
    warning_title: 'KNMI-Warnung',
    warning_text: 'Text der KNMI-Warnung',
    weather_alarm: 'Wetteralarm',
    next_warning_level: 'Stufe der nächsten Warnung',
    next_warning_time: 'Nächste KNMI-Warnung ab',
  },
  es: {
    temperature: 'Temperatura',
    feels_like: 'Sensación térmica',
    humidity: 'Humedad',
    pressure: 'Presión atmosférica',
    wind_beaufort: 'Viento (Beaufort)',
    wind_speed: 'Velocidad del viento',
    wind_direction: 'Dirección del viento',
    visibility: 'Visibilidad',
    precipitation_next_hour: 'Precipitación, próxima hora',
    conditions: 'Condiciones',
    sunrise: 'Salida del sol',
    sunset: 'Puesta del sol',
    warning_level: 'Nivel de aviso KNMI',
    warning_title: 'Aviso KNMI',
    warning_text: 'Texto del aviso KNMI',
    weather_alarm: 'Alarma meteorológica',
    next_warning_level: 'Nivel del próximo aviso',
    next_warning_time: 'Próximo aviso KNMI desde',
  },
};

// Weerlive image codes (the documented ones, plus "wolkennacht" seen in real
// answers), grouped by meaning.
export const CONDITIONS = {
  en: {
    sunny: 'Sunny',
    clear_night: 'Clear night',
    partly_cloudy: 'Partly cloudy',
    cloudy: 'Cloudy',
    overcast: 'Overcast',
    cloudy_night: 'Cloudy night',
    rain: 'Rain',
    showers: 'Showers',
    sun_and_rain: 'Sun and showers',
    thunder: 'Thunderstorm',
    hail: 'Hail',
    snow: 'Snow',
    fog: 'Fog',
  },
  fr: {
    sunny: 'Ensoleillé',
    clear_night: 'Nuit claire',
    partly_cloudy: 'Partiellement nuageux',
    cloudy: 'Nuageux',
    overcast: 'Couvert',
    cloudy_night: 'Nuit nuageuse',
    rain: 'Pluie',
    showers: 'Averses',
    sun_and_rain: 'Soleil et averses',
    thunder: 'Orage',
    hail: 'Grêle',
    snow: 'Neige',
    fog: 'Brouillard',
  },
  de: {
    sunny: 'Sonnig',
    clear_night: 'Klare Nacht',
    partly_cloudy: 'Teilweise bewölkt',
    cloudy: 'Bewölkt',
    overcast: 'Bedeckt',
    cloudy_night: 'Bewölkte Nacht',
    rain: 'Regen',
    showers: 'Schauer',
    sun_and_rain: 'Sonne und Schauer',
    thunder: 'Gewitter',
    hail: 'Hagel',
    snow: 'Schnee',
    fog: 'Nebel',
  },
  es: {
    sunny: 'Soleado',
    clear_night: 'Noche despejada',
    partly_cloudy: 'Parcialmente nublado',
    cloudy: 'Nublado',
    overcast: 'Cubierto',
    cloudy_night: 'Noche nublada',
    rain: 'Lluvia',
    showers: 'Chubascos',
    sun_and_rain: 'Sol y chubascos',
    thunder: 'Tormenta',
    hail: 'Granizo',
    snow: 'Nieve',
    fog: 'Niebla',
  },
};

export const IMAGE_CONDITIONS = {
  zonnig: 'sunny',
  helderenacht: 'clear_night',
  lichtbewolkt: 'partly_cloudy',
  halfbewolkt: 'partly_cloudy',
  bewolkt: 'cloudy',
  zwaarbewolkt: 'overcast',
  nachtbewolkt: 'cloudy_night',
  wolkennacht: 'cloudy_night',
  regen: 'rain',
  buien: 'showers',
  halfbewolkt_regen: 'sun_and_rain',
  bliksem: 'thunder',
  hagel: 'hail',
  sneeuw: 'snow',
  mist: 'fog',
  nachtmist: 'fog',
};

/** Localized conditions of an image code; the Dutch summary when unknown. */
export function conditionsLabel(image, language, fallback = null) {
  const key = IMAGE_CONDITIONS[image];
  return key ? CONDITIONS[language][key] : fallback;
}

export const LEVEL_NAMES = {
  en: ['Green', 'Yellow', 'Orange', 'Red'],
  fr: ['Vert', 'Jaune', 'Orange', 'Rouge'],
  de: ['Grün', 'Gelb', 'Orange', 'Rot'],
  es: ['Verde', 'Amarillo', 'Naranja', 'Rojo'],
};

// 16-point compass, from north, clockwise.
export const COMPASS = {
  en: [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ],
  fr: [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSO',
    'SO',
    'OSO',
    'O',
    'ONO',
    'NO',
    'NNO',
  ],
  de: [
    'N',
    'NNO',
    'NO',
    'ONO',
    'O',
    'OSO',
    'SO',
    'SSO',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ],
  es: [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSO',
    'SO',
    'OSO',
    'O',
    'ONO',
    'NO',
    'NNO',
  ],
};

export function compass(degrees, language) {
  if (degrees === null || degrees === undefined) {
    return null;
  }
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[language][index];
}

// Short texts (states, widget labels): 40 characters at most.
export const TEXT = {
  en: {
    none: 'None',
    noData: 'No data yet',
    waiting: 'Waiting for the first KNMI reading.',
    pickPlace: 'Pick a KNMI place in the widget settings.',
    unknownPlace: 'This place is no longer configured.',
    warningNow: 'Warning now',
    warningNext: 'Next warning',
    sun: 'Sun',
    temperature: 'Temperature',
    feelsLike: 'Feels like',
    wind: 'Wind',
    rain: 'Rain',
    source: 'Source: KNMI via Weerlive.nl',
  },
  fr: {
    none: 'Aucun',
    noData: 'Pas encore de données',
    waiting: 'En attente de la première lecture KNMI.',
    pickPlace: 'Choisissez un lieu KNMI dans les réglages du widget.',
    unknownPlace: 'Ce lieu n’est plus configuré.',
    warningNow: 'Avertissement en cours',
    warningNext: 'Prochain avertissement',
    sun: 'Soleil',
    temperature: 'Température',
    feelsLike: 'Ressenti',
    wind: 'Vent',
    rain: 'Pluie',
    source: 'Source : KNMI via Weerlive.nl',
  },
  de: {
    none: 'Keine',
    noData: 'Noch keine Daten',
    waiting: 'Warte auf die erste KNMI-Messung.',
    pickPlace: 'Wähle in den Widget-Einstellungen einen KNMI-Ort.',
    unknownPlace: 'Dieser Ort ist nicht mehr konfiguriert.',
    warningNow: 'Aktuelle Warnung',
    warningNext: 'Nächste Warnung',
    sun: 'Sonne',
    temperature: 'Temperatur',
    feelsLike: 'Gefühlt',
    wind: 'Wind',
    rain: 'Regen',
    source: 'Quelle: KNMI über Weerlive.nl',
  },
  es: {
    none: 'Ninguno',
    noData: 'Aún no hay datos',
    waiting: 'A la espera de la primera lectura del KNMI.',
    pickPlace: 'Elija un lugar KNMI en los ajustes del widget.',
    unknownPlace: 'Este lugar ya no está configurado.',
    warningNow: 'Aviso actual',
    warningNext: 'Próximo aviso',
    sun: 'Sol',
    temperature: 'Temperatura',
    feelsLike: 'Sensación',
    wind: 'Viento',
    rain: 'Lluvia',
    source: 'Fuente: KNMI a través de Weerlive.nl',
  },
};

// Messages shown in the Configuration screen (connection status, actions).
export const MESSAGES = {
  notConfigured: {
    en: 'Enter your free Weerlive API key, then a Gladys house or a place.',
    fr: 'Saisissez votre clé d’API Weerlive gratuite, puis une maison Gladys ou un lieu.',
    de: 'Gib deinen kostenlosen Weerlive-API-Schlüssel ein, dann ein Gladys-Haus oder einen Ort.',
    es: 'Introduzca su clave de API gratuita de Weerlive y luego una casa de Gladys o un lugar.',
  },
  noPlace: {
    en: 'No place to follow: pick a Gladys house with a location, or type a place.',
    fr: 'Aucun lieu à suivre : choisissez une maison Gladys localisée, ou saisissez un lieu.',
    de: 'Kein Ort zu verfolgen: Wähle ein Gladys-Haus mit Standort oder gib einen Ort ein.',
    es: 'Ningún lugar que seguir: elija una casa de Gladys con ubicación o escriba un lugar.',
  },
  invalidKey: {
    en: 'Weerlive refused the API key: check it on weerlive.nl.',
    fr: 'Weerlive a refusé la clé d’API : vérifiez-la sur weerlive.nl.',
    de: 'Weerlive hat den API-Schlüssel abgelehnt: Prüfe ihn auf weerlive.nl.',
    es: 'Weerlive ha rechazado la clave de API: compruébela en weerlive.nl.',
  },
  rateLimit: {
    en: 'Daily Weerlive limit reached: the readings resume after midnight (Dutch time).',
    fr: 'Limite quotidienne Weerlive atteinte : les relevés reprennent après minuit (heure néerlandaise).',
    de: 'Tageslimit von Weerlive erreicht: Die Messungen gehen nach Mitternacht (niederländische Zeit) weiter.',
    es: 'Límite diario de Weerlive alcanzado: las lecturas se reanudan después de medianoche (hora neerlandesa).',
  },
  unreachable: {
    en: 'Weerlive does not answer: the readings resume as soon as it does.',
    fr: 'Weerlive ne répond pas : les relevés reprennent dès son retour.',
    de: 'Weerlive antwortet nicht: Die Messungen gehen weiter, sobald es wieder antwortet.',
    es: 'Weerlive no responde: las lecturas se reanudan en cuanto vuelva a responder.',
  },
  initFailed: {
    en: 'Initialization failed, check the integration logs.',
    fr: 'L’initialisation a échoué, consultez les logs de l’intégration.',
    de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  unlocatedHouse: {
    en: 'The chosen Gladys house has no location: set it in Settings → Houses.',
    fr: 'La maison Gladys choisie n’a pas de position : renseignez-la dans Paramètres → Maisons.',
    de: 'Das gewählte Gladys-Haus hat keinen Standort: Lege ihn unter Einstellungen → Häuser fest.',
    es: 'La casa de Gladys elegida no tiene ubicación: indíquela en Ajustes → Casas.',
  },
};

// Messages built from values, one function per language.
export const REPORT = {
  en: {
    ok: (place, found, remaining) =>
      `Key accepted. "${place}" read as ${found} by Weerlive.` +
      (remaining === null ? '' : ` ${remaining} requests left today.`),
    pace: (minutes, count) => `${count} place(s), one reading every ${minutes} min each.`,
    ignored: (list) => `Ignored: ${list}.`,
    dropped: (count) => `${count} place(s) over the limit of 5 ignored.`,
  },
  fr: {
    ok: (place, found, remaining) =>
      `Clé acceptée. « ${place} » lu comme ${found} par Weerlive.` +
      (remaining === null ? '' : ` ${remaining} requêtes restantes aujourd’hui.`),
    pace: (minutes, count) => `${count} lieu(x), une lecture toutes les ${minutes} min chacun.`,
    ignored: (list) => `Ignorés : ${list}.`,
    dropped: (count) => `${count} lieu(x) au-delà de la limite de 5 ignoré(s).`,
  },
  de: {
    ok: (place, found, remaining) =>
      `Schlüssel akzeptiert. „${place}“ wurde von Weerlive als ${found} gelesen.` +
      (remaining === null ? '' : ` Heute noch ${remaining} Anfragen.`),
    pace: (minutes, count) => `${count} Ort(e), je eine Messung alle ${minutes} Min.`,
    ignored: (list) => `Ignoriert: ${list}.`,
    dropped: (count) => `${count} Ort(e) über dem Limit von 5 ignoriert.`,
  },
  es: {
    ok: (place, found, remaining) =>
      `Clave aceptada. Weerlive ha leído «${place}» como ${found}.` +
      (remaining === null ? '' : ` Quedan ${remaining} solicitudes hoy.`),
    pace: (minutes, count) => `${count} lugar(es), una lectura cada ${minutes} min cada uno.`,
    ignored: (list) => `Ignorados: ${list}.`,
    dropped: (count) => `${count} lugar(es) por encima del límite de 5 ignorado(s).`,
  },
};

/** One multi-language object from a function of the language. */
export const allLanguages = (build) =>
  Object.fromEntries(Object.keys(TEXT).map((language) => [language, build(language)]));

const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** "Thu 22/02, 18:00" in the time zone of the Netherlands. */
export function formatDateTime(epochSeconds, language) {
  return new Intl.DateTimeFormat(LOCALES[language], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(epochSeconds * 1000));
}

/** "Thu 15/02" for an ISO day. */
export function formatDay(isoDay, language) {
  return new Intl.DateTimeFormat(LOCALES[language], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${isoDay}T12:00:00Z`));
}
