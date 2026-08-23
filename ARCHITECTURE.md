# AI Conclave Dashboard Architecture

The dashboard is organised by responsibility so that event modules can evolve independently without coupling UI, networking, and routing logic.

## Source layout

- `src/App.jsx` — application composition and session boundary only.
- `src/components/` — reusable visual components shared by features.
- `src/config/` — route and dashboard section definitions.
- `src/features/` — feature-owned screens and components for authentication, overview, and registrations.
- `src/hooks/` — route state and cached dashboard data orchestration.
- `src/services/` — the browser API client and HTTP error handling.
- `src/utils/` — pure registration formatting and search helpers.
- `functions/api/` — authenticated Cloudflare Pages API endpoints.
- `functions/_shared/` — server-only authentication helpers.
- `db/` — D1 schema used by the dashboard environment.

## Data flow

1. `App` restores the administrator session.
2. `Dashboard` selects a feature from the current route.
3. `useDashboardData` requests and caches the relevant directory or overview data.
4. `dashboardApi` is the only frontend layer that communicates with `/api`.
5. Feature components render, filter, inspect, or delete records without owning network code.

The existing API paths, response shapes, page routes, CSS class names, authentication behavior, and database queries remain unchanged by this refactor.
