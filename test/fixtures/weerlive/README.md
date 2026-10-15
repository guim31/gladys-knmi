# Weerlive fixtures

Real answers of the Weerlive API v2 (`weerlive_api_v2.php`), copied verbatim
from the test suite of [python-weerlive](https://github.com/golles/python-weerlive)
by golles (MIT License, Copyright (c) 2024-2026 golles). Town names only; no API
key appears in them.

| File                  | What it is                                                         |
| --------------------- | ------------------------------------------------------------------ |
| `amsterdam.json`      | A normal answer, no warning (`rest_verz: 0`: last request of a day) |
| `groningen.json`      | A normal answer, no warning                                        |
| `alarm.json`          | `alarm: 1`, a yellow warning announced for later (`wrsch_gc`)       |
| `invalid.json`        | Missing values as a bare `_` (not valid JSON), seen in production  |
| `invalid-api-key.txt` | The body sent for a refused key (HTTP 200)                         |
| `rate-limit.txt`      | The body sent once the daily limit is reached (HTTP 200)           |

No published answer carries a yellow, orange or red warning in force: the tests
derive them from these files (`withWarning()` in `test/helpers/world.js`).
Prettier leaves this folder alone (`.prettierignore`): the files stay verbatim.
