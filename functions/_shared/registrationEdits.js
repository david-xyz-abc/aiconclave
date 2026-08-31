const PANEL_PARTICIPANT_TYPES = new Set([
  "Faculty",
  "Professional / Industry Delegate",
  "Researcher",
  "Other",
]);
const PANEL_SELECTIONS = new Set([
  "AI in Agriculture",
  "AI in Education",
  "AI in Healthcare",
]);
const INDUSTRY_SECTORS = new Set([
  "",
  "Agriculture",
  "Education",
  "Healthcare",
  "IT / Technology",
  "Government",
  "Other",
]);
const ORGANISATION_TYPES = new Set([
  "",
  "Startup",
  "MSME",
  "Corporate",
  "Government",
  "Academic Institution",
  "Research Organization",
  "NGO",
  "Other",
]);
const TEAM_CATEGORIES = new Set(["School", "College"]);
const TEAM_SECTORS = new Set(["Agriculture", "Education", "Healthcare"]);
const SOLUTION_TYPES = new Set(["Technical", "Non-Technical"]);
const LEGACY_CHALLENGES = new Set(["Agriculture", "Health", "Education"]);
const LEGACY_PARTICIPANT_TYPES = new Set([
  "Student",
  "Faculty",
  "Professional / Industry Delegate",
  "Researcher",
  "Other",
]);

const PANEL_FIELDS = new Set([
  "name",
  "phone",
  "participant_type",
  "organisation",
  "department",
  "panel_selection",
  "industry_sector",
  "industry_sector_other",
  "organisation_type",
  "organisation_type_other",
  "updates_opt_in",
]);
const TEAM_FIELDS = new Set([
  "team_name",
  "participant_category",
  "sector_track",
  "solution_type",
  "members",
]);
const MEMBER_FIELDS = new Set([
  "id",
  "version",
  "full_name",
  "phone",
  "institution",
  "department_or_course",
  "year_or_grade",
]);
const LEGACY_FIELDS = new Set([
  "name",
  "phone",
  "participant_type",
  "organisation",
  "tracks",
  "challenge_area",
  "subcategory",
  "problem_area",
  "idea_summary",
]);

