import assert from "node:assert/strict";
import test from "node:test";
import {
  _test,
  changedFields,
  validatePanelEdit,
  validateTeamEdit,
} from "../functions/_shared/registrationEdits.js";

function validPanelBody() {
  return {
    version: 1,
    changes: {
      name: "Delegate Name",
      phone: "9876543210",
      participant_type: "Faculty",
      organisation: "Amal Jyothi College of Engineering",
      department: "Computer Applications",
      panel_selection: "AI in Education",
      industry_sector: "Education",
      industry_sector_other: "",
      organisation_type: "Academic Institution",
      organisation_type_other: "",
      updates_opt_in: true,
    },
  };
}

test("panel edits normalize phones and preserve the legacy D1 faculty value", () => {
  const result = validatePanelEdit(validPanelBody());
  assert.equal(result.fields, undefined);
  assert.equal(result.value.phone, "+919876543210");
  assert.equal(result.value.participant_type, "Faculty / Academic");
});

test("panel edits reject student and unknown fields", () => {
  const body = validPanelBody();
  body.changes.participant_type = "Student";
  body.changes.email = "changed@example.com";
  const result = validatePanelEdit(body);
  assert.equal(result.fields.participant_type, "Choose a valid participant type.");
  assert.equal(result.fields.email, "This field cannot be edited.");
});

test("other panel sectors require their corresponding details", () => {
  const body = validPanelBody();
  body.changes.industry_sector = "Other";
  const result = validatePanelEdit(body);
  assert.equal(result.fields.industry_sector_other, "Specify the industry sector.");
});

test("team edits reject duplicate member identities and invalid versions", () => {
  const result = validateTeamEdit({
    version: 1,
    changes: {
      team_name: "Team One",
      participant_category: "College",
      sector_track: "Healthcare",
      solution_type: "Technical",
      members: [
        { id: 7, version: 1, full_name: "A", phone: "9876543210", institution: "AJCE", department_or_course: "MCA", year_or_grade: "1" },
        { id: 7, version: 0, full_name: "B", phone: "9876543211", institution: "AJCE", department_or_course: "MCA", year_or_grade: "1" },
      ],
    },
  });
  assert.equal(result.fields.members, "Each team member must appear exactly once.");
  assert.equal(result.fields["members.1.version"], "Reload this team before editing it.");
});

test("change detection reports only edited fields", () => {
  assert.deepEqual(changedFields({ name: "A", phone: "1" }, { name: "B", phone: "1" }), ["name"]);
});

test("phone normalization rejects foreign and malformed numbers", () => {
  assert.equal(_test.normalizeIndianPhone("+91 98765 43210"), "+919876543210");
  assert.equal(_test.normalizeIndianPhone("+1 9876543210"), null);
  assert.equal(_test.normalizeIndianPhone("98765<script>"), null);
});
