import { useEffect } from "react";
import {
  displayValue,
  formatDate,
  formatParticipantType,
  parseTracks,
} from "../../utils/registration.js";

function DetailItem({ label, children, wide = false, important = false }) {
  return (
    <div
      className={`detail-item${wide ? " detail-item-wide" : ""}${important ? " detail-item-important" : ""}`}
    >
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TeamMember({ member }) {
  return (
    <article className="team-member-card">
      <header>
        <span>{String(member.member_order).padStart(2, "0")}</span>
        <div>
          <strong>{member.full_name}</strong>
          <small>{member.role}</small>
        </div>
      </header>
      <dl>
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${member.email}`}>{member.email}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${member.phone}`}>{member.phone}</a>
          </dd>
        </div>
        <div>
          <dt>Institution</dt>
          <dd>{member.institution}</dd>
        </div>
        <div>
          <dt>Course / department</dt>
          <dd>{displayValue(member.department_or_course)}</dd>
        </div>
        <div>
          <dt>Year / grade</dt>
          <dd>{member.year_or_grade}</dd>
        </div>
      </dl>
    </article>
  );
}

function TeamDetails({ registration }) {
  return (
    <>
      <dl className="detail-grid">
        <DetailItem label="Team code" important>
          {displayValue(registration.team_code)}
        </DetailItem>
        <DetailItem label="Submitted">
          {formatDate(registration.created_at)}
        </DetailItem>
        <DetailItem label="Participant category" important>
          {registration.participant_category}
        </DetailItem>
        <DetailItem label="Team size" important>
          {registration.members?.length || registration.team_size} students
        </DetailItem>
        <DetailItem label="Hackathon sector" important>
          {registration.sector_track}
        </DetailItem>
        <DetailItem label="Solution type" important>
          {registration.solution_type}
        </DetailItem>
        <DetailItem label="Information confirmed">
          {registration.information_confirmed ? "Yes" : "No"}
        </DetailItem>
        <DetailItem label="Rules accepted">
          {registration.rules_accepted ? "Yes" : "No"}
        </DetailItem>
        <DetailItem label="Official updates">
          {registration.updates_opt_in ? "Yes" : "No"}
        </DetailItem>
      </dl>
      <section className="team-members" aria-labelledby="team-members-heading">
        <div className="team-members-head">
          <p className="eyebrow">Registered students</p>
          <h3 id="team-members-heading">Team members</h3>
          <span>{registration.members?.length || 0}</span>
        </div>
        <div className="team-member-list">
          {(registration.members || []).map((member) => (
            <TeamMember
              member={member}
              key={member.id || member.member_order}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function RegistrationDetails({
  registration,
  registrationType,
  onClose,
  onDelete,
  deleting,
}) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  if (!registration) return null;
  const isHackathon = registrationType === "hackathon";
  const isTeam = isHackathon && registration.record_type === "team";
  const tracks = parseTracks(registration.tracks);
  return (
    <div
      className="detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="detail-head">
          <div>
            <p className="eyebrow">
              {isTeam ? "Hackathon team" : "Participant"} · Registration #
              {registration.id}
            </p>
            <h2 id="detail-title">
              {isTeam ? registration.team_name : registration.name}
            </h2>
            <span className="detail-panel-mark">
              {isTeam
                ? `${registration.sector_track} · ${registration.solution_type}`
                : isHackathon
                  ? `${registration.challenge_area} · ${registration.subcategory}`
                  : registration.panel_selection}
            </span>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close registration details"
          >
            ×
          </button>
        </div>
        {isTeam ? (
          <TeamDetails registration={registration} />
        ) : (
          <dl className="detail-grid">
            <DetailItem label="Email" important>
              <a href={`mailto:${registration.email}`}>{registration.email}</a>
            </DetailItem>
            <DetailItem label="Phone" important>
              <a href={`tel:${registration.phone}`}>{registration.phone}</a>
            </DetailItem>
            <DetailItem label="Participant type" important>
              {formatParticipantType(registration.participant_type)}
            </DetailItem>
            <DetailItem label="Registered">
              {formatDate(registration.created_at)}
            </DetailItem>
            <DetailItem label="Organisation" wide important>
              {registration.organisation}
            </DetailItem>
            {isHackathon ? (
              <>
                <DetailItem label="Hackathon track" wide important>
                  {tracks.join(", ")}
                </DetailItem>
                <DetailItem label="Challenge sector">
                  {registration.challenge_area}
                </DetailItem>
                <DetailItem label="Subcategory">
                  {registration.subcategory}
                </DetailItem>
                <DetailItem label="Suggested problem area" wide important>
                  {registration.problem_area}
                </DetailItem>
                <DetailItem label="Problem statement / idea" wide>
                  {displayValue(registration.idea_summary)}
                </DetailItem>
              </>
            ) : (
              <>
                <DetailItem label="Department / Branch" wide important>
                  {displayValue(registration.department)}
                </DetailItem>
                <DetailItem label="Industry sector">
                  {displayValue(registration.industry_sector)}
                </DetailItem>
                <DetailItem label="Sector details">
                  {displayValue(registration.industry_sector_other)}
                </DetailItem>
                <DetailItem label="Organisation type">
                  {displayValue(registration.organisation_type)}
                </DetailItem>
                <DetailItem label="Organisation details">
                  {displayValue(registration.organisation_type_other)}
                </DetailItem>
              </>
            )}
            <DetailItem label="Information confirmed">
              {registration.information_confirmed ? "Yes" : "No"}
            </DetailItem>
            {!isHackathon && (
              <DetailItem label="Updates opt-in">
                {registration.updates_opt_in ? "Yes" : "No"}
              </DetailItem>
            )}
          </dl>
        )}
        <div className="detail-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="button button-danger"
            type="button"
            disabled={deleting}
            onClick={() => onDelete(registration)}
          >
            {deleting ? "Deleting…" : "Delete registration"}
          </button>
        </div>
      </aside>
    </div>
  );
}
