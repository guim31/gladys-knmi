// -----------------------------------------------------------------------------
// What survives a restart, in /data (the only writable volume):
//   - the last reading of every place, so a restart of Gladys or of the
//     container does not spend the daily quota again;
//   - the last KNMI warning seen per place, so "new KNMI warning" fires once
//     per warning, not once per restart.
// No secret is written here: the API key stays in the Gladys configuration.
// -----------------------------------------------------------------------------

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const FILE = 'knmi-state.json';

export class Store {
  /** @param {string} [dir] */
  constructor(dir = process.env.DATA_DIR ?? '/data') {
    this.dir = dir;
    this.data = { readings: {}, warnings: {} };
    this.writing = Promise.resolve();
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(join(this.dir, FILE), 'utf8'));
      this.data = {
        readings: parsed?.readings && typeof parsed.readings === 'object' ? parsed.readings : {},
        warnings: parsed?.warnings && typeof parsed.warnings === 'object' ? parsed.warnings : {},
      };
    } catch {
      // First start, or an unreadable file: start empty.
      this.data = { readings: {}, warnings: {} };
    }
  }

  reading(placeId) {
    return this.data.readings[placeId] ?? null;
  }

  setReading(placeId, model) {
    this.data.readings[placeId] = model;
    return this.save();
  }

  warning(placeId) {
    return this.data.warnings[placeId] ?? null;
  }

  setWarning(placeId, seen) {
    this.data.warnings[placeId] = seen;
    return this.save();
  }

  /** Forget the places no longer configured. */
  keepOnly(placeIds) {
    const keep = new Set(placeIds);
    for (const section of ['readings', 'warnings']) {
      for (const id of Object.keys(this.data[section])) {
        if (!keep.has(id)) {
          delete this.data[section][id];
        }
      }
    }
    return this.save();
  }

  /**
   * Atomic write (temporary file then rename), one at a time. Never rejects:
   * a failed write is reported to `onError` (the memory copy stays right).
   */
  save() {
    const snapshot = JSON.stringify(this.data);
    this.writing = this.writing.then(async () => {
      try {
        await mkdir(this.dir, { recursive: true });
        const temporary = join(this.dir, `${FILE}.tmp`);
        await writeFile(temporary, snapshot);
        await rename(temporary, join(this.dir, FILE));
        this.onSaved?.();
      } catch (err) {
        this.onError?.(err);
      }
    });
    return this.writing;
  }

  flush() {
    return this.writing;
  }
}
