import React, { useState, useEffect } from "react";
import { api } from "./client.js";
import {
  nominationOptions,
  validNominations,
  CRITERIA,
  validScores,
  scoreTotal,
  evaluationMaximum,
  editableScores,
  isNotPresent,
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
        setScores(e?.status === "submitted" ? e.scores : editableScores(e));
        const currentTeam = d.teams.find((t) => t.team_id === teamId);
        if (e?.status !== "submitted") setStep(validScores(editableScores(e), true) ? 1 : 0);
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
    setScores(e?.status === "submitted" ? e.scores : editableScores(e));
    setStep(e?.status === "submitted" ? 2 : validScores(editableScores(e), true) ? 1 : 0);
    window.scrollTo({ top: 0, behavior: "instant" });
    setDirty(false);
    setError("");
    setMessage("");
  }
  async function save(action, nextStep) {
    if (busy) return;
    if (action === "absent" && !window.confirm(`Mark ${shown.team_name} as NOT PRESENT? This disqualifies the team, submits 0 for all five criteria and no award nomination, and locks the evaluation. Only the venue team can reopen it.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("evaluations", {
        action,
        teamId,
        revision: saved?.revision || 0,
        ...(action === "absent" ? { confirmAbsent: true } : {}),
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
        ["submit", "absent"].includes(action)
          ? `${shown.team_name}: ${action === "absent" ? "not present — disqualified with zero marks" : "evaluation submitted"}.`
          : "Draft saved.",
      );
      if (["submit", "absent"].includes(action)) {
        setTeamId(null);
        setStep(0);
        window.scrollTo({ top: 0, behavior: "instant" });
      } else if (nextStep !== undefined) setStep(nextStep);
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
  const awards = nominationOptions(shown?.sector_track);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="https://aiconclave-dashboard-alpha.pages.dev/" aria-label="Home" title="Home" onClick={event => { if (dirty && !window.confirm("Return home and discard unsaved changes?")) event.preventDefault(); }}>
          <span><i className="fas fa-home" aria-hidden="true" /></span>
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
          {team ? (
            <div className="judge-detail-actions">
              <button disabled={busy} onClick={() => select(null)}>← Back to your teams</button>
              {!locked && <button className="absent-button" disabled={busy || data.routeNeedsReview} onClick={() => save("absent")}>Not present · Disqualify</button>}
            </div>
          ) : (
            <>
              <div>
                <h1>Your teams</h1>
                <p>{completed} of {data?.teams.length || 0} evaluations submitted</p>
              </div>
              <button disabled={busy} onClick={load}>Refresh</button>
            </>
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
                  className={`card judge-team ${e?.status === "submitted" ? "team-submitted" : ""}`}
                  disabled={busy}
                  key={t.team_id}
                  onClick={() => select(t)}
                >
                  <div>
                    <strong>{t.team_name}</strong>
                    <p>Team leader: {t.leader_name || "Not available"}</p>
                    <small>{t.team_code}</small>
                  </div>
                  <div className="team-card-location" aria-label="Room and table">
                    <b>{t.room_name || "Pending"} / {t.table_number ? `T${t.table_number}` : "—"}</b>
                  </div>
                  <span
                    className={`badge ${e?.status === "submitted" ? "complete" : ""}`}
                  >
                    {e?.status === "submitted"
                      ? isNotPresent(e) ? "Not present · Disqualified" : "Submitted"
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
              <span aria-label="Team name"><h1>{shown.team_name}</h1></span>
              <span aria-label="Team leader"><b>{shown.leader_name || "Not available"}</b></span>
              <span aria-label="Team code"><b>{shown.team_code}</b></span>
              <span aria-label="Room and table"><b>{shown.room_name || "Pending"} / {shown.table_number ? `T${shown.table_number}` : "—"}</b></span>
              <span aria-label="Category"><b>{shown.participant_category}</b></span>
              <span aria-label="Sector"><b>{shown.sector_track}</b></span>
            </div>
            {!locked && (
              <ol className="evaluation-steps" aria-label="Evaluation steps">
                {["Score the team", "Award nomination", "Review & submit"].map(
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
                {isNotPresent(saved) ? "Not present — disqualified. All scores are zero; no award nomination. " : "Evaluation completed. "}
                Submitted on {new Date(saved.submitted_at).toLocaleString()}.
                This evaluation is locked. Only the venue team can reopen it in
                an emergency.
              </div>
            ) : null}
            <section className="card evaluation-form">
              {!locked && step === 1 ? (
                <>
                  <h2>Best {shown.sector_track} Innovation</h2>
                  <p className="muted">
                    Choose one award for this team, or select None of the above.
                    A selection is required to continue.
                  </p>
                  <fieldset disabled={busy || data.routeNeedsReview}>
                    <legend className="sr-only">Award nominations</legend>
                    <div className="award-options">
                      {awards.map(([id, name, description]) => (
                        <label className="award-option" key={id}>
                          <input
                            type="radio"
                            name="award-nomination"
                            value={id}
                            required
                            checked={nominations.length === 1 && nominations.includes(id)}
                            onChange={() => {
                              setNominations([id]);
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
                      <button onClick={() => { if (!dirty || window.confirm("Discard unsaved nomination changes and return to scoring?")) { setNominations(saved?.nominations || []); setDirty(false); setStep(0); } }}>← Scores</button>
                      <small>
                        {dirty
                          ? "Unsaved changes"
                          : saved?.nominations_saved
                            ? "Nominations saved"
                            : "No nominations selected yet"}
                      </small>
                      <button
                        className="primary"
                        disabled={!validNominations(nominations, shown.sector_track)}
                        onClick={() => save("nominations", 2)}
                      >
                        Next · review & submit
                      </button>
                    </div>
                  </fieldset>
                </>
              ) : !locked && step === 0 ? (
                <>
                  <h2>Judges evaluation</h2>
                  <p className="muted">
                    Award 1–10 marks, or choose No credit (0), for each criterion. Tap a selected score again to clear it. Maximum total: 50.
                  </p>
                  {saved && evaluationMaximum(saved) === 5 && <p className="notice">This older draft used marks out of 5. Its marks are doubled below to keep the same proportions out of 10. Review before saving.</p>}
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
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                            <button
                              type="button"
                              key={value}
                              aria-label={`${c.name}: ${value} out of 10`}
                              aria-pressed={scores[c.id] === value}
                              onClick={() => {
                                setScores((current) => {
                                  const next = { ...current };
                                  if (next[c.id] === value) delete next[c.id];
                                  else next[c.id] = value;
                                  return next;
                                });
                                setDirty(true);
                              }}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                        <button type="button" className="zero-score" aria-label={`${c.name}: No credit (0)`} aria-pressed={scores[c.id] === 0} onClick={() => {
                          setScores((current) => {
                            const next = { ...current };
                            if (next[c.id] === 0) delete next[c.id];
                            else next[c.id] = 0;
                            return next;
                          });
                          setDirty(true);
                        }}>No credit (0)</button>
                      </section>
                    ))}
                    <div className="score-total">
                      <span>Total mark</span>
                      <strong>{scoreTotal(scores)} / {locked ? evaluationMaximum(saved) * 5 : 50}</strong>
                      <small>
                        {Object.keys(scores).length} of 5 criteria scored
                      </small>
                    </div>
                    <div className="form-actions">
                      <button onClick={() => save("scores")}>Save draft</button>
                      <button
                        className="primary"
                        disabled={!validScores(scores, true)}
                        onClick={() => save("scores", 1)}
                      >
                        Next · award nomination
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
                        <dd>{scores[c.id] ?? "—"} / {locked ? evaluationMaximum(saved) : 10}</dd>
                      </div>
                    ))}
                    <div className="score-total">
                      <dt>Total mark</dt>
                      <dd>{scoreTotal(scores)} / {locked ? evaluationMaximum(saved) * 5 : 50}</dd>
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
                          ← Award nomination
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
