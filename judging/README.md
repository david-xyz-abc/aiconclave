# Judging operations

Separate Cloudflare Pages app for the venue team. Uses the production D1 database's existing seating records and independent accounts in `judging_users` with the `venue_admin` role. Authentication uses the dedicated `__Host-aiconclave_judging_session` cookie; attendance/admin sessions are not accepted. Passwords are salted PBKDF2 hashes, never frontend constants or committed credentials. No registration or attendance mutation endpoints are deployed here.

Run from the repository root:

- `npm run dev:judging` — UI development on port 5190 (API requires Pages or test fixtures).
- `npm run build:judging` — builds `judging/dist`.
- `npm test` — includes assignment rules, SQL transactions, concurrency and access checks.
- From `judging/`, `wrangler pages dev dist` runs the frontend and Functions with a local D1 database. Provision the existing schema plus migrations 0021–0023 first. Never seed browser fixtures into the remote database.

Deployment: `.github/workflows/deploy-judging.yml` deploys only the separate `aiconclave-judging` Pages project from the `judging-production` branch. Apply `db/migrations/0021_judging_admin.sql`  , `db/migrations/0022_judging_auth.sql`, and `db/migrations/0023_judge_evaluations.sql` to the production D1 database once before the first deployment; normal deployments do not run schema migrations. The root dashboard deployment remains independent.

Staff add judges individually or paste one name per line, assigning a Technical / Non-Technical side. The assignment screen filters by side, sector and preparation mode. A starting team and count define a consecutive range in the filtered walking order. Suggestions prefer one room; spillover follows the configured room order. Empty and ineligible tables do not count. A team assigned to another judge blocks a range; it is never silently skipped or stolen. Saving replaces a judge's complete route, with confirmation. Staff can release a route before assigning those teams elsewhere.

Room walking order starts with the existing room order and must be confirmed against the physical venue. Staff can move rooms up or down. Reordering cannot break an otherwise valid saved judge route. Later seating or eligibility changes flag affected routes for staff review.

Every write uses an audited revision guard inside a D1 transaction. Seating and eligibility changes increment the same revision. A stale preview rejects the entire write with HTTP 409. `judging_assignments.team_id` is unique, enforcing one judge per team. Assignment history is retained in `judging_changes` including replaced/released routes and the staff actor.

Judges sign in at `/judges/login`, see only their assigned teams and team leader names, and evaluate in three steps: sector nominations, scoring, and final review. The sector determines the six award checkboxes; multiple or no nominations are allowed. All sectors use Impact, Creativity, Validity, Relevance and Presentation, each scored with integer buttons from 0–5 (25 total). Registration and seating details are readonly metadata.

Next saves nominations to a server draft. Save draft allows partial scores; Save evaluation requires all five scores and opens the final review. Submit details permanently locks scores and nominations. A separate revision prevents competing tabs from overwriting a draft or submission. The server validates ownership, eligibility, score bounds, sector award IDs and completeness; the client cannot supply a total or override a submitted score.

The venue **Emergency** tab lists evaluations and their history. Reopening requires a reason and the current evaluation/workspace revisions. It preserves the old submitted snapshot in `judging_evaluation_history`, records the administrator and reason, and restores draft status. The judge must refresh, edit and resubmit. Routes with submitted evaluations cannot be released or replaced until the affected submissions are reopened. Judges with evaluation history cannot be deleted.

The **Judges** tab creates or resets an individual login ID and password for each roster entry. Resetting credentials revokes that judge’s active sessions. No judge accounts are seeded automatically.

The landing page offers Judge and Venue team login. Venue team sign-in is at `/team/login`; `/judges/login` accepts individual judge credentials. Judge roster entries do not create accounts. Venue account provisioning is performed separately from source migrations.
