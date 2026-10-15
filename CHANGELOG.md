# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.1] - 2026-10-15

### Added

- The official weather of the Netherlands from the KNMI, through the free
  Weerlive.nl API: one device per place (a Gladys house, Dutch towns or
  coordinates, five at most).
- Per place: temperature, feels-like temperature, humidity, air pressure, wind
  (Beaufort, km/h, direction), visibility, precipitation for the coming hour,
  conditions, sunrise and sunset.
- The KNMI warning: level (green, yellow, orange, red), title and text, the
  weather alarm flag, and the next warning announced with its start.
- Scene trigger "New KNMI warning", once per warning in force or announced,
  with the KNMI title and text as scene variables.
- Dashboard widget "KNMI forecast": live values, warnings, sun and the 5-day
  forecast.
- "Test the connection" button: key accepted, place found, requests left.
- Refreshes by itself every 10 minutes at most, slower with several places, to
  stay within the 300 daily requests of the free key; pauses until midnight
  when the daily limit is reached; keeps the last reading across restarts.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-knmi/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/guim31/gladys-knmi/releases/tag/v1.0.1
