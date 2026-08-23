import { useEffect } from "react";
import {
  displayValue,
  formatDate,
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
              Participant · Registration #{registration.id}
            </p>
            <h2 id="detail-title">{registration.name}</h2>
            <span className="detail-panel-mark">
              {isHackathon
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
        <dl className="detail-grid">
          <DetailItem label="Email" important>
            <a href={`mailto:${registration.email}`}>{registration.email}</a>
          </DetailItem>
          <DetailItem label="Phone" important>
            <a href={`tel:${registration.phone}`}>{registration.phone}</a>
          </DetailItem>
          <DetailItem label="Participant type" important>
            {registration.participant_type}
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
