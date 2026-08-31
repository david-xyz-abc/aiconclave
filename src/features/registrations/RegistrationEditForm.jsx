import { useEffect, useMemo, useState } from "react";
import { parseTracks } from "../../utils/registration.js";

const PANEL_TYPES = [
  "Faculty",
  "Professional / Industry Delegate",
  "Researcher",
  "Other",
];
const PANELS = ["AI in Agriculture", "AI in Education", "AI in Healthcare"];
const INDUSTRY_SECTORS = [
  "",
  "Agriculture",
  "Education",
  "Healthcare",
  "IT / Technology",
  "Government",
  "Other",
];
const ORGANISATION_TYPES = [
  "",
  "Startup",
  "MSME",
  "Corporate",
  "Government",
  "Academic Institution",
  "Research Organization",
  "NGO",
  "Other",
];

function panelForm(registration) {
  return {
    name: registration.name || "",
    phone: registration.phone || "",
    participant_type:
      registration.participant_type === "Faculty / Academic"
        ? "Faculty"
        : registration.participant_type || "",
    organisation: registration.organisation || "",
    department: registration.department || "",
    panel_selection: registration.panel_selection || "",
    industry_sector: registration.industry_sector || "",
    industry_sector_other: registration.industry_sector_other || "",
    organisation_type: registration.organisation_type || "",
    organisation_type_other: registration.organisation_type_other || "",
    updates_opt_in: registration.updates_opt_in === 1,
  };
}

function teamForm(registration) {
  return {
    team_name: registration.team_name || "",
    participant_category: registration.participant_category || "",
    sector_track: registration.sector_track || "",
    solution_type: registration.solution_type || "",
    members: (registration.members || []).map((member) => ({
      id: member.id,
      version: member.edit_version,
      full_name: member.full_name || "",
      phone: member.phone || "",
      institution: member.institution || "",
      department_or_course: member.department_or_course || "",
      year_or_grade: member.year_or_grade || "",
      email: member.email || "",
      role: member.role || "Member",
    })),
  };
}

function legacyForm(registration) {
  return {
    name: registration.name || "",
    phone: registration.phone || "",
    participant_type: registration.participant_type || "Student",
    organisation: registration.organisation || "",
    tracks: parseTracks(registration.tracks).join(", "),
    challenge_area: registration.challenge_area || "",
    subcategory: registration.subcategory || "",
    problem_area: registration.problem_area || "",
    idea_summary: registration.idea_summary || "",
  };
}

