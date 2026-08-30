import {
  formatDate,
  formatParticipantType,
  parseTracks,
} from "../../utils/registration.js";

function TableState({ children }) {
  return <div className="table-state">{children}</div>;
}

function ViewButton({ registration, onOpen }) {
  return (
    <button
      type="button"
      className="view-button"
      onClick={() => onOpen(registration)}
    >
      View details <span aria-hidden="true">→</span>
    </button>
  );
}

export function PanelTable({ registrations, loading, onOpen }) {
  if (loading) return <TableState>Loading panel registrations…</TableState>;
  if (!registrations.length)
    return <TableState>No registrations match the current filters.</TableState>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Participant</th>
            <th scope="col">Type</th>
            <th scope="col">Organisation</th>
            <th scope="col">Panel</th>
            <th scope="col">Registered</th>
            <th scope="col" className="action-heading">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => (
            <tr key={registration.id}>
              <td data-label="Name">
                <strong className="cell-name">{registration.name}</strong>
                <a
                  className="cell-secondary"
                  href={`mailto:${registration.email}`}
                >
                  {registration.email}
                </a>
              </td>
              <td data-label="Type">
                <span className="category-mark">
                  {formatParticipantType(registration.participant_type)}
                </span>
              </td>
              <td data-label="Organisation">
                {registration.organisation}
                {registration.department && (
                  <span className="cell-secondary">
                    {registration.department}
                  </span>
                )}
              </td>
              <td data-label="Panel">
                <span className="panel-mark">
                  {registration.panel_selection}
                </span>
              </td>
              <td data-label="Registered" className="cell-date">
                {formatDate(registration.created_at)}
              </td>
              <td data-label="Actions" className="cell-action">
                <ViewButton registration={registration} onOpen={onOpen} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRow({ registration, onOpen }) {
  const captain =
    registration.members?.find((member) => member.role === "Captain") ||
    registration.members?.[0];
  return (
    <tr>
      <td data-label="Name">
        <strong className="cell-name">{registration.team_name}</strong>
        <span className="cell-secondary team-code">
          {registration.team_code || `TEAM-${registration.id}`}
        </span>
      </td>
      <td data-label="Category">
        <span className="category-mark">
          {registration.participant_category}
        </span>
      </td>
      <td data-label="Members">
        <strong>
          {registration.members?.length || registration.team_size}
        </strong>
        <span className="cell-secondary">
          Captain: {captain?.full_name || "Not provided"}
        </span>
      </td>
      <td data-label="Sector">
        <span className="panel-mark">{registration.sector_track}</span>
      </td>
      <td data-label="Solution">
        <span className="track-mark">{registration.solution_type}</span>
      </td>
      <td data-label="Registered" className="cell-date">
        {formatDate(registration.created_at)}
      </td>
      <td data-label="Actions" className="cell-action">
        <ViewButton registration={registration} onOpen={onOpen} />
      </td>
    </tr>
  );
}

function LegacyHackathonRow({ registration, onOpen }) {
  return (
    <tr>
      <td data-label="Name">
        <strong className="cell-name">{registration.name}</strong>
        <a className="cell-secondary" href={`mailto:${registration.email}`}>
          {registration.email}
        </a>
      </td>
      <td data-label="Category">
        <span className="category-mark">Legacy</span>
      </td>
      <td data-label="Members">
        <strong>1</strong>
        <span className="cell-secondary">Individual record</span>
      </td>
      <td data-label="Sector">
        <span className="panel-mark">{registration.challenge_area}</span>
      </td>
      <td data-label="Solution">
        {parseTracks(registration.tracks).map((track) => (
          <span className="track-mark" key={track}>
            {track.replace("Hackathon ", "")}
          </span>
        ))}
      </td>
      <td data-label="Registered" className="cell-date">
        {formatDate(registration.created_at)}
      </td>
      <td data-label="Actions" className="cell-action">
        <ViewButton registration={registration} onOpen={onOpen} />
      </td>
    </tr>
  );
}

export function HackathonTable({ registrations, loading, onOpen }) {
  if (loading) return <TableState>Loading hackathon teams…</TableState>;
  if (!registrations.length)
    return (
      <TableState>No hackathon teams match the current filters.</TableState>
    );
  return (
    <div className="table-scroll hackathon-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Category</th>
            <th scope="col">Students</th>
            <th scope="col">Sector</th>
            <th scope="col">Solution</th>
            <th scope="col">Submitted</th>
            <th scope="col" className="action-heading">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) =>
            registration.record_type === "team" ? (
              <TeamRow
                key={`team-${registration.id}`}
                registration={registration}
                onOpen={onOpen}
              />
            ) : (
              <LegacyHackathonRow
                key={`legacy-${registration.id}`}
                registration={registration}
                onOpen={onOpen}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
