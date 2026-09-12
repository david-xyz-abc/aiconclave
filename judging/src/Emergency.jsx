import React, { useState, useEffect } from "react";
import { api } from "./client.js";
import { scoreTotal, CRITERIA, AWARDS } from "../shared/evaluation.js";
export function Emergency() {
  const [data, setData] = useState(null),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [history, setHistory] = useState([]);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setData(await api("emergency"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function select(e) {
    setSelected(e);
    setReason("");
    setHistory([]);
    setError("");
    try {
      const d = await api("emergency?teamId=" + e.team_id);
      setHistory(d.history);
    } catch (e) {
      setError(e.message);
    }
  }
  async function reopen(e) {
    e.preventDefault();
    if (
      !window.confirm(
        `Reopen ${selected.team_snapshot.team_name}? The judge will be able to change and resubmit this evaluation.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("emergency", {
        teamId: selected.team_id,
        revision: data.revision,
        evaluationRevision: selected.revision,
        reason,
      });
      setMessage(
        "Evaluation reopened. The judge can refresh and edit it. The previous submission remains in the audit history.",
      );
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Emergency access</h2>
          <p>
            Review submissions and reopen a locked evaluation only when a
            correction is needed.
          </p>
        </div>
        <button disabled={busy} onClick={load}>
          Refresh evaluations
        </button>
      </div>
      {error && (
        <p role="alert" className="error banner">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success banner">
          {message}
        </p>
      )}
      <div className="workspace">
        <section className="card directory">
          <label className="directory-search emergency-search">
            Find evaluation
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Team name, team code, or judge"
            />
          </label>
          {data?.evaluations
            .filter((e) =>
              `${e.team_snapshot.team_name} ${e.team_snapshot.team_code} ${e.judge_name}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((e) => (
              <button
                className="judge-row"
                key={e.team_id}
                onClick={() => select(e)}
              >
                <span>
                  <strong>{e.team_snapshot.team_name}</strong>
                  <small>
                    {e.team_snapshot.team_code} · {e.judge_name}
                  </small>
                </span>
                <span>
                  {e.status === "submitted" ? "Locked" : "Draft"} ·{" "}
                  {scoreTotal(e.scores)}/25
                </span>
              </button>
            ))}
          {!data?.evaluations.length && (
            <div className="empty">
              {busy ? "Loading evaluations…" : "No evaluations saved yet."}
            </div>
          )}
        </section>
        <section className="card assignment">
          {!selected ? (
            <p className="muted">
              Select an evaluation to view its marks and history.
            </p>
          ) : (
            <>
              <h2>{selected.team_snapshot.team_name}</h2>
              <p className="muted">
                {selected.judge_name} ·{" "}
                {selected.status === "submitted"
                  ? "Submitted and locked"
                  : "Draft"}
              </p>
              <dl className="score-review">
                {CRITERIA.map((c) => (
                  <div key={c.id}>
                    <dt>{c.name}</dt>
                    <dd>{selected.scores[c.id] ?? "—"} / 5</dd>
                  </div>
                ))}
              </dl>
              <h3>Nominations</h3>
              <ul>
                {(AWARDS[selected.team_snapshot.sector_track] || [])
                  .filter((a) => selected.nominations.includes(a[0]))
                  .map((a) => (
                    <li key={a[0]}>{a[1]}</li>
                  ))}
              </ul>
              {!selected.nominations.length && (
                <p className="muted">No nominations.</p>
              )}
              {selected.status === "submitted" && (
                <form onSubmit={reopen}>
                  <label>
                    Reason for reopening
                    <textarea
                      required
                      minLength="5"
                      maxLength="1000"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows="3"
                    />
                  </label>
                  <button
                    className="danger"
                    disabled={busy || reason.trim().length < 5}
                  >
                    Reopen evaluation
                  </button>
                </form>
              )}
              <h3 className="review-heading">Audit history</h3>
              {history.map((h) => (
                <details className="history-entry" key={h.id}>
                  <summary>
                    {h.action === "reopen"
                      ? "Reopened"
                      : h.action === "submit"
                        ? "Submitted"
                        : "Draft saved"}{" "}
                    · {h.actor}
                    <small>{new Date(h.created_at).toLocaleString()}</small>
                  </summary>
                  {h.reason && <p>{h.reason}</p>}
                  <p>Total: {scoreTotal(h.next_snapshot.scores)} / 25</p>
                  <p>
                    {CRITERIA.map(
                      (c) =>
                        `${c.name}: ${h.next_snapshot.scores[c.id] ?? "—"}`,
                    ).join(" · ")}
                  </p>
                  <small>
                    Nominations:{" "}
                    {(AWARDS[h.next_snapshot.team_snapshot.sector_track] || [])
                      .filter((a) => h.next_snapshot.nominations.includes(a[0]))
                      .map((a) => a[1])
                      .join(", ") || "None"}
                  </small>
                </details>
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}
