// -----------------------------------------------------------------------------
// The KNMI integration: one device per followed place, refreshed by the
// container itself, within the daily quota of the free Weerlive key.
//
// Refresh: the core cannot be trusted to poll external devices (Gladys#3198,
// still open in 5.2.1), so a one-minute tick reads every added place whose
// last reading is one period old. The period is the configured interval,
// slowed down so that all the places stay within DAILY_BUDGET requests a day.
// The core's onPoll is a fallback that follows the same rule: while the tick
// runs, it never spends a request. The last reading of every place is kept in
// /data: a restart does not read again a place read minutes ago.
//
// Quota: "Dagelijkse limiet" (the daily limit) stops every request until the
// next midnight of the Netherlands. A refused key is said once, and retried
// at the normal pace (the user may fix it on weerlive.nl without touching the
// configuration).
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import {
  DEFAULT_CONFIG,
  LANGUAGES,
  effectiveMinutes,
  isConfigured,
  normalizeConfig,
  resolvePlaces,
} from './config.js';
import { buildDevice, buildStates, deviceIds } from './device.js';
import { MESSAGES, REPORT, allLanguages } from './i18n.js';
import { createIssueLog } from './issues.js';
import { API_TIMEZONE, WARNING_COLORS, toModel } from './model.js';
import { Store } from './store.js';
import { TRIGGER_KEY, eventData, newWarnings, seenWarnings } from './warnings.js';
import { fetchWeather } from './weerlive.js';
import {
  WIDGET_KEY,
  buildForecastContent,
  pickPlaceContent,
  unknownPlaceContent,
  waitingContent,
} from './widgets.js';

const logger = createLogger({ name: 'knmi' });

export const TICK_MS = 60_000;
// Unchanged values are sent again this often, so Gladys never shows
// "no recent value" (it does past 48 h).
export const STATE_HEARTBEAT_MS = 12 * 60 * 60 * 1000;
export const TEST_ACTION_KEY = 'test_connection';

/** Milliseconds until 00:05 of the next day, Netherlands time (the quota resets at midnight). */
export function msUntilQuotaReset(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: API_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(now))
      .map((part) => [part.type, Number(part.value)]),
  );
  const elapsed = ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000;
  return 24 * 60 * 60 * 1000 - elapsed + 5 * 60 * 1000;
}

export class KnmiApp {
  /**
   * @param {object} gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {object} [options] test seams
   * @param {Store} [options.store]
   * @param {typeof fetch} [options.fetch]
   * @param {boolean} [options.timers] run the refresh tick
   * @param {() => number} [options.now]
   */
  constructor(gladys, { store = new Store(), fetch, timers = true, now = () => Date.now() } = {}) {
    this.gladys = gladys;
    this.store = store;
    this.fetch = fetch;
    this.timers = timers;
    this.now = now;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.resolved = { places: [], invalid: [], dropped: 0, unlocatedHouse: false };
    this.issues = createIssueLog(logger);
    this.inFlight = new Map();
    this.blockedUntil = 0;
    this.keyRefused = false;
    this.lastStatus = null;
    this.timer = null;
    this.stopped = false;
    this.loaded = false;
    store.onError = (err) => this.issues.fail('store', `Cannot write under /data (${err.message})`);
    store.onSaved = () => this.issues.ok('store', 'Writing under /data works again');
  }

  get places() {
    return this.resolved.places;
  }

  periodMs() {
    return effectiveMinutes(this.config.refresh_minutes, this.places.length) * 60_000;
  }

  // --- Lifecycle --------------------------------------------------------------

  /** (Re)connection: read the config, publish the devices, refresh what is due. */
  async start() {
    // Gladys keeps the connection status in memory: after a restart of Gladys
    // it must be sent again, even when it did not change here.
    this.lastStatus = null;
    if (!this.loaded) {
      await this.store.load();
      this.loaded = true;
    }
    await this.applyConfig(await this.gladys.getConfig(), { announce: true });
  }

