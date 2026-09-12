ALTER TABLE judging_users ADD COLUMN judge_id TEXT REFERENCES judging_judges(id);
CREATE UNIQUE INDEX judging_user_judge ON judging_users(judge_id) WHERE judge_id IS NOT NULL;
CREATE TABLE judging_evaluations (
 team_id INTEGER PRIMARY KEY REFERENCES hackathon_teams(id),
 judge_id TEXT NOT NULL REFERENCES judging_judges(id),
 revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
 nominations TEXT NOT NULL DEFAULT '[]', nominations_saved INTEGER NOT NULL DEFAULT 0,
 scores TEXT NOT NULL DEFAULT '{}',
 team_snapshot TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 submitted_at TEXT
);
CREATE TABLE judging_evaluation_history (
 id TEXT PRIMARY KEY, team_id INTEGER NOT NULL, judge_id TEXT NOT NULL,
 actor TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
 previous_snapshot TEXT, next_snapshot TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX judging_evaluation_history_team ON judging_evaluation_history(team_id,created_at);
