-- Judges are not categorised. Solution type belongs to their current team selection.
ALTER TABLE judging_judges ADD COLUMN assignment_solution_type TEXT NOT NULL DEFAULT 'Technical' CHECK(assignment_solution_type IN ('Technical','Non-Technical'));
UPDATE judging_judges SET assignment_solution_type=solution_type;
ALTER TABLE judging_judges DROP COLUMN solution_type;
ALTER TABLE judging_judges ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE judging_judges ADD COLUMN department TEXT NOT NULL DEFAULT '';
UPDATE judging_state SET revision=revision+1 WHERE id=1;