function Field({ label, error, children, wide = false }) {
  return (
    <label className={`edit-field${wide ? " edit-field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}>
      {options.map((option) => (
        <option value={option} key={option || "empty"}>
          {option || "Not specified"}
        </option>
      ))}
    </select>
  );
}

function PanelFields({ form, setForm, fields, email }) {
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <div className="edit-form-grid">
      <Field label="Full name" error={fields.name}>
        <input value={form.name} onChange={update("name")} maxLength={120} required />
      </Field>
      <Field label="Verified email (read only)">
        <input value={email || ""} readOnly disabled />
      </Field>
      <Field label="Phone" error={fields.phone}>
        <input value={form.phone} onChange={update("phone")} inputMode="tel" maxLength={20} required />
      </Field>
      <Field label="Participant type" error={fields.participant_type}>
        <Select value={form.participant_type} onChange={update("participant_type")} options={PANEL_TYPES} />
      </Field>
      <Field label="Organisation" error={fields.organisation} wide>
        <input value={form.organisation} onChange={update("organisation")} maxLength={200} required />
      </Field>
      <Field label="Department / branch" error={fields.department} wide>
        <input value={form.department} onChange={update("department")} maxLength={160} />
      </Field>
      <Field label="Panel discussion" error={fields.panel_selection} wide>
        <Select value={form.panel_selection} onChange={update("panel_selection")} options={PANELS} />
      </Field>
      <Field label="Industry sector" error={fields.industry_sector}>
        <Select value={form.industry_sector} onChange={update("industry_sector")} options={INDUSTRY_SECTORS} />
      </Field>
      <Field label="Organisation type" error={fields.organisation_type}>
        <Select value={form.organisation_type} onChange={update("organisation_type")} options={ORGANISATION_TYPES} />
      </Field>
      {form.industry_sector === "Other" && (
        <Field label="Industry sector details" error={fields.industry_sector_other} wide>
          <input value={form.industry_sector_other} onChange={update("industry_sector_other")} maxLength={160} required />
        </Field>
      )}
      {form.organisation_type === "Other" && (
        <Field label="Organisation details" error={fields.organisation_type_other} wide>
          <input value={form.organisation_type_other} onChange={update("organisation_type_other")} maxLength={160} required />
        </Field>
      )}
      <label className="edit-checkbox edit-field-wide">
        <input
          type="checkbox"
          checked={form.updates_opt_in}
          onChange={(event) =>
            setForm((current) => ({ ...current, updates_opt_in: event.target.checked }))
          }
        />
        <span>Participant opted in to official updates</span>
      </label>
    </div>
  );
}

function TeamFields({ form, setForm, fields }) {
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateMember = (index, key, value) =>
    setForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [key]: value } : member,
      ),
    }));
  return (
    <>
      <div className="edit-form-grid">
        <Field label="Team name" error={fields.team_name} wide>
          <input value={form.team_name} onChange={update("team_name")} maxLength={100} required />
        </Field>
        <Field label="Participant category" error={fields.participant_category}>
          <Select value={form.participant_category} onChange={update("participant_category")} options={["School", "College"]} />
        </Field>
        <Field label="Sector" error={fields.sector_track}>
          <Select value={form.sector_track} onChange={update("sector_track")} options={["Agriculture", "Education", "Healthcare"]} />
        </Field>
        <Field label="Solution type" error={fields.solution_type} wide>
          <Select value={form.solution_type} onChange={update("solution_type")} options={["Technical", "Non-Technical"]} />
        </Field>
      </div>
      <div className="edit-members">
        <div className="edit-members-heading">
          <span>Existing members</span>
          <small>Emails, roles and team membership are read only.</small>
        </div>
        {form.members.map((member, index) => (
          <fieldset className="edit-member" key={member.id}>
            <legend>{String(index + 1).padStart(2, "0")} · {member.role}</legend>
            <div className="edit-form-grid">
              <Field label="Full name" error={fields[`members.${index}.full_name`]}>
                <input value={member.full_name} onChange={(event) => updateMember(index, "full_name", event.target.value)} maxLength={120} required />
              </Field>
              <Field label="Email (read only)">
                <input value={member.email} readOnly disabled />
              </Field>
              <Field label="Phone" error={fields[`members.${index}.phone`]}>
                <input value={member.phone} onChange={(event) => updateMember(index, "phone", event.target.value)} inputMode="tel" maxLength={20} required />
              </Field>
              <Field label="Year / grade" error={fields[`members.${index}.year_or_grade`]}>
                <input value={member.year_or_grade} onChange={(event) => updateMember(index, "year_or_grade", event.target.value)} maxLength={80} required />
              </Field>
              <Field label="Institution" error={fields[`members.${index}.institution`]} wide>
                <input value={member.institution} onChange={(event) => updateMember(index, "institution", event.target.value)} maxLength={200} required />
              </Field>
              <Field label="Department / course" error={fields[`members.${index}.department_or_course`]} wide>
                <input value={member.department_or_course} onChange={(event) => updateMember(index, "department_or_course", event.target.value)} maxLength={160} />
              </Field>
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}

function LegacyFields({ form, setForm, fields, email }) {
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <div className="edit-form-grid">
      <Field label="Full name" error={fields.name}>
        <input value={form.name} onChange={update("name")} maxLength={120} required />
      </Field>
      <Field label="Email (read only)">
        <input value={email || ""} readOnly disabled />
      </Field>
      <Field label="Phone" error={fields.phone}>
        <input value={form.phone} onChange={update("phone")} inputMode="tel" maxLength={20} required />
      </Field>
      <Field label="Participant type" error={fields.participant_type}>
        <Select value={form.participant_type} onChange={update("participant_type")} options={["Student", "Faculty", "Professional / Industry Delegate", "Researcher", "Other"]} />
      </Field>
      <Field label="Organisation" error={fields.organisation} wide>
        <input value={form.organisation} onChange={update("organisation")} maxLength={200} required />
      </Field>
      <Field label="Tracks (comma separated)" error={fields.tracks} wide>
        <input value={form.tracks} onChange={update("tracks")} maxLength={500} required />
      </Field>
      <Field label="Challenge area" error={fields.challenge_area}>
        <Select value={form.challenge_area} onChange={update("challenge_area")} options={["Agriculture", "Health", "Education"]} />
      </Field>
      <Field label="Subcategory" error={fields.subcategory}>
        <input value={form.subcategory} onChange={update("subcategory")} maxLength={120} required />
      </Field>
      <Field label="Problem area" error={fields.problem_area} wide>
        <input value={form.problem_area} onChange={update("problem_area")} maxLength={200} required />
      </Field>
      <Field label="Idea summary" error={fields.idea_summary} wide>
        <textarea value={form.idea_summary} onChange={update("idea_summary")} maxLength={1200} rows={5} />
      </Field>
    </div>
  );
}

export function RegistrationEditForm({
  registration,
  registrationType,
  onCancel,
  onDirtyChange,
  onSave,
  saving,
}) {
  const recordType = registrationType === "panel" ? "panel" : registration.record_type;
  const initial = useMemo(() => {
    if (recordType === "panel") return panelForm(registration);
    if (recordType === "team") return teamForm(registration);
    return legacyForm(registration);
  }, [recordType, registration]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    if (!dirty) {
      setError("Make at least one change before saving.");
      return;
    }
    if (!window.confirm("Save these participant changes? The update will be recorded in the admin audit log.")) return;
    let changes = form;
    if (recordType === "team") {
      changes = {
        ...form,
        members: form.members.map(({ email, role, ...member }) => member),
      };
    } else if (recordType === "legacy") {
      changes = {
        ...form,
        tracks: form.tracks.split(",").map((item) => item.trim()).filter(Boolean),
      };
    }
    try {
      await onSave(registration, {
        version: registration.edit_version,
        changes,
      });
      onDirtyChange(false);
    } catch (saveError) {
      setError(saveError.message || "The registration could not be saved.");
      setFields(saveError.fields || {});
    }
  }

  return (
    <form className="registration-edit-form" onSubmit={submit} noValidate>
      <div className="edit-notice">
        <strong>Editing participant data</strong>
        <span>Identity-linked emails and record identifiers cannot be changed.</span>
      </div>
      {recordType === "panel" && (
        <PanelFields form={form} setForm={setForm} fields={fields} email={registration.email} />
      )}
      {recordType === "team" && (
        <TeamFields form={form} setForm={setForm} fields={fields} />
      )}
      {recordType === "legacy" && (
        <LegacyFields form={form} setForm={setForm} fields={fields} email={registration.email} />
      )}
      {(error || fields._form || fields._version || fields.members) && (
        <p className="edit-form-error" role="alert">
          {error || fields._form || fields._version || fields.members}
        </p>
      )}
      <div className="edit-form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="button button-primary" type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
