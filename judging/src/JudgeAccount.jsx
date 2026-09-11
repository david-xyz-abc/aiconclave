import React, { useState } from "react";
import { api } from "./client.js";
export function JudgeAccount({ judge, revision, onSaved }) {
  const [username, setUsername] = useState(judge.login_username || ""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (
      judge.login_username &&
      !window.confirm(
        "Reset this judge’s password and sign out their current sessions?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("judge-accounts", {
        judgeId: judge.id,
        revision,
        username,
        password,
      });
      setPassword("");
      setMessage(
        "Judge login saved. Share the login ID and password with this judge.",
      );
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="preview">
      <h3>Judge login</h3>
      <p className="hint">
        Each judge uses a separate login ID and password. Roster names and login
        IDs can be different.
      </p>
      <form onSubmit={submit}>
        <label>
          Login ID
          <input
            required
            pattern="[a-zA-Z0-9._-]{3,60}"
            value={username}
            autoComplete="off"
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          {judge.login_username ? "New password" : "Password"}
          <input
            type="password"
            required
            minLength="8"
            maxLength="128"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={busy}>
          {judge.login_username ? "Reset judge login" : "Create judge login"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
    </section>
  );
}
