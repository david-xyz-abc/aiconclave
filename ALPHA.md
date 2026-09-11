# Dashboard alpha

Branch: dashboard-dev-alpha. Site: https://aiconclave-dashboard-alpha.pages.dev

DB: aiconclave-registrations-alpha (2cef820f-583b-4e9a-9a2c-c2b72f0a48a7).

This is a one-time snapshot of production schema and records from 11 September 2026, including the current local dashboard cleanup and login-heading changes. It is not synchronized with production. It initially contains real participant data, not dummy records. Keep it protected by login.

Deployment, migrations and the local Vite API proxy target alpha only. Do not change these to production when testing. Existing account passwords are copied. No public registration forms, email sender or food website are deployed here. Production email delivery rows are inert in this dashboard; do not attach a mail-sending worker to this database.

Database exports must remain outside the repository and deployment output.