  async reconfigure(rawConfig) {
    logger.info('New configuration received');
    await this.applyConfig(rawConfig, { announce: true });
  }

  async applyConfig(rawConfig, { announce = false } = {}) {
    const previousKey = this.config.api_key;
    this.config = normalizeConfig(rawConfig);
    if (this.config.api_key !== previousKey) {
      // A new key: its quota and its verdict are its own.
      this.blockedUntil = 0;
      this.keyRefused = false;
      this.issues.clear();
    }
    let houses = [];
    if (this.config.house !== '') {
      try {
        houses = await this.gladys.getHouses();
      } catch (err) {
        logger.warn(`Cannot read the Gladys houses (${err.message})`);
      }
    }
    this.resolved = resolvePlaces(this.config, houses);
    if (announce) {
      logger.info(
        `${this.places.length} place(s) followed, one reading every ` +
          `${this.periodMs() / 60_000} min each`,
      );
    }
    await this.store.keepOnly(this.places.map((place) => place.id));
    await this.gladys.publishDiscoveredDevices(
      this.places.map((place) => buildDevice(this.gladys, place, this.config.language)),
    );
    this.schedule();
    if (!isConfigured(this.config)) {
      await this.setStatus(false, 'notConfigured');
      return;
    }
    if (this.places.length === 0) {
      await this.setStatus(false, this.resolved.unlocatedHouse ? 'unlocatedHouse' : 'noPlace');
      return;
    }
    await this.refreshDue({ verify: true });
    if (!this.blocked() && !this.keyRefused && !this.issues.isFailing('network')) {
      await this.setStatus(true, this.resolved.unlocatedHouse ? 'unlocatedHouse' : null);
    }
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = null;
    return this.store.flush();
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.timers || this.stopped) {
      return;
    }
    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.refreshDue();
      } catch (err) {
        logger.error(`Refresh cycle failed (${err.message})`);
      } finally {
        this.schedule();
      }
    }, TICK_MS);
  }

  // --- Refresh ----------------------------------------------------------------

  blocked() {
    return this.now() < this.blockedUntil;
  }

  createdIds() {
    return new Set((this.gladys.devices ?? []).map((device) => device.external_id));
  }

  placeOf(externalId) {
    return this.places.find((place) => deviceIds(this.gladys, place).device === externalId) ?? null;
  }

  /** A place is due when its last reading is one period old (30 s of slack for the tick). */
  isDue(place) {
    const reading = this.store.reading(place.id);
    return !reading || this.now() - reading.fetchedAt >= this.periodMs() - 30_000;
  }

  /**
   * Read every added place that is due, one after the other. `verify`: with
   * no place added yet, read the first one once, to check the key (its
   * reading is kept for when the device is added).
   */
  async refreshDue({ verify = false } = {}) {
    if (!isConfigured(this.config) || this.gladys.connected === false || this.blocked()) {
      logger.debug('Refresh skipped (not configured, Gladys unreachable or quota reached)');
      return;
    }
    const created = this.createdIds();
    let due = this.places.filter(
      (place) => created.has(deviceIds(this.gladys, place).device) && this.isDue(place),
    );
    const anyAdded = this.places.some((place) => created.has(deviceIds(this.gladys, place).device));
    if (verify && !anyAdded && this.places.every((place) => this.isDue(place))) {
      due = this.places.slice(0, 1);
    }
    for (const place of due) {
      if (this.blocked()) {
        break;
      }
      await this.refreshPlace(place).catch(() => {});
    }
  }

  /**
   * One request for one place, then its states, its warnings and the widget.
   * Concurrent callers share the request in progress.
   * @throws the WeerliveError (already logged and reported)
   */
  refreshPlace(place) {
    const running = this.inFlight.get(place.id);
    if (running) {
      return running;
    }
    const run = this.readPlace(place).finally(() => this.inFlight.delete(place.id));
    this.inFlight.set(place.id, run);
    return run;
  }

  async readPlace(place) {
    let document;
    logger.debug(`Reading ${place.label}`);
    try {
      document = await fetchWeather({
        apiKey: this.config.api_key,
        location: place.query,
        fetch: this.fetch,
      });
    } catch (err) {
      await this.onFetchError(place, err);
      throw err;
    }
    const model = toModel(document, this.now());
    await this.onFetchSuccess(place);
    await this.store.setReading(place.id, model);
    const created = this.createdIds().has(deviceIds(this.gladys, place).device);
    await this.checkWarnings(place, model, created);
    if (created) {
      await this.publishPlace(place, model);
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    }
    return model;
  }

  async onFetchSuccess(place) {
    this.issues.ok(`place:${place.id}`, `${place.label}: Weerlive answers again`);
    const wasDown = this.keyRefused || this.issues.isFailing('network');
    this.issues.ok('network', 'Weerlive answers again');
    this.issues.ok('key', 'Weerlive accepts the API key again');
    this.issues.ok('quota', 'Weerlive quota available again');
    this.keyRefused = false;
    if (wasDown || this.lastStatus?.connected === false) {
      await this.setStatus(true, this.resolved.unlocatedHouse ? 'unlocatedHouse' : null);
    }
  }

  async onFetchError(place, err) {
    switch (err.code) {
      case 'invalid_key':
        this.keyRefused = true;
        this.issues.fail('key', 'Weerlive refused the API key');
        await this.setStatus(false, 'invalidKey');
        break;
      case 'rate_limit': {
        const wait = msUntilQuotaReset(this.now());
        this.blockedUntil = this.now() + wait;
        this.issues.fail(
          'quota',
          `Daily Weerlive limit reached: no request for ${Math.round(wait / 60_000)} min`,
        );
        await this.setStatus(false, 'rateLimit');
        break;
      }
      case 'network':
      case 'timeout':
      case 'http':
        this.issues.fail('network', `Weerlive request failed (${err.message})`);
        await this.setStatus(false, 'unreachable');
        break;
      default:
        // An answer for this place only that cannot be read: the others go on.
        this.issues.fail(`place:${place.id}`, `${place.label}: ${err.message}`);
    }
  }

  async publishPlace(place, model) {
    const states = buildStates(this.gladys, place, model, this.config.language, this.now());
    await this.gladys.publishChangedStates(states, { heartbeat: STATE_HEARTBEAT_MS });
  }

  async checkWarnings(place, model, created) {
    const previous = this.store.warning(place.id);
    const events = newWarnings(previous, model);
    await this.store.setWarning(place.id, seenWarnings(model));
    if (!created) {
      return;
    }
    const deviceExternalId = deviceIds(this.gladys, place).device;
    for (const event of events) {
      logger.info(`${place.label}: new ${event.phase} KNMI ${WARNING_COLORS[event.level]} warning`);
      try {
        await this.gladys.publishSceneEvent(
          TRIGGER_KEY,
          eventData({ deviceExternalId, placeLabel: place.label, model, event }),
        );
      } catch (err) {
        logger.warn(`Cannot fire the KNMI warning trigger (${err.message})`);
      }
    }
  }

  async setStatus(connected, messageKey) {
    const key = `${connected}:${messageKey}`;
    if (this.lastStatus?.key === key) {
      return;
    }
    this.lastStatus = { key, connected };
    try {
      await this.gladys.setConnectionStatus(
        connected,
        messageKey ? MESSAGES[messageKey] : undefined,
      );
    } catch (err) {
      this.lastStatus = null;
      logger.debug(`Connection status not sent (${err.message})`);
    }
  }

  // --- Gladys events ----------------------------------------------------------

  /** The core's poll (fallback): reads only when the tick has not. */
  async poll(device) {
    const place = this.placeOf(device.external_id);
    if (!place || !isConfigured(this.config) || this.blocked() || !this.isDue(place)) {
      return;
    }
    await this.refreshPlace(place).catch(() => {});
  }

  /** A device was just added: send everything now (the SDK forgot what it sent). */
  async deviceCreated(device) {
    const place = this.placeOf(device.external_id);
    if (!place) {
      return;
    }
    const reading = this.store.reading(place.id);
    if (reading && !this.isDue(place)) {
      // Gladys dropped the states published before the feature existed.
      await this.publishPlace(place, reading);
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
      return;
    }
    if (isConfigured(this.config) && !this.blocked()) {
      await this.refreshPlace(place).catch(() => {});
    }
  }

  // --- Widget, action ---------------------------------------------------------

  widgetContent({ settings = {}, language } = {}) {
    const lang = LANGUAGES.includes(language) ? language : this.config.language;
    const externalId = typeof settings.device === 'string' ? settings.device : '';
    if (externalId === '') {
      return pickPlaceContent(lang);
    }
    const place = this.placeOf(externalId);
    if (!place) {
      return unknownPlaceContent(lang);
    }
    const reading = this.store.reading(place.id);
    if (!reading) {
      return waitingContent(lang);
    }
    return buildForecastContent({
      deviceExternalId: externalId,
      label: place.label,
      model: reading,
      language: lang,
    });
  }

  /** "Test the connection": one request for the first place, a report in every language. */
  async testConnection() {
    logger.info('Connection test requested');
    if (!isConfigured(this.config)) {
      return MESSAGES.notConfigured;
    }
    const [place] = this.places;
    if (!place) {
      return this.resolved.unlocatedHouse ? MESSAGES.unlocatedHouse : MESSAGES.noPlace;
    }
    let model;
    try {
      model = await this.refreshPlace(place);
    } catch (err) {
      return MESSAGES[
        { invalid_key: 'invalidKey', rate_limit: 'rateLimit' }[err.code] ?? 'unreachable'
      ];
    }
    const minutes = this.periodMs() / 60_000;
    return allLanguages((language) => {
      const report = REPORT[language];
      const lines = [
        report.ok(place.label, model.place ?? '?', model.quota.remaining),
        report.pace(minutes, this.places.length),
      ];
      if (this.resolved.invalid.length > 0) {
        lines.push(report.ignored(this.resolved.invalid.slice(0, 3).join(', ')));
      }
      if (this.resolved.dropped > 0) {
        lines.push(report.dropped(this.resolved.dropped));
      }
      return lines.join(' ');
    });
  }
}

