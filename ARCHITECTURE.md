# AI Conclave application architecture

The project is organised by responsibility so changes to one event do not leak into unrelated pages.

## Frontend

- `src/app/` owns routing and application-wide browser behaviour.
- `src/components/` contains reusable visual building blocks such as the site shell.
- `src/config/` contains stable routes and event metadata.
- `src/features/auth/` owns Google sign-in state and participant access UI.
- `src/features/public/` contains the public event pages.
- `src/features/registrations/` owns registration forms, validation configuration, account records and tickets.
- `src/services/` is the only frontend layer that communicates with HTTP APIs.
- `src/styles/` keeps ordered styles grouped by responsibility. `style.css` only defines their load order.

`src/App.jsx` is intentionally small. It composes the router, site shell and intro without containing page implementations.

## Cloudflare backend

- `functions/api/` contains the deployed Pages Functions endpoints.
- `functions/_lib/` contains shared request, authentication and domain helpers.
- `db/migrations/` is the source of truth for D1 schema changes.
- `db/schema.sql` documents the resulting schema; migrations are still used for deployments.

There must be only one deployed implementation of each endpoint. Backend code should not be copied under `db/`.

## Dependency direction

Dependencies flow from `app` to `features`, from `features` to `services` and `config`, and never back into `App.jsx`. Public pages may use shared event configuration but should not import registration implementation details.

## Verification

Run `npm run build` after every structural or UI change. Registration behavior that depends on Pages Functions and D1 must also be checked with the Cloudflare local server or a preview deployment.
