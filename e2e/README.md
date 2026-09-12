# End-to-end tests

Playwright tests that drive a real Chromium through the whole stack - the Vite client, the Express API, MongoDB and Redis. They are the only tests that exercise the login form with the real Turnstile widget and drag-and-drop through dnd-kit.

## What it covers

| File                  | Test                                                      | What it proves                                                                                         |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tests/auth.setup.ts` | log in through the real login form                        | Seeding, the login form, Turnstile (test keys) and the auth cookies; saves the session for other tests |
| `tests/board.e2e.ts`  | a card dragged to another column stays there after reload | dnd-kit drag, `PUT /boards/supports/moving_card`, and that the database kept the new position          |
| `tests/board.e2e.ts`  | renaming a column persists                                | The column title input saves on blur and survives a reload                                             |

## Quick start

```bash
pnpm e2e exec playwright install chromium   # once per machine
pnpm e2e:up                                 # MongoDB + Redis in Docker
pnpm test:e2e                               # starts the API and client itself, then runs the tests
pnpm e2e:down                               # stop the containers and delete their data
```

The first `pnpm test:e2e` takes one to two minutes, most of it starting the two dev servers cold. Later runs finish in about half a minute once Vite's dependency cache is warm. Playwright stops the servers it started when the run ends, so each run starts them again.

| Command                                            | What it does                                                   |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm test:e2e`                                    | Run the whole suite through Turbo                              |
| `pnpm e2e exec playwright test`                    | Same, calling Playwright directly so extra flags can be passed |
| `pnpm e2e exec playwright test tests/board.e2e.ts` | One file                                                       |
| `pnpm e2e exec playwright test -g "renaming"`      | Tests whose title matches                                      |
| `pnpm e2e exec playwright test --ui`               | Interactive UI mode: watch, time-travel through each step      |
| `pnpm e2e exec playwright test --headed`           | Show the browser while the tests run                           |
| `pnpm e2e exec playwright test --debug`            | Step through with the Playwright Inspector                     |
| `pnpm e2e exec playwright show-report`             | Open the HTML report of the last run                           |

The `setup` project always runs first, because the browser project depends on it - so even a single test logs in once.

## How a run works

```text
pnpm e2e:up    → e2e/docker-compose.yml: mongo:8.0 on 27019, redis:8-alpine on 6381
pnpm test:e2e  → Playwright reads playwright.config.ts
   1. webServer   API:    pnpm --filter=server exec tsx src/index.ts  (env from e2e.env)  → waits for :3100/api/v1/status
                  Client: pnpm --filter=client exec vite --port 5174                      → waits for :5174
   2. setup       tests/auth.setup.ts: seed a user into MongoDB, log in through the form,
                  save cookies + localStorage to .auth/user.json
   3. chromium    tests/*.e2e.ts, every test starts already logged in from .auth/user.json
   4. both dev servers are stopped
```

MongoDB and Redis come from Compose rather than Testcontainers because Playwright starts `webServer` **before** `globalSetup` - containers started in `globalSetup` would come up after the API had already tried to connect.

The saved session holds both halves the app needs to consider a user logged in: the httpOnly `accessToken`/`refreshToken` cookies, and the `user` entry redux-persist keeps in localStorage.

## Configuration

| File                     | Purpose                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `e2e.env`                | Every variable the API needs, plus the client endpoint and the seeded user. All values are fake and safe to commit          |
| `playwright.config.ts`   | Projects, the two `webServer` entries, timeouts, retries, reporters                                                         |
| `support/environment.ts` | Loads `e2e.env` and exports typed constants; throws naming the variable if one is missing                                   |
| `support/database.ts`    | `seedActiveUser()` - writes an already-verified user straight into MongoDB, since real sign-up needs an emailed verify link |
| `docker-compose.yml`     | MongoDB and Redis for the suite                                                                                             |

| Service     | Port  | Why not the default                                                   |
| ----------- | ----- | --------------------------------------------------------------------- |
| API         | 3100  | Never collides with, or reuses, a dev server on 3000 pointed at Atlas |
| Client      | 5174  | Same, for Vite on 5173                                                |
| API metrics | 9474  | Same, for 9464/9465                                                   |
| MongoDB     | 27019 | The load-test stack already uses 27018                                |
| Redis       | 6381  | The load-test stack already uses 6380                                 |

