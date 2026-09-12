# Dashboard and judging deployment

`dashboard-dev` deploys the operations dashboard at https://aiconclave-dashboard.pages.dev while the independent `judging-production` branch deploys venue management and the judges’ portal at https://aiconclave-judging.pages.dev. Both bind `DB` to `aiconclave-registrations` (`cfc0669f-3de7-4429-ab54-686e966bb56b`). Registration and food websites share this database, but their branches and deployments are independent.

Make production judging changes on `judging-production`, primarily under `judging/`. Its workflow only deploys from that branch; dashboard pushes cannot publish judging changes. The dashboard workflow similarly only deploys from `dashboard-dev`, including manual workflow runs. The branches retain shared source history and helper modules; deliberately merge or cherry-pick shared fixes when both apps need them.

Alpha remains on `dashboard-dev-alpha`, with separate Pages projects and database. Never copy alpha registrations, attendance, check-ins, allocations, judges, evaluations, or sessions into production.

## Database upgrades

Apply migrations explicitly before deploying code that depends on them. The Pages CI token does not have D1 migration permissions; normal CI deployments test and build the app, without attempting database migrations. Use authorized D1 access, check `d1_migrations`, and record each migration in that table in the same transaction as its SQL.

The initial alpha promotion adds migrations 0019–0023, in order. They add venue configuration/check-ins/allocations, judging assignments, separate authentication, evaluation drafts, locked submissions, and audit history. Existing registration and attendance rows are retained. Existing attendance needs a preparation-mode choice before a table can be allocated.

`0020_alpha_venue_plan.sql` retains its original migration filename and contents so migration history stays consistent across environments. It contains only the proposed 53-room / 565-table configuration, with 10 or 15 tables per room. It contains no participant assignments. These room names and capacities are provisional and must match the event's physical inventory before use. Change an applied plan with a new migration; do not regenerate or rerun the seed in production.

Venue-team access is provisioned separately as a salted password hash in `judging_users`. No passwords, dummy judges, test attendance, or test evaluations are seeded by migrations. Staff create judge accounts from the Judges tab when the roster is ready.

## Release checks and recovery

Before applying migrations, capture the live schema, migration ledger, record counts, a D1 Time Travel bookmark, and the current Pages deployment IDs. Rehearse the upgrade on a local database with the live schema, and run `npm test`, `npm run build`, and `npm run build:judging` with Node 22. After deployment, verify the live database bindings and authenticated dashboard, attendance, venue, and judging reads. Production smoke checks must not mark attendance or submit evaluations.

The promotion is additive, so the previous dashboard deployment can run against the upgraded schema. If the frontend or Functions regress, roll back the Pages deployment first, leaving the data in place. Use database Time Travel only as an emergency recovery action after accounting for registrations and staff updates made since the bookmark; a full restore would discard those later writes. Never reset production from an alpha snapshot.
