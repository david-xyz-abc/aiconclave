import { useEffect, useMemo, useState } from "react";
import { BrandLockup } from "../../components/common/BrandLockup.jsx";
import { attendanceApi, isUnauthorized } from "../../services/dashboardApi.js";
import { downloadAttendanceWorkbook } from "../../services/registrationExport.js";

const today = () => new Date().toISOString().slice(0, 10);

function AttendanceLogin({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await attendanceApi.login(username, password);
      onLogin(data.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell attendance-auth-shell">
      <section
        className="auth-panel"
        aria-labelledby="attendance-login-heading"
      >
        <BrandLockup />
        <div className="auth-copy">
          <p className="eyebrow">Attendance</p>
          <h1 id="attendance-login-heading">Sign in</h1>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <a className="attendance-back-link" href="/">
          ← Return
        </a>
      </section>
    </main>
  );
}

function TeamRow({ team, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`attendance-team-row${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(team.id)}
    >
      <span className="attendance-team-id">
        {team.team_code || `TEAM-${String(team.id).padStart(4, "0")}`}
      </span>
      <span className="attendance-team-main">
        <strong>{team.team_name}</strong>
        <small>Lead: {team.lead_name || "Not assigned"}</small>
      </span>
      <span
        className={`attendance-count${team.present_count === team.member_count ? " is-complete" : ""}`}
      >
        {team.present_count}/{team.member_count}
        <small>selected</small>
      </span>
      <span className="attendance-chevron" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function AttendanceDesk({ onLogout, user }) {
  const canEdit = user?.role === "admin";
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [team, setTeam] = useState(null);
  const [date] = useState(today);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoadingTeams(true);
    attendanceApi
      .teams(query, date)
      .then((data) => {
        if (active) setTeams(data.teams || []);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (isUnauthorized(e)) onLogout();
        }
      })
      .finally(() => active && setLoadingTeams(false));
    return () => {
      active = false;
    };
  }, [query, date, onLogout]);
  useEffect(() => {
    if (!selectedId) {
      setTeam(null);
      setEditingAttendance(false);
      setShowConfirmDialog(false);
      return;
    }
    setEditingAttendance(false);
    setShowConfirmDialog(false);
    let active = true;
    setLoadingTeam(true);
    setError("");
    attendanceApi
      .team(selectedId, date)
      .then((data) => active && setTeam(data.team))
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (isUnauthorized(e)) onLogout();
        }
      })
      .finally(() => active && setLoadingTeam(false));
    return () => {
      active = false;
    };
  }, [selectedId, date, onLogout]);
  const presentCount = useMemo(
    () => team?.members?.filter((member) => member.present).length || 0,
    [team],
  );
  const attendanceMarked = Boolean(team?.attendance_marked);
  function updateMember(memberId, present) {
    setTeam((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, present } : member,
      ),
    }));
    setMessage("");
    setShowConfirmDialog(false);
  }
  function requestSaveAttendance() { setShowConfirmDialog(true); }
  async function saveAttendance() {
    setShowConfirmDialog(false);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await attendanceApi.saveAttendance(
        team.id,
        date,
        team.members.map((member) => ({
          memberId: member.id,
          present: Boolean(member.present),
        })),
      );
      setTeam(data.team);
      setEditingAttendance(false);
      setShowConfirmDialog(false);
      setMessage("");
    } catch (e) {
      setError(e.message);
      if (isUnauthorized(e)) onLogout();
    } finally {
      setSaving(false);
    }
  }
  async function exportAttendance() {
    setExporting(true);
    setError("");
    try {
      const data = await attendanceApi.exportData();
      await downloadAttendanceWorkbook(data.teams || []);
    } catch (e) {
      setError(e.message);
      if (isUnauthorized(e)) onLogout();
    } finally { setExporting(false); }
  }
  async function changeLead(event) {
    const memberId = Number(event.target.value);
    if (!memberId) return;
    setError("");
    try {
      const data = await attendanceApi.changeLead(team.id, memberId);
      setTeam(data.team);
      setTeams((current) =>
        current.map((item) =>
          item.id === team.id
            ? { ...item, lead_name: data.team.lead_name }
            : item,
        ),
      );
      setMessage("Team lead updated.");
    } catch (e) {
      setError(e.message);
      if (isUnauthorized(e)) onLogout();
    }
  }
  return (
    <div className="attendance-shell">
      <header className="attendance-topbar">
        <BrandLockup />
        <div className="attendance-topbar-actions">
          <button className="attendance-export-button" type="button" onClick={exportAttendance} disabled={exporting}>
            {exporting ? "Preparing…" : "Excel"}<span aria-hidden="true">↓</span>
          </button>
          <button
            className="button button-quiet"
            onClick={async () => {
              await attendanceApi.logout().catch(() => {});
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="attendance-main">
        <div className="attendance-heading">
          <div>
            <p className="eyebrow">Hackathon</p>
            <h1>Attendance</h1>
          </div>
        </div>
        <div className="attendance-workspace">
          <section
            className="attendance-team-directory"
            aria-labelledby="teams-heading"
          >
            <div className="attendance-section-heading">
              <div>
                <h2 id="teams-heading">Teams</h2>
                <p>{teams.length} submitted</p>
              </div>
            </div>
            <label className="attendance-search">
              <span className="sr-only">Search teams</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team name, lead, or team ID"
              />
            </label>
            <div className="attendance-team-list">
              {loadingTeams ? (
                <div className="table-state">Loading teams…</div>
              ) : teams.length ? (
                teams.map((item) => (
                  <TeamRow
                    key={item.id}
                    team={item}
                    selected={item.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))
              ) : (
                <div className="table-state">No teams match that search.</div>
              )}
            </div>
          </section>
          <section className="attendance-detail" aria-live="polite">
            {loadingTeam ? (
                <div className="attendance-empty">
                <span className="attendance-empty-number">…</span>
                <h2>Loading</h2>
              </div>
            ) : team ? (
              <>
                <div className="attendance-detail-head">
                  <div>
                    <p className="eyebrow">
                      {team.team_code ||
                        `TEAM-${String(team.id).padStart(4, "0")}`}
                    </p>
                    <h2>{team.team_name}</h2>
                    <p>
                      {team.participant_category} · {team.sector_track} ·{" "}
                      {team.member_count} members
                    </p>
                  </div>
                  <span className="attendance-status">
                    {presentCount === team.member_count
                      ? "Complete"
                      : `${presentCount}/${team.member_count} present`}
                  </span>
                </div>
                <div className="attendance-controls">
                  <div className="attendance-lead-control">
                    <label>
                      Team lead
                      <select
                        value={team.lead_member_id || ""}
                        onChange={changeLead}
                        disabled={!canEdit}
                      >
                        {team.members.map((member) => (
                          <option value={member.id} key={member.id}>
                            {member.full_name}
                            {member.id === team.lead_member_id
                              ? " · current lead"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="attendance-members">
                  {team.members.map((member) => (
                    <label
                      className={`attendance-member${member.present ? " is-present" : ""}`}
                      key={member.id}
                    >
                      <input
                        type="checkbox"
                        disabled={!canEdit || (attendanceMarked && !editingAttendance)}
                        checked={Boolean(member.present)}
                        onChange={(event) =>
                          updateMember(member.id, event.target.checked)
                        }
                      />
                      <span className="attendance-check" aria-hidden="true">
                        ✓
                      </span>
                      <span className="attendance-member-copy">
                        <strong>{member.full_name}</strong>
                        <small>
                          {member.id === team.lead_member_id
                            ? "Team lead"
                            : "Team member"}{" "}
                          · {member.institution}
                        </small>
                      </span>
                      <span className="attendance-member-state">
                        {member.present ? "Present" : "Absent"}
                      </span>
                    </label>
                  ))}
                </div>
                {error && (
                  <p className="form-error attendance-error" role="alert">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="attendance-success" role="status">
                    {message}
                  </p>
                )}
                {attendanceMarked && !editingAttendance ? (
                  <div className="attendance-locked-bar">
                    <span>Attendance marked</span>
                    {canEdit && <button
                      type="button"
                      className="attendance-edit-button"
                      onClick={() => setEditingAttendance(true)}
                    >
                      Edit
                    </button>}
                  </div>
                ) : canEdit ? (
                  <button
                    className="button button-primary attendance-save"
                    disabled={saving}
                    onClick={requestSaveAttendance}
                  >
                    {saving ? "Saving attendance…" : attendanceMarked ? "Save changes" : "Mark attendance"}
                    <span aria-hidden="true">→</span>
                  </button>
                ) : null}
              </>
            ) : (
              <div className="attendance-empty">
                <span className="attendance-empty-number">02</span>
                <h2>Select a team</h2>
                <p>
                  Select a team to view its members.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      {showConfirmDialog && (
        <div className="attendance-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowConfirmDialog(false); }}>
          <section className="attendance-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-dialog-title">
            <p className="eyebrow">Confirm</p>
            <h2 id="attendance-dialog-title">Mark attendance?</h2>
            <p>{team?.team_name} · {date}</p>
            <div className="attendance-dialog-actions"><button type="button" className="button button-quiet" onClick={() => setShowConfirmDialog(false)}>Cancel</button><button type="button" className="button button-primary" onClick={saveAttendance}>Confirm</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export function AttendanceApp() {
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
  });
  useEffect(() => {
    attendanceApi
      .currentSession()
      .then((data) => setSession({ loading: false, authenticated: true, user: data.user }))
      .catch(() => setSession({ loading: false, authenticated: false }));
  }, []);
  if (session.loading)
    return <div className="loading-screen">Loading…</div>;
  if (!session.authenticated)
    return (
      <AttendanceLogin
      onLogin={(user) => setSession({ loading: false, authenticated: true, user })}
      />
    );
  return (
    <AttendanceDesk
      user={session.user}
      onLogout={() => setSession({ loading: false, authenticated: false, user: null })}
    />
  );
}
