export const SIDES = ["Technical", "Non-Technical"];
export const MODES = ["Prepared", "Starting from scratch"];
export function orderedTeams(data, filters) {
  const positions = new Map(data.rooms.map((room, index) => [room.id, index]));
  return data.teams
    .filter(
      (team) =>
        team.table_id &&
        team.attendance_marked &&
        team.lead_present &&
        team.present_count >= 2 &&
        team.table_seats >= team.present_count &&
        team.solution_type === filters.solution_type &&
        (!filters.sector || team.sector_track === filters.sector) &&
        (!filters.mode || team.project_mode === filters.mode),
    )
    .sort(
      (a, b) =>
        positions.get(a.room_id) - positions.get(b.room_id) ||
        a.table_number - b.table_number,
    );
}
export function previewAssignment(data, judgeId, filters, startTeamId, count) {
  const judge = data.judges.find((j) => j.id === judgeId);
  if (!judge) return { teams: [], error: "Select a judge." };
  if (judge.solution_type !== filters.solution_type)
    return { teams: [], error: "Select teams on the judge’s assigned side." };
  if (!Number.isInteger(count) || count < 1 || count > 100)
    return { teams: [], error: "Choose between 1 and 100 teams." };
  const ordered = orderedTeams(data, filters);
  const start = ordered.findIndex((t) => t.team_id === startTeamId);
  if (start < 0)
    return {
      teams: [],
      error: "Choose a starting team with a valid room and table.",
    };
  const teams = ordered.slice(start, start + count);
  if (teams.length !== count)
    return {
      teams: [],
      error: "There are not enough matching teams after this starting table.",
    };
  if (teams.some((t) => t.judge_id && t.judge_id !== judgeId))
    return {
      teams,
      error:
        "This range includes a team assigned to another judge. Choose a different range.",
    };
  return { teams, error: "" };
}
export function suggestStart(data, judgeId, filters, count) {
  const teams = orderedTeams(data, filters);
  let fallback = null;
  for (const team of teams) {
    const preview = previewAssignment(
      data,
      judgeId,
      filters,
      team.team_id,
      count,
    );
    if (preview.error) continue;
    if (preview.teams.every((t) => t.room_id === team.room_id))
      return team.team_id;
    fallback ??= team.team_id;
  }
  return fallback;
}
export function judgeRoute(data, judge) {
  const assigned = data.assignments
    .filter((a) => a.judge_id === judge.id)
    .sort((a, b) => a.visit_order - b.visit_order);
  if (!assigned.length) return { teams: [], needsReview: false };
  const teams = assigned.map((a) => ({
    ...data.teams.find((t) => t.team_id === a.team_id),
    ...a,
  }));
  const filters = {
    solution_type: judge.solution_type,
    sector: judge.sector_filter,
    mode: judge.mode_filter,
  };
  const ordered = orderedTeams(data, filters);
  const start = ordered.findIndex((t) => t.team_id === assigned[0].team_id);
  const needsReview =
    start < 0 ||
    assigned.some((a, index) => {
      const current = ordered[start + index];
      return (
        !current ||
        current.team_id !== a.team_id ||
        current.table_id !== a.table_id
      );
    });
  return { teams, needsReview };
}
