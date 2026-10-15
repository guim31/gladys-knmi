// -----------------------------------------------------------------------------
// The "New KNMI warning" scene trigger.
//
// The warning level is already a feature (a scene can test "level ≥ 2"): the
// trigger adds what a state cannot carry — ONE event per new warning, with its
// Dutch title and text and its start time as scene variables, ready for a
// notification. Two phases:
//   - "current": a yellow, orange or red warning is now in force for the place
//     (the level rose, or a new warning with another title replaced it);
//   - "upcoming": KNMI announced a warning starting later (wrsch_g), seen for
//     the first time with this level and start.
// The first reading of a place only records what is in force: an event says
// "this happened", and nothing new happened on the first look. The last seen
// warning is kept in /data, so a restart neither repeats nor loses one.
// -----------------------------------------------------------------------------

import { WARNING_COLORS } from './model.js';

export const TRIGGER_KEY = 'knmi_warning';

/** What is remembered of a reading, to compare with the next one. */
export function seenWarnings(model) {
  return {
    level: model.warning.level ?? 0,
    title: model.warning.title ?? '',
    next: model.next.at === null ? '' : `${model.next.level}@${model.next.at}`,
  };
}

/**
 * The events a new reading fires.
 * @param {object|null} previous what seenWarnings() returned last time
 * @param {object} model the new reading
 * @returns {Array<{ phase: 'current'|'upcoming', level: number }>}
 */
export function newWarnings(previous, model) {
  if (previous === null) {
    return [];
  }
  const now = seenWarnings(model);
  const events = [];
  if (now.level >= 1 && (now.level > previous.level || now.title !== previous.title)) {
    events.push({ phase: 'current', level: now.level });
  }
  if (now.next !== '' && now.next !== previous.next && model.next.level >= 1) {
    events.push({ phase: 'upcoming', level: model.next.level });
  }
  return events;
}

/**
 * The flat `data` of publishSceneEvent: the filters (device, level, phase)
 * and the declared variables.
 */
export function eventData({ deviceExternalId, placeLabel, model, event }) {
  const current = event.phase === 'current';
  const startsAt = current ? model.observedAt : model.next.at;
  return {
    device: deviceExternalId,
    level: WARNING_COLORS[event.level],
    phase: event.phase,
    place: placeLabel,
    level_number: event.level,
    // The KNMI text describes the warning in force; an upcoming one only has
    // its colour and start.
    title: current ? (model.warning.title ?? '') : '',
    text: current ? (model.warning.text ?? '').slice(0, 1000) : '',
    starts_at: startsAt ? new Date(startsAt * 1000).toISOString() : '',
  };
}
