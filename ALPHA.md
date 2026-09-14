# Alpha sandbox

Branch: dashboard-dev-alpha.

- Operations: https://aiconclave-dashboard-alpha.pages.dev
- Judging: https://aiconclave-judging-alpha.pages.dev
- Room Finder: https://aiconclave-room-finder-alpha.pages.dev

All three sites use D1 `aiconclave-registrations-alpha-clone-20260914` (`11854aec-284c-4994-b9f4-3cea51116d59`). Production D1 must never be used for alpha writes.

## Production snapshot refresh

The new database is a verified snapshot of production, including schema, account credentials and event records. At refresh: 552 hackathon teams, 1904 members, 64 judges, no judge assignments or evaluations. All 38 application-table/ID-sequence checksums matched the source snapshot. It is not continuously synchronized.

Source bookmark: `00000ee1-00000008-000050e6-329059d9768439c038ee558eebfd2fc8`.

Old alpha D1 `2cef820f-583b-4e9a-9a2c-c2b72f0a48a7` is retained solely for rollback; it still contains the old simulation. Its pre-refresh bookmark is `00000040-00000000-000050e6-b48850e8f77eb0037acdde8be94d4ac8`. Do not deploy current alpha sites against it accidentally.

Cached team/room directories use a new cache version so old simulated entries are not reused. Login sessions and credentials are from the production snapshot; the independent Excel and Room Finder secrets remain environment-specific Pages secrets. Food continues linking to the existing production Food website by explicit user instruction.

Production migration history is already present in the clone. Do not replay historical seed/reset migrations or `db/production/0030_promote_alpha_operations.sql`. Apply only new, reviewed alpha migrations. Do not enable an email sender for copied historical delivery records. Exports and participant data must not be committed to Git.

Current room plan has 23 venues and 568 tables, with mixed seats per room. Technical prepared teams use exhibition rooms; technical scratch teams use other technical rooms; both non-technical modes use non-technical rooms. Sectors may mix. Judge assignment filters select solution type then preparation; physical visit order is preserved.
