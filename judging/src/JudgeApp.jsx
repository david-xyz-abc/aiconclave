import React, { useState, useEffect } from "react";
import { api } from "./client.js";
import {
  AWARDS,
  CRITERIA,
  validScores,
  scoreTotal,
} from "../shared/evaluation.js";
export function JudgeApp({ user, onLogout }) {
  const [data, setData] = useState(null),
    [teamId, setTeamId] = useState(null),
    [step, setStep] = useState(0),
    [nominations, setNominations] = useState([]),
    [scores, setScores] = useState({}),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const team = data?.teams.find((t) => t.team_id === teamId),
    saved = data?.evaluations.find((e) => e.team_id === teamId),
    locked = saved?.status === "submitted";
  const shown = locked ? saved.team_snapshot : team;
  async function load() {
    setBusy(true);
    setError("");
    try {
      const d = await api("evaluations");
      setData(d);
      if (teamId) {
        const e = d.evaluations.find((e) => e.team_id === teamId);
        setNominations(e?.nominations || []);
        setScores(e?.scores || {});
      }
      setDirty(false);
    } catch (e) {
      if (e.status === 401) onLogout();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function select(t) {
    if (
      dirty &&
      !window.confirm("Leave this team and discard unsaved changes?")
    )
      return;
    const e = data.evaluations.find((e) => e.team_id === t?.team_id);
    setTeamId(t?.team_id || null);
    setNominations(e?.nominations || []);
    setScores(e?.scores || {});
    setStep(e?.status === "submitted" ? 2 : e?.nominations_saved ? 1 : 0);
    setDirty(false);
    setError("");
    setMessage("");
  }
  async function save(action, nextStep) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("evaluations", {
        action,
        teamId,
        revision: saved?.revision || 0,
        ...(action === "nominations"
          ? { nominations }
          : action === "scores"
            ? { scores }
            : {}),
      });
      setData((d) => ({
        ...d,
        evaluations: [
          ...d.evaluations.filter((e) => e.team_id !== teamId),
          result.evaluation,
        ],
      }));
      setNominations(result.evaluation.nominations);
      setScores(result.evaluation.scores);
      setDirty(false);
      setMessage(
        action === "submit"
          ? "Evaluation submitted and locked."
          : "Draft saved.",
      );
      if (nextStep !== undefined) setStep(nextStep);
    } catch (e) {
      if (e.status === 401) onLogout();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const completed =
    data?.teams.filter((t) =>
      data.evaluations.some(
        (e) => e.team_id === t.team_id && e.status === "submitted",
      ),
    ).length || 0;
  const awards = AWARDS[shown?.sector_track] || [];
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span>AC</span>
          <strong>AI CONCLAVE 2026</strong>
          <i>Judging</i>
        </a>
        <div>
          <span className="staff-label">
            {data?.judge?.name || user.username}
          </span>
          <button
            onClick={async () => {
              if (
                dirty &&
                !window.confirm("Log out and discard unsaved changes?")
              )
                return;
              await fetch("/api/auth", { method: "DELETE" });
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="main judge-main">
        <div className="page-head">
          <div>
            <h1>{team ? shown.team_name : "Your teams"}</h1>
            <p>
              {team
                ? `Team leader: ${shown.leader_name || "Not available"}`
                : `${completed} of ${data?.teams.length || 0} evaluations submitted`}
            </p>
          </div>
          {team ? (
            <button disabled={busy} onClick={() => select(null)}>
              ← Your teams
            </button>
          ) : (
            <button disabled={busy} onClick={load}>
              Refresh
            </button>
          )}
        </div>
        {error && (
          <div className="error banner" role="alert">
            {error}{" "}
            <button
              className="text-button"
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Reload and discard unsaved changes?")
                )
                  load();
              }}
            >
              Reload
            </button>
          </div>
        )}
        {message && (
          <div className="success banner" role="status">
            {message}
          </div>
        )}
        {data?.routeNeedsReview && (
          <div className="notice banner">
            Your route needs review after a seating change. Contact the venue
            team before continuing.
          </div>
        )}
        {!data ? (
          <div className="card empty">
            {busy
              ? "Loading your teams…"
              : "Could not load teams. Use Refresh to retry."}
          </div>
        ) : !team ? (
          <div className="judge-team-list">
            {data.teams.map((t) => {
              const e = data.evaluations.find((e) => e.team_id === t.team_id);
              return (
                <button
                  className="card judge-team"
                  key={t.team_id}
                  onClick={() => select(t)}
                >
                  <div>
                    <strong>{t.team_name}</strong>
                    <p>Team leader: {t.leader_name || "Not available"}</p>
                    <small>
                      {t.team_code} · {t.room_name || "Room pending"} / Table{" "}
                      {t.table_number || "—"}
                    </small>
                  </div>
                  <span
                    className={`badge ${e?.status === "submitted" ? "complete" : ""}`}
                  >
                    {e?.status === "submitted"
                      ? "Submitted"
                      : e
                        ? "Draft saved"
                        : "Not started"}{" "}
                    →
                  </span>
                </button>
              );
            })}
            {!data.teams.length && (
              <div className="card empty">
                No teams assigned yet. The venue team will assign your route.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="team-context card">
              <span>
                <small>Team code</small>
                {shown.team_code}
              </span>
              <span>
                <small>Venue / table</small>
                {shown.room_name || "Pending"} / {shown.table_number || "—"}
              </span>
              <span>
                <small>Category</small>
                {shown.participant_category}
              </span>
              <span>
                <small>Sector</small>
                {shown.sector_track}
              </span>
            </div>
            {!locked && (
              <ol className="evaluation-steps" aria-label="Evaluation steps">
                {["Nominations", "Evaluation", "Review & submit"].map(
                  (label, index) => (
                    <li
                      key={label}
                      aria-current={index === step ? "step" : undefined}
                    >
                      {index + 1}. {label}
                    </li>
                  ),
                )}
              </ol>
            )}
            {locked ? (
              <div className="success banner">
                Submitted on {new Date(saved.submitted_at).toLocaleString()}.
                This evaluation is locked. Only the venue team can reopen it in
                an emergency.
              </div>
            ) : null}
            <section className="card evaluation-form">
              {!locked && step === 0 ? (
                <>
                  <h2>Best {shown.sector_track} Innovation</h2>
                  <p className="muted">
                    Select the awards you want to nominate this team for. You
                    may select more than one, or continue without a nomination.
                  </p>
                  <fieldset disabled={busy || data.routeNeedsReview}>
                    <legend className="sr-only">Award nominations</legend>
                    <div className="award-options">
                      {awards.map(([id, name, description]) => (
                        <label className="award-option" key={id}>
                          <input
                            type="checkbox"
                            checked={nominations.includes(id)}
                            onChange={(e) => {
                              setNominations(
                                e.target.checked
                                  ? [...nominations, id]
                                  : nominations.filter((n) => n !== id),
                              );
                              setDirty(true);
                            }}
                          />
                          <span>
                            <strong>{name}</strong>
                            <small>{description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="form-actions">
                      <small>
                        {dirty
                          ? "Unsaved changes"
                          : saved?.nominations_saved
                            ? "Nominations saved"
                            : "No nominations selected yet"}
                      </small>
                      <button
                        className="primary"
                        onClick={() => save("nominations", 1)}
                      >
                        Next · save nominations
                      </button>
                    </div>
                  </fieldset>
                </>
              ) : !locked && step === 1 ? (
                <>
                  <h2>Judges evaluation</h2>
                  <p className="muted">
                    Award 0–5 marks for each criterion. Maximum total: 25.
                  </p>
                  <fieldset disabled={busy || data.routeNeedsReview}>
                    <legend className="sr-only">Evaluation scores</legend>
                    {CRITERIA.map((c) => (
                      <section className="criterion" key={c.id}>
                        <h3>{c.name}</h3>
                        <p>{c.description}</p>
                        <div
                          className="score-buttons"
                          role="group"
                          aria-label={`${c.name} score`}
                        >
                          {[0, 1, 2, 3, 4, 5].map((value) => (
                            <button
                              type="button"
                              key={value}
                              aria-label={`${c.name}: ${value} out of 5`}
                              aria-pressed={scores[c.id] === value}
                              onClick={() => {
                                setScores({ ...scores, [c.id]: value });
                                setDirty(true);
                              }}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                    <div className="score-total">
                      <span>Total mark</span>
                      <strong>{scoreTotal(scores)} / 25</strong>
                      <small>
                        {Object.keys(scores).length} of 5 criteria scored
                      </small>
                    </div>
                    <div className="form-actions">
                      <button
                        onClick={() => {
                          if (
                            dirty &&
                            !window.confirm(
                              "Go back and discard unsaved score changes?",
                            )
                          )
                            return;
                          setScores(saved?.scores || {});
                          setDirty(false);
                          setStep(0);
                        }}
                      >
                        ← Nominations
                      </button>
                      <button onClick={() => save("scores")}>Save draft</button>
                      <button
                        className="primary"
                        disabled={!validScores(scores, true)}
                        onClick={() => save("scores", 2)}
                      >
                        Save evaluation
                      </button>
                    </div>
                  </fieldset>
                </>
              ) : (
                <>
                  <h2>
                    {locked ? "Submitted evaluation" : "Review your evaluation"}
                  </h2>
                  <h3 className="review-heading">Award nominations</h3>
                  {nominations.length ? (
                    <ul>
                      {awards
                        .filter((a) => nominations.includes(a[0]))
                        .map((a) => (
                          <li key={a[0]}>{a[1]}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="muted">No award nominations.</p>
                  )}
                  <dl className="score-review">
                    {CRITERIA.map((c) => (
                      <div key={c.id}>
                        <dt>{c.name}</dt>
                        <dd>{scores[c.id] ?? "—"} / 5</dd>
                      </div>
                    ))}
                    <div className="score-total">
                      <dt>Total mark</dt>
                      <dd>{scoreTotal(scores)} / 25</dd>
                    </div>
                  </dl>
                  {!locked && (
                    <>
                      <p className="notice">
                        Submit only when these details are final. You cannot
                        change the scores or nominations after submission.
                      </p>
                      <div className="form-actions">
                        <button disabled={busy} onClick={() => setStep(1)}>
                          ← Back to evaluation
                        </button>
                        <button
                          className="primary"
                          disabled={busy || data.routeNeedsReview}
                          onClick={() => save("submit", 2)}
                        >
                          {busy ? "Submitting…" : "Submit details permanently"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
