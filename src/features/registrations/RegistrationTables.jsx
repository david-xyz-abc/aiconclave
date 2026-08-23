import { formatDate, parseTracks } from "../../utils/registration.js";

function TableState({ children }) {
  return <div className="table-state">{children}</div>;
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
                  {registration.participant_type}
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
                <button
                  type="button"
                  className="view-button"
                  onClick={() => onOpen(registration)}
                >
                  View details <span aria-hidden="true">→</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HackathonTable({ registrations, loading, onOpen }) {
  if (loading) return <TableState>Loading hackathon registrations…</TableState>;
  if (!registrations.length)
    return (
      <TableState>
        No hackathon registrations match the current filters.
      </TableState>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Participant</th>
            <th scope="col">Type</th>
            <th scope="col">Track</th>
            <th scope="col">Challenge</th>
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
                  {registration.participant_type}
                </span>
              </td>
              <td data-label="Track">
                {parseTracks(registration.tracks).map((track) => (
                  <span className="track-mark" key={track}>
                    {track.replace("Hackathon ", "")}
                  </span>
                ))}
              </td>
              <td data-label="Challenge">
                <span className="panel-mark">
                  {registration.challenge_area}
                </span>
                <span className="cell-secondary">
                  {registration.subcategory} · {registration.problem_area}
                </span>
              </td>
              <td data-label="Registered" className="cell-date">
                {formatDate(registration.created_at)}
              </td>
              <td data-label="Actions" className="cell-action">
                <button
                  type="button"
                  className="view-button"
                  onClick={() => onOpen(registration)}
                >
                  View details <span aria-hidden="true">→</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
