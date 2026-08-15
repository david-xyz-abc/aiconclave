# Participant Google Sign-In setup

The browser receives only the OAuth client ID. Do not expose or configure the Google client secret in Vite.

## Local Pages development

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Set `GOOGLE_CLIENT_ID` to the Web application client ID from Google Cloud Console.
3. Run `npm run db:migrate:local` once to create the local D1 tables.
4. Stop the normal Vite server, then run `npm run dev:pages`.
5. Open `http://localhost:5173/register`.

Do not use `npm run dev` to test sign-in. That command serves only the React frontend, while Google Sign-In also requires the `/api/*` Pages Functions and D1 binding.

The existing `.env` values named `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_SECRET` are not used. Delete the client-secret entry; anything prefixed with `VITE_` can be bundled into browser code.

## Cloudflare Pages

Add `GOOGLE_CLIENT_ID` as a Pages environment variable for both Preview and Production. A Google client secret is not required by this Google Identity Services ID-token flow.

In the Google OAuth Web client, keep these JavaScript origins (with no trailing path):

- `http://localhost:5173`
- `https://aiconclave-devsite.pages.dev`
- `https://dev.aiconclave-devsite.pages.dev`
- The final custom production domain when it is connected

No redirect URI is needed for the popup callback used by this site.

## Database migration

Apply `db/migrations/0002_participant_auth.sql` to the target D1 database before deploying the new application code. It creates participant accounts and hashed server sessions, then links panel registrations to their owning account.

After deployment, verify this sequence:

1. Open `/register` in a signed-out browser.
2. Confirm event choices are hidden until Google Sign-In completes.
3. Submit a panel registration and confirm its email matches the signed-in account.
4. Open `/my-registration`, verify the saved details, then test Sign out.
