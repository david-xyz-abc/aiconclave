# Registration confirmation email deployment

Registration confirmation email is delivered by the Cloudflare Pages backend
through the Gmail API. The browser never receives the Gmail OAuth client secret,
refresh token, or access token.

## Required encrypted secrets

Configure these as encrypted secrets in both public Pages projects (`aiconclave-devsite`
and `aiconclave`):

- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `GMAIL_OAUTH_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`
- `GMAIL_SENDER_NAME`

Do not add these names to `wrangler.jsonc`, any `VITE_*` variable, or source control.
`GOOGLE_CLIENT_ID` is the separate public browser sign-in client and remains a plain
environment variable.

## Safe deployment order

1. Back up the remote D1 database.
2. Apply migrations `0006` and `0007` to the remote `aiconclave-registrations` database.
3. Deploy the `dev` build to `aiconclave-devsite` and submit one test registration.
4. Confirm its `registration_email_deliveries` row reaches `sent` and the PDF arrives.
5. Deploy the same tested commit to the production `aiconclave` project.

The migrations must run before the new Functions code is deployed because the shared
API middleware fails closed when its rate-limit table is unavailable.

From the repository root, the remote migration command is:

```powershell
npx wrangler d1 migrations apply aiconclave-registrations --remote
```

## Delivery behavior

- Panel confirmations go to the verified signed-in participant email.
- Hackathon confirmations go only to the team captain.
- Registration and its outbox record are saved atomically.
- Gmail delivery runs after the API response through `waitUntil`.
- A Gmail failure does not roll back or hide a valid registration.
- A unique database key prevents duplicate confirmation jobs.
- Transient provider failures are retried up to three times.
- No message body, PDF, password, OAuth token, or participant phone is stored in the
  email outbox.

## Operational checks

Check delivery totals without exposing participant email addresses:

```sql
SELECT status, COUNT(*) AS total
FROM registration_email_deliveries
GROUP BY status;
```

Inspect sanitized failure categories:

```sql
SELECT id, registration_type, attempts, last_error_code, updated_at
FROM registration_email_deliveries
WHERE status = 'failed'
ORDER BY updated_at DESC;
```
