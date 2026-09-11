# Dashboard alpha

Branch: dashboard-dev-alpha. Site: https://aiconclave-dashboard-alpha.pages.dev

DB: aiconclave-registrations-alpha (2cef820f-583b-4e9a-9a2c-c2b72f0a48a7).

This is a one-time snapshot of production schema and records from 11 September 2026, including the current local dashboard cleanup and login-heading changes. It is not synchronized with production. It initially contains real participant data, not dummy records. Keep it protected by login.

Deployment, migrations and the local Vite API proxy target alpha only. Do not change these to production when testing. Existing account passwords are copied. No public registration forms, email sender or food website are deployed here. Production email delivery rows are inert in this dashboard; do not attach a mail-sending worker to this database.

Database exports must remain outside the repository and deployment output.

CI tests, builds and deploys alpha only. The existing GitHub token lacks D1 migration permissions. If a future change needs a migration, apply it explicitly using authorized Wrangler access: `wrangler d1 migrations apply aiconclave-registrations-alpha --remote`, before deploying that change. The initial clone has all current migrations applied.

## Venue allocation

`/attendance` records an explicit Prepared / Starting from scratch selection and atomically assigns a compatible table when attendance is saved. Matching uses project mode, sector, solution type, and **members actually present** (minimum two, with the lead present). Compatible assignments survive repeat saves; changed requirements release and reallocate the table in the same transaction. No compatible table means attendance is retained and the team waits.

`/attendance/venues` uses the attendance login and has Venue Finder, Manual Allocation, and Rooms & Tables menus. Attendance readers can inspect; attendance writers can assign compatible free tables to unallocated checked-in teams. Missing attendance and missing project mode are distinct states. Availability refreshes every ten seconds; database uniqueness and atomic SQL claims protect against stale screens and simultaneous staff requests.

Apply `0019_venue_allocation.sql` and `0020_alpha_venue_plan.sql` to **alpha only** before publishing the new code. These add venue tables and a requirements view; existing registrations and attendance are not rewritten. Existing attendance needs a project-mode choice before allocation. For a fresh local database, `db/schema.sql` includes the venue schema; apply only the room seed after loading that schema.

The provisional plan has 53 rooms / 565 tables: RS 16 rooms, R 16, CC 16, D 5; 46 rooms have ten tables and seven have fifteen. It assumes approximately half of each registered sector / solution / size group arrives prepared, full attendance, and no separation by school/college. These are proposed rooms, not a verified physical inventory. Unknown project mode and absences can exhaust individual categories despite free tables elsewhere. `node scripts/seed-venue-plan.mjs` reproduces the seed from aggregate counts. Once applied, change the plan with a new migration rather than rerunning the seed or modifying migration history.

Allocation tests include real concurrent SQLite connections, duplicate claims, repeat attendance, changed mode/headcount, waiting-list resolution, permissions, and transactional rollback. Run `npm test` and `npm run build` before deploying.
