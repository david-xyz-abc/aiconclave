# Judging operations

Separate Cloudflare Pages app for the venue team. Uses the alpha D1 database's existing seating records and staff accounts with `attendance_access=write`. Cookies are host-scoped; staff sign in separately on this site. No registration or attendance mutation endpoints are deployed here.

Run from the repository root:

- `npm run dev:judging` — UI development on port 5190 (API requires Pages or test fixtures).
- `npm run build:judging` — builds `judging/dist`.
- `npm test` — includes assignment rules, SQL transactions, concurrency and access checks.
- From `judging/`, `wrangler pages dev dist` runs the frontend and Functions with a local D1 database. Provision the existing schema plus migration 0021 first. Never seed browser fixtures into the remote database.

Deployment: `.github/workflows/deploy-judging.yml` deploys only the separate `aiconclave-judging-alpha` Pages project. Apply `db/migrations/0021_judging_admin.sql` to the alpha D1 database once before the first deployment; normal deployments do not run schema migrations. The root dashboard deployment remains independent.

Staff add judges individually or paste one name per line, assigning a Technical / Non-Technical side. The assignment screen filters by side, sector and preparation mode. A starting team and count define a consecutive range in the filtered walking order. Suggestions prefer one room; spillover follows the configured room order. Empty and ineligible tables do not count. A team assigned to another judge blocks a range; it is never silently skipped or stolen. Saving replaces a judge's complete route, with confirmation. Staff can release a route before assigning those teams elsewhere.

Room walking order starts with the existing room order and must be confirmed against the physical venue. Staff can move rooms up or down. Reordering cannot break an otherwise valid saved judge route. Later seating or eligibility changes flag affected routes for staff review.

Every write uses an audited revision guard inside a D1 transaction. Seating and eligibility changes increment the same revision. A stale preview rejects the entire write with HTTP 409. `judging_assignments.team_id` is unique, enforcing one judge per team. Assignment history is retained in `judging_changes` including replaced/released routes and the staff actor.

The evaluation form and judge sign-in will be added after the scoring format is provided. Judge records created here are roster entries, not login credentials.
