-- Committee availability and preferences are distinct from current route assignments.
ALTER TABLE judging_judges ADD COLUMN slot_preference TEXT NOT NULL DEFAULT '' CHECK(slot_preference IN ('','FN','AN','Any'));
ALTER TABLE judging_judges ADD COLUMN solution_preference TEXT NOT NULL DEFAULT '' CHECK(solution_preference IN ('','Technical','Non-Technical'));
ALTER TABLE judging_judges ADD COLUMN roster_status TEXT NOT NULL DEFAULT 'Main' CHECK(roster_status IN ('Main','Backup','Not responded','Not in current list'));
