# AI Conclave — Food

Independent project on `codex/food-dashboard`. Deploy separately from the attendance and registration dashboards. No application code or editing endpoints from those projects is included.

Shows Veg, Non-veg, present participants and unrecorded meal preferences. Each participant's latest attendance record is counted once; absent members and unsubmitted teams are excluded. Refreshes every 30 seconds while visible, with manual refresh and stale-data warnings.

## Access

Sign in using the existing `user1` account and its current database password. Only that attendance read-only account is accepted. Credentials are held in browser memory, never local/session storage, and checked on each HTTPS request. Reloading requires sign-in again. Password changes/revocation take effect at the next refresh. This project issues no sessions and performs no database writes. Never log Authorization headers. Set an edge rate limit on `/api/counts` before public deployment.

## Run and deploy

Node.js 22+ and Wrangler 4 required. No frontend dependencies.

```sh
npm test
npm run build
npm run dev
```

Local Wrangler uses a local database by default; it will not contain production records. For production create a **separate** Pages project named `aiconclave-food`, set its production branch to `codex/food-dashboard`, build command `npm run build`, output `dist`, and bind `DB` to the existing `aiconclave-registrations` database in `wrangler.toml`. Do not create or migrate another database. The shared database must already include attendance meal migration 0017.

```sh
wrangler pages deploy dist --project-name aiconclave-food --branch codex/food-dashboard
```

The binding itself is not database-level read-only: read-only access is enforced by this project's GET-only handler and SELECT-only queries. No registration or attendance mutation routes exist here.
