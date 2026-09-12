import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MODES,
  SIDES,
  orderedTeams,
  previewAssignment,
  suggestStart,
  judgeRoute,
} from "../shared/assignments.js";
import "./styles.css";
import { api } from "./client.js";
import { JudgeApp } from "./JudgeApp.jsx";
import { Emergency } from "./Emergency.jsx";
import { JudgeAccount } from "./JudgeAccount.jsx";
function Brand() {
  return (
    <a className="brand" href="/" aria-label="Judging operations home">
      <span>AC</span>
      <strong>AI CONCLAVE 2026</strong>
      <i>Judging</i>
    </a>
  );
}
function Login({ onLogin, judge = false }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("auth", {
        username,
        password,
        role: judge ? "judge" : "venue_admin",
      });
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-card">
        <Brand />
        <h1>{judge ? "Judge sign in" : "Venue team sign in"}</h1>
        <p>
          {judge
            ? "Use the individual login ID and password provided by the venue team."
            : "Manage judges and their assigned teams."}
        </p>
        <form onSubmit={submit}>
          <label>
            Username
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <a className="back-link" href="/">
          ← Back to login options
        </a>
      </section>
    </main>
  );
}
function TeamList({
  teams,
  selected = [],
  empty = "No matching seated teams.",
}) {
  const selectedIds = new Set(selected.map((t) => t.team_id));
  return teams.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Room / table</th>
            <th>Team</th>
            <th>Judge</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr
              key={t.team_id}
              className={selectedIds.has(t.team_id) ? "selected" : ""}
            >
              <td>
                <strong>{t.room_name || "Not seated"}</strong>
                <small>
                  {t.table_number
                    ? "Table " + String(t.table_number).padStart(2, "0")
                    : ""}
                </small>
              </td>
              <td>
                <strong>{t.team_name || "Team removed"}</strong>
                <small>
                  {t.team_code} · {t.sector_track}
                </small>
              </td>
              <td>
                {t.judge_name || <span className="badge">Unassigned</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">{empty}</div>
  );
}
function Route({ teams }) {
  let previous = null;
  return (
    <ol className="route">
      {teams.map((t) => {
        const first = t.room_id !== previous;
        previous = t.room_id;
        return (
          <li key={t.team_id}>
            {first && (
              <div className="route-room">
                {t.room_name || "No room"}{" "}
                <span>{t.block ? `${t.block} block` : ""}</span>
              </div>
            )}
            <div className="route-team">
              <span>
                {t.table_number ? String(t.table_number).padStart(2, "0") : "—"}
              </span>
              <div>
                <strong>{t.team_name || "Team removed"}</strong>
                <small>{t.team_code}</small>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
function Assignments({ data, save, busy }) {
  const [side, setSide] = useState(SIDES[0]),
    [sector, setSector] = useState(""),
    [mode, setMode] = useState(""),
    [judgeId, setJudgeId] = useState(""),
    [start, setStart] = useState(""),
    [count, setCount] = useState(5),
    [suggested, setSuggested] = useState(false);
  const filters = { solution_type: side, sector, mode },
    teams = orderedTeams(data, filters),
    judge = data.judges.find((j) => j.id === judgeId);
  const preview = previewAssignment(
    data,
    judgeId,
    filters,
    Number(start),
    Number(count),
  );
  const currentCount = data.assignments.filter(
    (a) => a.judge_id === judgeId,
  ).length;
  const sectors = [...new Set(data.rooms.map((r) => r.sector))].sort();
  function changeFilter(set, value) {
    set(value);
    setStart("");
    setSuggested(false);
  }
  function chooseJudge(id) {
    setJudgeId(id);
    setStart("");
    setSuggested(false);
  }
  async function submit(e) {
    e.preventDefault();
    if (preview.error) return;
    if (
      currentCount &&
      !window.confirm(
        `Replace all ${currentCount} existing assignments for ${judge.name} with these ${preview.teams.length} teams?`,
      )
    )
      return;
    await save(
      {
        action: "assign",
        judgeId,
        filters,
        startTeamId: Number(start),
        count: Number(count),
      },
      "Judge assignments saved.",
    );
  }
  return (
    <>
      <div className="filters card">
        <label>
          Side
          <select
            aria-label="Side"
            value={side}
            onChange={(e) => {
              changeFilter(setSide, e.target.value);
              setJudgeId("");
            }}
          >
            {SIDES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Sector
          <select
            aria-label="Sector"
            value={sector}
            onChange={(e) => changeFilter(setSector, e.target.value)}
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Preparation
          <select
            aria-label="Preparation"
            value={mode}
            onChange={(e) => changeFilter(setMode, e.target.value)}
          >
            <option value="">Both preparation modes</option>
            {MODES.map((s) => (
              <option key={s} value={s}>
                {s === "Starting from scratch"
                  ? "Not prepared · starting from scratch"
                  : s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="workspace">
        <section className="card directory">
          <div className="section-head">
            <div>
              <h2>Teams in visit order</h2>
              <p>
                {teams.length} matching teams ·{" "}
                {teams.filter((t) => !t.judge_id).length} unassigned
              </p>
            </div>
          </div>
          <TeamList
            teams={teams}
            selected={preview.error ? [] : preview.teams}
          />
        </section>
        <section className="card assignment">
          <h2>Assign a judge</h2>
          <p className="muted">
            Choose a consecutive range of matching tables.
          </p>
          <form onSubmit={submit}>
            <label>
              Judge
              <select
                aria-label="Judge"
                required
                value={judgeId}
                onChange={(e) => chooseJudge(e.target.value)}
              >
                <option value="">Select a {side.toLowerCase()} judge</option>
                {data.judges
                  .filter((j) => j.solution_type === side)
                  .map((j) => (
                    <option value={j.id} key={j.id}>
                      {j.name} (
                      {
                        data.assignments.filter((a) => a.judge_id === j.id)
                          .length
                      }{" "}
                      teams)
                    </option>
                  ))}
              </select>
            </label>
            {!data.judges.some((j) => j.solution_type === side) && (
              <p className="hint">
                Add judges in the Judges tab to get started.
              </p>
            )}
            <div className="count-row">
              <label>
                Number of teams
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={count}
                  onChange={(e) => {
                    setCount(e.target.value);
                    setStart("");
                    setSuggested(false);
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!judgeId || busy}
                onClick={() => {
                  setStart(
                    String(
                      suggestStart(data, judgeId, filters, Number(count)) || "",
                    ),
                  );
                  setSuggested(true);
                }}
              >
                Suggest range
              </button>
            </div>
            <label>
              Starting table
              <select
                aria-label="Starting table"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              >
                <option value="">Select starting team</option>
                {teams.map((t) => (
                  <option
                    key={t.team_id}
                    value={t.team_id}
                    disabled={Boolean(t.judge_id && t.judge_id !== judgeId)}
                  >
                    {t.room_name} / {String(t.table_number).padStart(2, "0")} ·{" "}
                    {t.team_name}
                    {t.judge_id && t.judge_id !== judgeId ? " · assigned" : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              Suggestion prefers one room. Overflow follows the saved room
              order. Empty tables are skipped.
            </p>
            {suggested && !start && (
              <p className="notice" role="status">
                No available consecutive range fits this team count. Reduce the
                count or change the filters.
              </p>
            )}
            {start && preview.error && (
              <p className="error" role="alert">
                {preview.error}
              </p>
            )}
            {!preview.error && (
              <div className="preview">
                <h3>
                  Route preview{" "}
                  <span>
                    {preview.teams.length} teams ·{" "}
                    {new Set(preview.teams.map((t) => t.room_id)).size} rooms
                  </span>
                </h3>
                <Route teams={preview.teams} />
              </div>
            )}
            {currentCount > 0 && (
              <p className="notice">
                Saving replaces this judge’s entire current assignment (
                {currentCount} teams).
              </p>
            )}
            <button
              className="primary"
              disabled={busy || Boolean(preview.error)}
            >
              {busy
                ? "Saving…"
                : currentCount
                  ? "Replace assignment"
                  : "Save assignment"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function Judges({ data, save, busy, refresh }) {
  const [id, setId] = useState(""),
    [name, setName] = useState(""),
    [side, setSide] = useState(SIDES[0]),
    [query, setQuery] = useState("");
  const judge = data.judges.find((j) => j.id === id),
    route = judge ? judgeRoute(data, judge) : null;
  function edit(j) {
    setId(j.id);
    setName(j.name);
    setSide(j.solution_type);
  }
  function reset() {
    setId("");
    setName("");
    setSide(SIDES[0]);
  }
  async function submit(e) {
    e.preventDefault();
    if (
      await save(
        id
          ? { action: "saveJudge", judgeId: id, name, solutionType: side }
          : {
              action: "addJudges",
              names: name
                .split("\n")
                .map((n) => n.trim())
                .filter(Boolean),
              solutionType: side,
            },
        id ? "Judge updated." : "Judges added.",
      )
    )
      reset();
  }
  return (
    <div className="workspace">
      <section className="card directory">
        <div className="section-head">
          <div>
            <h2>Judges</h2>
            <p>{data.judges.length} judges registered</p>
          </div>
          <button onClick={reset}>Add judge</button>
        </div>
        <label className="directory-search">
          Find a judge
          <input
            type="search"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="judge-list">
          {data.judges
            .filter((j) => j.name.toLowerCase().includes(query.toLowerCase()))
            .map((j) => {
              const r = judgeRoute(data, j);
              return (
                <button
                  key={j.id}
                  className={`judge-row ${id === j.id ? "active" : ""}`}
                  onClick={() => edit(j)}
                >
                  <span>
                    <strong>{j.name}</strong>
                    <small>{j.solution_type}</small>
                  </span>
                  <span className={r.needsReview ? "review" : "muted"}>
                    {r.needsReview ? "Review route" : `${r.teams.length} teams`}{" "}
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              );
            })}
          {!data.judges.length && (
            <div className="empty">
              Add judges as their names are confirmed.
            </div>
          )}
        </div>
      </section>
      <section className="card assignment">
        <h2>{judge ? "Judge details" : "Add a judge"}</h2>
        <form onSubmit={submit}>
          <label>
            {judge ? "Judge name" : "Judge names"}
            {judge ? (
              <input
                required
                maxLength="100"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <textarea
                required
                rows="4"
                maxLength="10100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="One name per line"
              />
            )}
          </label>
          <label>
            Side
            <select
              aria-label="Side"
              value={side}
              onChange={(e) => setSide(e.target.value)}
              disabled={Boolean(route?.teams.length)}
            >
              {SIDES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={busy}>
            {judge ? "Save details" : "Add judges"}
          </button>
        </form>
        {judge && (
          <>
            <div className="preview">
              <h3>
                Current assignment <span>{route.teams.length} teams</span>
              </h3>
              {route.needsReview && (
                <p className="notice">
                  Seating or team details have changed. Review and replace this
                  route in Assign teams before the judge starts.
                </p>
              )}
              {route.teams.length ? (
                <Route
                  teams={route.teams.map((t) => ({
                    ...t,
                    table_number: data.teams.find(
                      (c) => c.team_id === t.team_id,
                    )?.table_number,
                  }))}
                />
              ) : (
                <p className="muted">No teams assigned yet.</p>
              )}
            </div>
            <JudgeAccount
              key={judge.id}
              judge={judge}
              revision={data.revision}
              onSaved={refresh}
            />
            <button
              className="danger"
              disabled={busy}
              onClick={async () => {
                const action = route.teams.length ? "release" : "deleteJudge";
                if (
                  window.confirm(
                    route.teams.length
                      ? `Release all ${route.teams.length} teams assigned to ${judge.name}?`
                      : `Remove ${judge.name} from the judge list?`,
                  )
                ) {
                  if (
                    await save(
                      { action, judgeId: id },
                      route.teams.length
                        ? "Assignments released."
                        : "Judge removed.",
                    )
                  )
                    reset();
                }
              }}
            >
              {route.teams.length ? "Release all teams" : "Remove judge"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
function RoomOrder({ data, save, busy }) {
  const [ids, setIds] = useState(data.rooms.map((r) => r.id));
  useEffect(() => setIds(data.rooms.map((r) => r.id)), [data.rooms]);
  const dirty = ids.some((id, i) => data.rooms[i]?.id !== id);
  function move(index, offset) {
    const next = [...ids];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setIds(next);
  }
  return (
    <section className="card rooms">
      <div className="section-head">
        <div>
          <h2>Room walking order</h2>
          <p>
            Set the physical route between rooms. Tables within each room follow
            their table number.
          </p>
        </div>
        <button
          className="primary"
          disabled={!dirty || busy}
          onClick={() =>
            save({ action: "roomOrder", roomIds: ids }, "Room order saved.")
          }
        >
          Save room order
        </button>
      </div>
      <p className="notice">
        The initial order follows room numbers. Confirm it against the building
        layout before assigning judges. Incompatible rooms are skipped when
        filtering.
      </p>
      <ol className="room-order">
        {ids.map((id, index) => {
          const r = data.rooms.find((r) => r.id === id);
          return (
            <li key={id}>
              <span className="order-number">{index + 1}</span>
              <div>
                <strong>
                  {r.name} <span className="muted">· {r.block} block</span>
                </strong>
                <small>
                  {r.sector} · {r.solution_type} · {r.project_mode} · {r.min_seats === r.max_seats ? r.min_seats : `${r.min_seats}–${r.max_seats}`}{" "}
                  seats per table
                </small>
              </div>
              <div className="move-buttons">
                <button
                  aria-label={`Move ${r.name} up`}
                  disabled={index === 0 || busy}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${r.name} down`}
                  disabled={index === ids.length - 1 || busy}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
function Workspace({ user, onLogout }) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("assign"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setData(await api("workspace"));
    } catch (e) {
      if (e.status === 401) onLogout();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function save(body, success) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("workspace", { ...body, revision: data.revision });
      setData(await api("workspace"));
      setMessage(success);
      return true;
    } catch (e) {
      if (e.status === 401) onLogout();
      else setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const review =
    data?.judges.filter((j) => judgeRoute(data, j).needsReview).length || 0;
  return (
    <>
      <header className="topbar">
        <Brand />
        <div>
          <span className="staff-label">Venue team</span>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth", { method: "DELETE" });
              } finally {
                onLogout();
              }
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="main">
        <div className="page-head">
          <div>
            <h1>Judging operations</h1>
            <p>Coordinate judges, teams, and their room routes.</p>
          </div>
          <button disabled={busy} onClick={refresh}>
            {busy ? "Updating…" : "Refresh"}
          </button>
        </div>
        {error && (
          <div className="error banner" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="success banner" role="status">
            {message}
          </div>
        )}
        {user.role !== "venue_admin" ? (
          <div className="card empty">
            This dashboard requires venue team access. Sign in with a venue
            staff account.
          </div>
        ) : !data ? (
          <div className="card empty">
            {busy
              ? "Loading judging workspace…"
              : "Workspace unavailable. Use Refresh to retry."}
          </div>
        ) : (
          <>
            <div className="stats">
              <div>
                <span>Judges</span>
                <strong>{data.judges.length}</strong>
              </div>
              <div>
                <span>Seated teams</span>
                <strong>{data.teams.filter((t) => t.table_id).length}</strong>
              </div>
              <div>
                <span>Awaiting a judge</span>
                <strong>
                  {data.teams.filter((t) => t.table_id && !t.judge_id).length}
                </strong>
              </div>
              <div>
                <span>Assigned teams</span>
                <strong>{data.assignments.length}</strong>
              </div>
            </div>
            {review > 0 && (
              <div className="notice banner">
                {review} judge route{review === 1 ? " needs" : "s need"} review
                after seating changes.{" "}
                <button
                  className="text-button"
                  onClick={() => setTab("judges")}
                >
                  View judges
                </button>
              </div>
            )}
            <nav className="tabs" aria-label="Judging administration">
              {[
                ["assign", "Assign teams"],
                ["judges", "Judges"],
                ["rooms", "Room order"],
                ["emergency", "Emergency"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => {
                    setTab(key);
                    setMessage("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "assign" ? (
              <Assignments data={data} save={save} busy={busy} />
            ) : tab === "judges" ? (
              <Judges data={data} save={save} busy={busy} refresh={refresh} />
            ) : tab === "emergency" ? (
              <Emergency />
            ) : (
              <RoomOrder data={data} save={save} busy={busy} />
            )}
            <p className="footer-note">
              Only teams with confirmed attendance and a room/table can be
              assigned. One judge per team.
            </p>
          </>
        )}
      </main>
    </>
  );
}
function EntryPage() {
  return (
    <main className="entry">
      <section className="entry-content">
        <Brand />
        <h1>Judging portal</h1>
        <p>Choose your workspace to continue.</p>
        <div className="entry-options">
          <a className="card entry-option" href="/judges/login">
            <h2>
              Judge login <span aria-hidden="true">→</span>
            </h2>
            <p>Access your assigned teams and evaluations.</p>
            <small>Individual judge access</small>
          </a>
          <a className="card entry-option" href="/team/login">
            <h2>
              Venue team login <span aria-hidden="true">→</span>
            </h2>
            <p>Manage judges, team assignments, and room routes.</p>
            <small>Venue team access</small>
          </a>
        </div>
      </section>
    </main>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const judge = path === "/judges/login" || path === "/judges";
  const team = path === "/team/login" || path === "/team";
  useEffect(() => {
    if (!judge && !team) {
      setLoading(false);
      return;
    }
    api("auth")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (!judge && !team) return <EntryPage />;
  if (loading) return <div className="empty">Loading…</div>;
  if (!user || user.role !== (judge ? "judge" : "venue_admin"))
    return <Login judge={judge} onLogin={setUser} />;
  return judge ? (
    <JudgeApp user={user} onLogout={() => setUser(null)} />
  ) : (
    <Workspace user={user} onLogout={() => setUser(null)} />
  );
}
createRoot(document.getElementById("root")).render(<App />);
