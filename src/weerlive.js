// -----------------------------------------------------------------------------
// Weerlive API v2 client (https://weerlive.nl/delen.php): KNMI observations,
// hourly and 5-day forecasts and the KNMI warning of a place, in one request.
//
// The API has no error codes: a refused key or the daily limit come back as
// HTTP 200 with a short Dutch sentence instead of JSON, as the python-weerlive
// library (golles, MIT) found. A missing value is sometimes a bare `_`, which
// is not valid JSON: it is read as null, and only that feature is skipped.
//
// The URL carries the API key: it is never logged, never put in an error.
// -----------------------------------------------------------------------------

export const API_ENDPOINT = 'https://weerlive.nl/api/weerlive_api_v2.php';
export const REQUEST_TIMEOUT_MS = 10_000;

export class WeerliveError extends Error {
  /**
   * @param {'invalid_key'|'rate_limit'|'http'|'network'|'timeout'|'decode'} code
   * @param {string} message never contains the key
   */
  constructor(code, message) {
    super(message);
    this.name = 'WeerliveError';
    this.code = code;
  }
}

/** @param {string} apiKey @param {string} location a city name or "lat,lon" */
export function buildUrl(apiKey, location) {
  const url = new URL(API_ENDPOINT);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('locatie', location);
  return url.toString();
}

/**
 * Read an answer body: the JSON document, or the error the sentence means.
 * @param {string} body
 */
export function parseBody(body) {
  if (body.includes('Vraag eerst een API-key op')) {
    throw new WeerliveError('invalid_key', 'the API key was refused by Weerlive');
  }
  if (body.includes('Dagelijkse limiet')) {
    throw new WeerliveError('rate_limit', 'the daily request limit of the API key is reached');
  }
  try {
    // `"luchtd": _,` -> `"luchtd": null,` (seen in real answers).
    return JSON.parse(body.replace(/:\s*_\s*(?=[,}\n\r])/g, ': null'));
  } catch {
    throw new WeerliveError('decode', 'Weerlive sent an answer that is not JSON');
  }
}

/**
 * One request for one place.
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} options.location
 * @param {typeof fetch} [options.fetch]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<object>} the raw Weerlive document
 */
export async function fetchWeather({
  apiKey,
  location,
  fetch = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  let response;
  try {
    response = await fetch(buildUrl(apiKey, location), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new WeerliveError('timeout', `Weerlive did not answer within ${timeoutMs / 1000} s`);
    }
    // The cause of a fetch failure (DNS, refused connection) never holds the URL.
    const cause = err?.cause?.code ?? err?.cause?.message ?? err?.name ?? 'error';
    throw new WeerliveError('network', `Weerlive is unreachable (${cause})`);
  }
  if (!response.ok) {
    throw new WeerliveError('http', `Weerlive answered HTTP ${response.status}`);
  }
  const document = parseBody(await response.text());
  if (!Array.isArray(document?.liveweer) || document.liveweer.length === 0) {
    throw new WeerliveError('decode', 'Weerlive sent no observation for this place');
  }
  return document;
}
