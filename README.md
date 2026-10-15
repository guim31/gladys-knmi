# KNMI for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that brings the
official weather of the **Netherlands** — observations, forecasts and **KNMI warnings** — into
Gladys, through the free [Weerlive.nl](https://weerlive.nl) API. For the Dutch living in France,
people near the Belgian–Dutch border, and anyone with a house in the Netherlands.

> **Developed without a Weerlive account: feedback welcome.** The integration is built and tested
> against real Weerlive answers (published by the python-weerlive and ha-knmi projects), not against
> the live service. Please report what works and what does not in the
> [issues](https://github.com/guim31/gladys-knmi/issues).

## Features

- **One device per place**: a Gladys house (its location, sent rounded to about 1 km), Dutch towns
  or coordinates — five places at most.
- **Per place**: temperature, feels-like temperature, humidity, air pressure, wind (Beaufort, km/h,
  direction), visibility, precipitation forecast for the coming hour, conditions, sunrise and
  sunset, and the **KNMI warning**: level (0 green, 1 yellow, 2 orange, 3 red), title and text (in
  Dutch, as the KNMI writes them), the weather alarm flag, and the next warning announced (level
  and start).
- **Scene trigger** _New KNMI warning_: once per new warning, in force or announced for later,
  filtered by place and colour, with the KNMI title and text as scene variables.
- **Dashboard widget** _KNMI forecast_: live tiles, warnings in force and next, sun, and the 5-day
  forecast. Built from the last reading: it costs no request.
- **Read-only**: nothing to control.
- **Within the quota**: the free key allows 300 requests a day. Each place is read every 10 minutes
  at most (Weerlive's own refresh pace), slower with several places so that all of them stay under
  240 requests a day; the last reading is kept in `/data` so a restart spends nothing; the daily
  limit pauses every request until midnight (Dutch time).

## Requirements

- Gladys Assistant **5.2.0** or later (house picker, widgets, scene triggers).
- A free Weerlive API key, requested at [weerlive.nl/delen.php](https://weerlive.nl/delen.php)
  (an email address is enough). Weerlive reserves it for personal and hobby use.
- Internet access for Gladys (`weerlive.nl`, HTTPS).

## Installation

1. In Gladys, open **Integrations**, find **KNMI** in the catalog and install it (or
   **Integrations → Install from GitHub** with this repository). The install screen asks for the
   location of your houses: only the house you pick is used.
2. In **Configuration**, paste the Weerlive key, pick a Gladys house and/or type places
   (`Amsterdam; Maastricht`, or `52.09,5.12`), then save. _Test the connection_ tells you which
   place Weerlive found.
3. Open the **Discovery** tab and add the places' devices.

The user guide is in [`docs/en.md`](docs/en.md) (also [`fr`](docs/fr.md), [`de`](docs/de.md),
[`es`](docs/es.md)); Gladys links it from the Configuration screen.

## Limits

- The data covers the Netherlands: a place far from it gets the nearest Dutch station, or nothing.
- KNMI warning texts are in Dutch only.
- Five places per key, one reading every 10 minutes at best.
- Developed and tested without a Weerlive account, on real published answers: the first real runs
  may show differences.

## Development

Node.js 22+, ESM, no build step. The only runtime dependency is
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

```bash
npm install
npm test              # node --test, on the SDK's fake Gladys and a fake Weerlive
npm run lint
npm run format:check
npx github:GladysAssistant/integration-store .   # store validator
node scripts/probe.mjs Utrecht                   # real API, fake key: expects the refusal
WEERLIVE_KEY=... node scripts/probe.mjs Utrecht  # real API, real key: one reading
```

```
index.js                SDK wiring (src/app.js registers the handlers)
src/app.js              places, refresh tick, quota, states, trigger, widget, action
src/config.js           defaults, places (house, towns, coordinates), pace
src/weerlive.js         Weerlive v2 client (errors without the key)
src/model.js            raw answer -> values; KNMI colours
src/device.js           one device per place, its features and states
src/warnings.js         "New KNMI warning" scene trigger
src/widgets.js          "KNMI forecast" dashboard widget
src/i18n.js             every text, in en / fr / de / es
src/store.js            last readings and warnings, under /data
test/fixtures/weerlive/ real Weerlive answers (python-weerlive, MIT)
```

`test/gladys-rules.test.js` checks every discovered device against the category/type table
extracted from the Gladys core.

Releases are made by the **Release** workflow (Actions → Release); never edit the versions by hand.
A hand-pushed `vX.Y.Z` tag also builds the image and the GitHub Release, but then `version` in
`package.json` and in the manifest (with the `docker_image` tag) must be bumped and committed
before tagging. See [`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- [python-weerlive](https://github.com/golles/python-weerlive) by golles (MIT): the test fixtures
  in `test/fixtures/weerlive/` are real API answers from its test suite, and its client showed how
  the API reports a refused key and the daily limit.
- [ha-knmi](https://github.com/golles/ha-knmi) by golles (MIT), the Home Assistant KNMI
  integration: the choice of sensors, the weather icon codes and the warning handling.
- [Weerlive.nl](https://weerlive.nl), whose API serves the KNMI data, and the
  [KNMI](https://www.knmi.nl).

## Disclaimer

This project is not affiliated with, endorsed or sponsored by KNMI or Weerlive. "KNMI" is the name
of the Royal Netherlands Meteorological Institute; the data comes from Weerlive.nl, which states
"Bron: Weerdata KNMI/NOAA via Weerlive.nl".

## License

Apache-2.0