/**
 * Register every SDK handler on a GladysIntegration (or the SDK's fake Gladys).
 * @returns {{ app: KnmiApp, ready: Promise<void>, stop: () => Promise<void> }}
 */
export function registerHandlers(gladys, options = {}) {
  const app = new KnmiApp(gladys, options);
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  // Handlers wait for the first initialization: an event during it is not lost.
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      await app.start();
    } catch (err) {
      logger.error(`Initialization failed (${err.message})`);
      await gladys.setConnectionStatus(false, MESSAGES.initFailed).catch(() => {});
    } finally {
      resolveReady();
    }
  });

  gladys.onScanRequest(
    whenReady(() =>
      gladys.publishDiscoveredDevices(
        app.places.map((place) => buildDevice(gladys, place, app.config.language)),
      ),
    ),
  );
  gladys.onPoll(whenReady((device) => app.poll(device)));
  gladys.onDeviceCreated(whenReady((device) => app.deviceCreated(device)));
  gladys.onDeviceUpdated(whenReady((device) => app.deviceCreated(device)));
  gladys.onConfigUpdated(whenReady((config) => app.reconfigure(config)));
  gladys.onAction(
    TEST_ACTION_KEY,
    whenReady(() => app.testConnection()),
  );
  gladys.onWidgetGet(
    WIDGET_KEY,
    whenReady((request) => app.widgetContent(request)),
  );
  // Read-only: nothing to set.
  gladys.onSetValue(async () => {
    throw new Error('KNMI features are read-only');
  });

  return { app, ready, stop: () => app.stop() };
}

export const SCENE_TRIGGER_KEYS = [TRIGGER_KEY];
export const WIDGET_KEYS = [WIDGET_KEY];
export const ACTION_KEYS = [TEST_ACTION_KEY];
