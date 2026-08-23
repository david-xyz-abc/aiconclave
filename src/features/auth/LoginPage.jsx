import { useState } from "react";
import { BrandLockup } from "../../components/common/BrandLockup.jsx";
import { authApi } from "../../services/dashboardApi.js";

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await authApi.login(username, password);
      onLogin(data.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-heading">
        <BrandLockup />
        <div className="auth-copy">
          <p className="eyebrow">Private operations</p>
          <h1 id="login-heading">Registration dashboard</h1>
          <p>Sign in to review and manage delegate registrations.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
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
            {busy ? "Signing in…" : "Sign in"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-footnote">AI Conclave 2026 · Delegate data</p>
      </section>
    </main>
  );
}