`e2e.env` sets `NODE_ENV=test`, which makes the API skip `apps/server/.env` completely, so the suite cannot pick up real credentials by accident. It also uses Cloudflare's Turnstile **test keys** (`1x00000000000000000000AA` site key, `1x0000000000000000000000000000000AA` secret): the widget passes without interaction and the server-side verification always succeeds, but both still need network access to `challenges.cloudflare.com`.

Locally `reuseExistingServer` is on: if something already answers on `:3100` or `:5174` when the run starts - a server you started yourself, or one left behind by an interrupted run - Playwright uses it instead of starting its own. On CI it is off, so every run starts clean.

## Writing a test

- Name the file `*.e2e.ts` and put it in `tests/`. Playwright only picks up `*.e2e.ts` for the browser project, and the name keeps the file out of the Vitest lint rules that apply to `*.spec.ts`.
- Every test starts logged in as the seeded user. Tests share that user and one database, and run one at a time (`workers: 1`).
- Give anything you create a unique name - the existing tests use `` `E2E board ${Date.now()}` `` - because data is not cleared between runs until `pnpm e2e:down`.
- Create a `page.waitForResponse(...)` promise **before** the action that triggers the request, then await it. Creating it afterwards can miss a fast response.
- Drag-and-drop must go through `page.mouse`, not `locator.dragTo()`. The board's dnd-kit sensor only activates after the pointer moves 10px, so the `dragOnto()` helper in `tests/board.e2e.ts` presses, nudges 15px, then moves to the target in several steps.
- Prefer roles, labels and visible text for locators. The current helpers still lean on library internals (`.MuiCard-root`, dnd-kit's `aria-roledescription="sortable"`, `input[value=...]`), which can break on a MUI or dnd-kit upgrade.
- An `input[value="..."]` locator stops matching as soon as the value changes. To edit such a field, click it, then use `page.keyboard` - see the rename test.

## CI

The `e2e` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs in parallel with the main `ci` job: install, `pkg:build`, `playwright install --with-deps chromium`, `pnpm e2e:up`, `pnpm test:e2e`, and `pnpm e2e:down` even on failure.

On CI a failing test is retried once, `.only` fails the run, and failures appear as inline annotations through the `github` reporter.

When the job fails it uploads the HTML report as the **`playwright-report`** artifact, kept for 7 days. It includes a screenshot and a trace for every failing test. Download it from **Actions → the failed run → Summary → Artifacts**, unzip it, and open it with:

```bash
pnpm e2e exec playwright show-report <path-to-unzipped-folder>
```

Open it through `show-report` rather than double-clicking `index.html`: the trace viewer needs to be served over HTTP. A single `trace.zip` can also be dropped onto [trace.playwright.dev](https://trace.playwright.dev), which reads it locally in the browser.

## Troubleshooting

| Symptom                                                                   | Cause and fix                                                                                                                                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `connect ECONNREFUSED ...27019` or the API never becomes healthy          | The containers are not running. Run `pnpm e2e:up` first.                                                                                       |
| `Port 5174 is already in use` or `EADDRINUSE :3100`                       | Another process holds the port. Stop it, or let the reuse happen if it is a leftover E2E server.                                               |
| Tests pass or fail against code you have already changed                  | A leftover E2E server from an interrupted run is being reused. Stop the process on `:3100`/`:5174`, or run with `CI=1` to force fresh servers. |
| The `setup` test times out on the login step                              | Turnstile could not reach Cloudflare. Check network access to `challenges.cloudflare.com`; the suite cannot log in offline.                    |
| `Executable doesn't exist ... chromium`                                   | The browser is not installed: `pnpm e2e exec playwright install chromium`.                                                                     |
| The boards page gets slow or a "Go to board" locator picks the wrong card | Boards from earlier runs have piled up. `pnpm e2e:down` deletes the volume; the next `pnpm e2e:up` starts empty.                               |
