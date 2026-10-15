// -----------------------------------------------------------------------------
// Repeated failures, logged once (taken from guim31/gladys-subsonic).
//
// A place that fails at every refresh would write the same warning again and
// again. An issue log keeps, per key, whether the problem is ongoing: the first
// failure is a warning, the next ones go to debug, and the recovery is one info
// line.
// -----------------------------------------------------------------------------

/**
 * @param {{ debug: Function, info: Function, warn: Function }} logger
 */
export function createIssueLog(logger) {
  const ongoing = new Set();
  return {
    /** A warning the first time, debug while it lasts. */
    fail(key, message) {
      if (ongoing.has(key)) {
        logger.debug(`${message} (still failing)`);
        return;
      }
      ongoing.add(key);
      logger.warn(message);
    },

    /** One info line when it ends an ongoing failure. */
    ok(key, message) {
      if (ongoing.delete(key)) {
        logger.info(message);
      }
    },

    isFailing(key) {
      return ongoing.has(key);
    },

    clear() {
      ongoing.clear();
    },
  };
}
