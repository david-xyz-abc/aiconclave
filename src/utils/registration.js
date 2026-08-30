export function formatDate(value) {
  if (!value) return "—";
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function displayValue(value) {
  return value === null || value === undefined || value === ""
    ? "Not provided"
    : value;
}

export function formatParticipantType(value) {
  return value === "Other"
    ? "Other (Agriculture, Education or Healthcare Delegate)"
    : value;
}

export function parseTracks(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function searchableRegistrationText(registration) {
  return [
    registration.team_code,
    registration.team_name,
    registration.participant_category,
    registration.sector_track,
    registration.solution_type,
    registration.name,
    registration.email,
    registration.phone,
    registration.participant_type,
    formatParticipantType(registration.participant_type),
    registration.organisation,
    registration.department,
    registration.panel_selection,
    registration.industry_sector,
    registration.industry_sector_other,
    registration.organisation_type,
    registration.organisation_type_other,
    registration.tracks,
    registration.challenge_area,
    registration.subcategory,
    registration.problem_area,
    registration.idea_summary,
    ...(registration.members || []).flatMap((member) => [
      member.full_name,
      member.email,
      member.phone,
      member.institution,
      member.department_or_course,
      member.year_or_grade,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
