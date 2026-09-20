# Check-in API delivery

New present attendance records create a durable delivery inside the attendance transaction, through D1 triggers. Event ID is `3`. Pages starts delivery in `waitUntil`; the minute cron drains only unattempted pending deliveries if that background work is interrupted.

The unique event/member and event/normalized-email keys persist independently of team/member deletion. A durable `pending` → `sending` claim precedes the POST. No code resets an attempted delivery to pending. Re-saving attendance, absent → present, another date, or simultaneous senders cannot send it again. This favors at-most-one attempt: a process dying after its claim but before fetch may leave an unsent participant marked uncertain. There is deliberately no retry endpoint.

Only HTTP success with JSON `status: true` confirms delivery. False responses are failed; timeouts, unknown responses and abandoned claims are uncertain. Check-in succeeds independently of remote availability. Staff can inspect each team's “Event participant API status”. No response access links or participant data are logged.

## Production activation

1. Apply only `db/migrations/0039_stock_checkin_delivery.sql` (disabled initially).
2. Deploy the Pages release and `wrangler deploy --config stock-sync/wrangler.jsonc`.
3. Execute the two statements in `scripts/activate-stock-sync.sql` as one D1 batch. This permanently excludes prior present attendees before enabling triggers. Repeating activation does not backfill or reset attempts.
4. Verify control row, excluded counts, deployment and cron. Do not create attendance or send test participants to test the integration.

To pause, set `stock_sync_control.enabled=0`; this pauses both enqueue and dispatch. Never delete delivery tombstones or reset states. The activation script will not re-enable a paused integration; that requires an intentional update.

Activated production on 2026-09-15 at 16:35:10 UTC (22:05:10 IST). All 433 prior present participants were excluded; zero API attempts existed at verification. Dashboard deployment: `332e2ad6`. Background Worker version: `58c2a3ed-da9a-4c38-8646-7e5e90ba636d`.

Validation: nine focused mocked integration tests, the full repository suite (29 test files), production build, Worker dry-run, and production authentication/build checks. No additional external participant entries were created during implementation.