function trimString(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizeIndianPhone(value) {
  if (typeof value !== "string" || !/^[+\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

function positiveVersion(value) {
  const version = Number(value);
  return Number.isInteger(version) && version > 0 ? version : null;
}

function rejectUnknownFields(value, allowed, fields, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fields._form = "The submitted changes are invalid.";
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fields[`${prefix}${key}`] = "This field cannot be edited.";
  }
}

function panelDisplayType(value) {
  return value === "Faculty / Academic" ? "Faculty" : value;
}

function panelStoredType(value) {
  return value === "Faculty" ? "Faculty / Academic" : value;
}

export function validatePanelEdit(body) {
  const fields = {};
  const version = positiveVersion(body?.version);
  if (!version) fields._version = "Reload this registration before editing it.";
  const changes = body?.changes;
  rejectUnknownFields(changes, PANEL_FIELDS, fields);
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return { fields };
  }

  const value = {
    name: trimString(changes.name, 120),
    phone: normalizeIndianPhone(changes.phone),
    participant_type: trimString(changes.participant_type, 80),
    organisation: trimString(changes.organisation, 200),
    department: trimString(changes.department, 160),
    panel_selection: trimString(changes.panel_selection, 80),
    industry_sector: trimString(changes.industry_sector, 80),
    industry_sector_other: trimString(changes.industry_sector_other, 160),
    organisation_type: trimString(changes.organisation_type, 80),
    organisation_type_other: trimString(changes.organisation_type_other, 160),
    updates_opt_in: changes.updates_opt_in === true ? 1 : 0,
  };
  if (!value.name) fields.name = "Enter the participant's full name.";
  if (!value.phone) fields.phone = "Enter a valid Indian phone number.";
  if (!PANEL_PARTICIPANT_TYPES.has(value.participant_type))
    fields.participant_type = "Choose a valid participant type.";
  if (!value.organisation) fields.organisation = "Enter the organisation name.";
  if (!PANEL_SELECTIONS.has(value.panel_selection))
    fields.panel_selection = "Choose a valid panel discussion.";
  if (!INDUSTRY_SECTORS.has(value.industry_sector))
    fields.industry_sector = "Choose a valid industry sector.";
  if (!ORGANISATION_TYPES.has(value.organisation_type))
    fields.organisation_type = "Choose a valid organisation type.";
  if (value.industry_sector === "Other" && !value.industry_sector_other)
    fields.industry_sector_other = "Specify the industry sector.";
  if (value.organisation_type === "Other" && !value.organisation_type_other)
    fields.organisation_type_other = "Specify the organisation type.";
  if (value.industry_sector !== "Other") value.industry_sector_other = "";
  if (value.organisation_type !== "Other") value.organisation_type_other = "";
  if (Object.keys(fields).length) return { fields };
  return {
    version,
    value: { ...value, participant_type: panelStoredType(value.participant_type) },
  };
}

function validateMember(member, index, fields) {
  const prefix = `members.${index}.`;
  rejectUnknownFields(member, MEMBER_FIELDS, fields, prefix);
  const id = Number(member?.id);
  const version = positiveVersion(member?.version);
  const value = {
    id: Number.isInteger(id) && id > 0 ? id : null,
    version,
    full_name: trimString(member?.full_name, 120),
    phone: normalizeIndianPhone(member?.phone),
    institution: trimString(member?.institution, 200),
    department_or_course: trimString(member?.department_or_course, 160),
    year_or_grade: trimString(member?.year_or_grade, 80),
  };
  if (!value.id) fields[`${prefix}id`] = "The team member is invalid.";
  if (!value.version) fields[`${prefix}version`] = "Reload this team before editing it.";
  if (!value.full_name) fields[`${prefix}full_name`] = "Enter the member's full name.";
  if (!value.phone) fields[`${prefix}phone`] = "Enter a valid Indian phone number.";
  if (!value.institution) fields[`${prefix}institution`] = "Enter the institution name.";
  if (!value.year_or_grade) fields[`${prefix}year_or_grade`] = "Enter the year or grade.";
  return value;
}

export function validateTeamEdit(body) {
  const fields = {};
  const version = positiveVersion(body?.version);
  if (!version) fields._version = "Reload this team before editing it.";
  const changes = body?.changes;
  rejectUnknownFields(changes, TEAM_FIELDS, fields);
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return { fields };
  }
  const members = Array.isArray(changes.members) ? changes.members : [];
  const value = {
    team_name: trimString(changes.team_name, 100).replace(/\s+/g, " "),
    participant_category: trimString(changes.participant_category, 20),
    sector_track: trimString(changes.sector_track, 30),
    solution_type: trimString(changes.solution_type, 30),
    members: members.map((member, index) => validateMember(member, index, fields)),
  };
  if (!value.team_name) fields.team_name = "Enter the team name.";
  if (!TEAM_CATEGORIES.has(value.participant_category))
    fields.participant_category = "Choose School or College.";
  if (!TEAM_SECTORS.has(value.sector_track))
    fields.sector_track = "Choose a valid hackathon sector.";
  if (!SOLUTION_TYPES.has(value.solution_type))
    fields.solution_type = "Choose a valid solution type.";
  if (members.length < 2 || members.length > 4)
    fields.members = "A team must contain 2 to 4 existing members.";
  if (new Set(value.members.map((member) => member.id)).size !== value.members.length)
    fields.members = "Each team member must appear exactly once.";
  if (Object.keys(fields).length) return { fields };
  return { version, value };
}

export function validateLegacyEdit(body) {
  const fields = {};
  const version = positiveVersion(body?.version);
  if (!version) fields._version = "Reload this registration before editing it.";
  const changes = body?.changes;
  rejectUnknownFields(changes, LEGACY_FIELDS, fields);
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return { fields };
  }
  const tracks = Array.isArray(changes.tracks)
    ? [...new Set(changes.tracks.map((item) => trimString(item, 80)).filter(Boolean))].slice(0, 8)
    : [];
  const value = {
    name: trimString(changes.name, 120),
    phone: normalizeIndianPhone(changes.phone),
    participant_type: trimString(changes.participant_type, 80),
    organisation: trimString(changes.organisation, 200),
    tracks,
    challenge_area: trimString(changes.challenge_area, 40),
    subcategory: trimString(changes.subcategory, 120),
    problem_area: trimString(changes.problem_area, 200),
    idea_summary: trimString(changes.idea_summary, 1200),
  };
  if (!value.name) fields.name = "Enter the participant's full name.";
  if (!value.phone) fields.phone = "Enter a valid Indian phone number.";
  if (!LEGACY_PARTICIPANT_TYPES.has(value.participant_type))
    fields.participant_type = "Choose a valid participant type.";
  if (!value.organisation) fields.organisation = "Enter the organisation name.";
  if (!value.tracks.length) fields.tracks = "Select at least one track.";
  if (!LEGACY_CHALLENGES.has(value.challenge_area))
    fields.challenge_area = "Choose a valid challenge area.";
  if (!value.subcategory) fields.subcategory = "Enter the subcategory.";
  if (!value.problem_area) fields.problem_area = "Enter the problem area.";
  if (Object.keys(fields).length) return { fields };
  return { version, value };
}

export function changedFields(before, after) {
  return Object.keys(after).filter(
    (key) => JSON.stringify(before?.[key]) !== JSON.stringify(after[key]),
  );
}

export const _test = {
  normalizeIndianPhone,
  panelDisplayType,
  panelStoredType,
};
