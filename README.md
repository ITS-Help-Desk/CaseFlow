# CaseFlow

CaseFlow is the client for the USD ITS Help Desk case-claim workflow. Student techs claim the cases they're working, mark them complete, and leads review the completed queue — leaving feedback ("pings") that techs acknowledge and leads resolve. On top of that it provides reporting, case lookup, schedule analysis, and tech evaluations.

The client is a plain ES-module frontend with no build step. The same `src/` tree runs two ways:

- as an **Electron desktop app** (`npm start`), and
- as a **static web app** served by Nginx on the help desk Raspberry Pi, so anyone on the campus network can use it from a browser.

All data lives in [CaseClaimAPI](https://github.com/ITS-Help-Desk/CaseClaimAPI), a Django REST Framework + Channels backend. CaseFlow talks to it over HTTP for everything and over a single WebSocket for live updates. **CaseFlow does not work without the API running** — there is no local database and no offline mode.

## Requirements

- Node.js 18+ and npm (only needed for the Electron build; the browser deployment needs neither)
- A reachable CaseClaimAPI instance
- An account in that API, with a role assigned by a Lead or Manager

## Running the desktop app

```bash
npm install
npm start
```

`main.js` calls `loadFile('src/index.html')` relative to the process working directory, so run `npm start` from the project root rather than from `src/`.

There is also `npm run dev`, which passes `--debug` to Electron, but nothing in `main.js` reads that flag — it behaves identically to `npm start`. Open DevTools from the keyboard instead. To package a distributable, `npm run build` invokes `electron-builder`, which is not currently in `devDependencies`, so install it first.

## Running as a web app

The Nginx config and deploy script live in the backend repo, not this one. From a checkout of `CaseClaimAPI` sitting next to `CaseFlow`, on the Pi:

```bash
./nginx/deploy-web.sh
```

That copies `config.js` and `src/` to `/var/www/caseflow`, installs `nginx/caseflow.conf`, and restarts Nginx. Nginx serves the frontend and reverse-proxies `/api/` and `/ws/` to Daphne on port 8000. The directory structure is preserved deliberately: `index.html` imports `../../config.js`, so `config.js` has to sit one level above `src/`.

## Configuration

`config.js` is the only place the backend location is set, and it picks a mode automatically:

```3:9:config.js
// Detect if running inside Electron or in a regular browser
const isElectron = typeof window !== 'undefined' && typeof window.process !== 'undefined';

// In Electron, use the direct Pi address. In a browser, use relative URLs
// (Nginx proxies /api/ and /ws/ to Django automatically)
const PI_ADDRESS = 'http://10.80.20.32:8000';
export const API_BASE_URL = isElectron ? PI_ADDRESS : '';
```

In Electron the Pi address is hardcoded and requests go straight to Daphne. In a browser, `API_BASE_URL` is empty so all requests are same-origin and Nginx does the proxying. Pointing the desktop app at a different backend (a local Django instance, say) means editing `PI_ADDRESS`.

## Authentication and roles

Login and signup post to `/api/user/login/` and `/api/user/signup/`. The returned DRF token is kept in `localStorage` and sent as `Authorization: Token <token>` on every request. If the API responds with `must_reset_password`, the login screen switches to a "set new password" form before letting the user in.

Roles come from Django groups and are hierarchical — a higher role implies everything below it:

| Role | Level | Adds |
| --- | --- | --- |
| Tech | 1 | Claim, complete, and unclaim cases; acknowledge pings on own work |
| Lead | 2 | Review completed cases, issue and resolve pings, reports, case lookup, evaluations, edit user roles |
| Phone Analyst | 3 | — |
| Manager | 4 | — |

`src/utils/permissions.js` mirrors the backend's `ROLE_HIERARCHY` so the UI can hide controls the server would reject anyway. It is a convenience, not a security boundary; the API enforces the same rules with its `@role_required` decorator.

## The case lifecycle

A case moves through three backend tables, and each stage is a different view in the app:

1. **Claim** — a tech enters a case number, which is normalized to 8 digits with leading zeros. This creates an `ActiveClaim`. Everyone sees every active claim, so two people don't pick up the same case. Techs can unclaim their own; Leads can unclaim anyone's.
2. **Complete** — the tech marks the case done. The `ActiveClaim` becomes a `CompleteClaim` and moves into the review queue.
3. **Review** — a Lead opens the case (`begin-review` locks it to that Lead so two Leads don't double-review), then closes it out as `done`, `checked`, `kudos`, or a ping at low/medium/high severity with a comment. This produces a `ReviewedClaim`.

A ping is a feedback loop rather than a terminal state: the tech acknowledges it, optionally with a comment, and a Lead then resolves it. The **pings** view splits these into active, acknowledged, and completed tabs.

**Parent cases** sit outside this flow. They're shown in the right sidebar as shared context for known widespread issues — a case number, a description, and an optional solution — and stay visible until someone marks them inactive.

## Real-time updates

The backend broadcasts to a single Channels group, `caseflow`, and the client keeps one WebSocket open to `/ws/caseflow/`. Every message has the shape `{ type, event, casenum, user }`, with two types: `activeclaim` carries the `claim`, `complete`, and `unclaimed` events, and `completeclaim` carries `begin-review` and `review`.

`src/utils/websocket-manager.js` owns the connection: one socket per channel name, automatic reconnect with up to 5 attempts at 3-second intervals, and an auth handshake on open. Because only one socket exists but several components need the traffic, `index.html` wraps the manager's `onmessage` handler and fans each message out to `completedCases` and `pings` before calling the original handler from `ClaimCase`.

## Views

| View | Role | What it does |
| --- | --- | --- |
| home | Tech+ | Profile editing plus tech and lead leaderboards, filterable by week, month, or semester |
| claim-case | Tech+ | The live queue of active claims, with claim, complete, and unclaim actions |
| completed-cases | Lead+ | Review queue; opens the feedback form that issues pings |
| pings | Tech+ | Active, acknowledged, and completed pings |
| reports | Lead+ | Four tabs: case lookup, case statistics, schedule stats, evaluations |
| user management | Tech+ / Lead+ | Lists all users; the role-editing controls appear only for Lead and above |
| announcements, resources, logs-chat | — | Placeholder UI rendering hardcoded sample data; no backend behind them yet |

The sidebar itself isn't role-aware — every entry is visible to everyone. A Tech who opens the reports or completed-cases view gets a view that fails to populate, because the underlying endpoints return 403. The "Role" column above describes what the API permits, not what the navigation hides.

The **reports** view carries most of the app's weight. *Case lookup* searches any case number and returns its full history across all three tables. *Case statistics* shows summary cards and per-user breakdowns over a selectable window. *Schedule stats* takes an `.ics` calendar URL and computes labor hours split by tech and lead, with daily and per-person breakdowns. *Evaluations* lets Leads create, edit, and delete tech evaluations, preview a tech's metrics for a period before writing the review, and bulk-generate a month's evaluations as Word documents in a ZIP.

## Project layout

```
config.js                  API and WebSocket URL resolution (imported by every component)
src/
  main.js                  Electron entry point
  index.html               Single-page shell: all views, modals, and component wiring
  components/              One class per view, default-exported and instantiated in index.html
    cases/claim-case.js    Owns the primary WebSocket connection
    reports.js             Largest component; lookup, stats, schedule, evaluations
  styles/                  master.css defines the design tokens; one file per component
  utils/
    error-handler.js       Global error capture, toast notifications, component init wrapper
    permissions.js         Client-side mirror of the backend role hierarchy
    websocket-manager.js   Connection pooling, auth, reconnect
```

Components are instantiated through `errorHandler.initializeComponent()`, so one component throwing in its constructor doesn't take the rest of the app down — it logs, shows a notification, and returns `null`. Each instance is then assigned to `window` for cross-component calls (`window.claimCase.promptForClaim()` and similar). See `src/styles/README.md` for the CSS design-token system.

## Known gaps

These are real, and worth knowing before debugging something that was never wired up:

- **`preload.js` is dead code.** `main.js` doesn't set `preload` in `webPreferences`, so `window.electron` is never defined and the IPC channels it declares (`add-case`, `get-active-cases`, and so on) don't exist. Those were from an earlier local-database design.
- **The sidebar database-status indicator never runs.** It looks for `.status-dot` and `.status-text` elements that exist in `left-sidebar.css` but not in `index.html`, and it depends on the missing `window.electron` bridge.
- **`database.sqlite` in the project root is unused.** Nothing reads it; it's a leftover from the same earlier design.
- **The WebSocket auth handshake is one-sided.** The client sends an auth message on connect, but the backend consumer accepts every connection and never replies, so `handleAuthResponse` is unreachable and the socket is effectively unauthenticated.
- **The Electron window disables several protections** — `nodeIntegration: true`, `contextIsolation: false`, and `webSecurity: false`. The last is what lets the renderer make cross-origin requests to the Pi. Enabling context isolation would require routing API calls through a preload bridge.
- **`announcements`, `resources`, and `logs-chat` are mockups**, rendering hardcoded sample content.

## Contributing

The backend repo's [contributing guide](https://github.com/ITS-Help-Desk/CaseClaimAPI#contributing) applies here too: branch off `main`, get approval before starting a feature, then open a pull request. Since there's no build step or bundler, adding a view means creating the component, its stylesheet, a sidebar entry and container div in `index.html`, and an import in the module script at the bottom of that file.
