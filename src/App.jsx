import { useEffect, useMemo, useState } from "react";

const categoryOptions = [
  "Student",
  "Faculty",
  "Farmer",
  "Healthcare Professional",
  "Industry",
  "Other",
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseTracks(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      onLogin(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-heading">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">AC</span>
          <span>AI Conclave 2026</span>
        </div>
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
          {error && <p className="form-error" role="alert">{error}</p>}
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

function RegistrationTable({ registrations, loading, onDelete, deletingId }) {
  if (loading) return <div className="table-state">Loading registrations…</div>;
  if (!registrations.length) {
    return <div className="table-state">No registrations match the current filters.</div>;
  }
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Organisation</th>
            <th scope="col">Category</th>
            <th scope="col">Tracks</th>
            <th scope="col">Registered</th>
            <th scope="col" className="action-heading"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => {
            const tracks = parseTracks(registration.tracks);
            return (
              <tr key={registration.id}>
                <td data-label="Name" className="cell-name">{registration.name}</td>
                <td data-label="Email"><a href={`mailto:${registration.email}`}>{registration.email}</a></td>
                <td data-label="Organisation">{registration.organisation}</td>
                <td data-label="Category"><span className="category-mark">{registration.category}</span></td>
                <td data-label="Tracks">
                  <div className="track-list">
                    {tracks.length ? tracks.map((track) => <span key={track}>{track}</span>) : <span>None selected</span>}
                  </div>
                </td>
                <td data-label="Registered" className="cell-date">{formatDate(registration.created_at)}</td>
                <td data-label="Actions" className="cell-action">
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => onDelete(registration)}
                    disabled={deletingId === registration.id}
                    aria-label={`Delete registration for ${registration.name}`}
                  >
                    {deletingId === registration.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/registrations")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load registrations.");
        if (active) setRegistrations(data.registrations || []);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function deleteRegistration(registration) {
    if (!window.confirm(`Delete the registration for ${registration.name}? This cannot be undone.`)) return;
    setError("");
    setDeletingId(registration.id);
    try {
      const response = await fetch(`/api/registrations/${registration.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete registration.");
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return registrations.filter((registration) => {
      const matchesCategory = category === "all" || registration.category === category;
      const searchable = [registration.name, registration.email, registration.organisation, registration.category]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query, registrations]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">AC</span>
          <span>AI Conclave 2026</span>
        </div>
        <div className="topbar-meta">
          <span className="signed-in">Signed in as {user?.username || "admin"}</span>
          <button className="button button-quiet" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="data-section" aria-labelledby="table-heading">
          <div className="data-heading">
            <div>
              <h2 id="table-heading">All entries</h2>
              <p>{filteredRegistrations.length} of {registrations.length} registrations shown</p>
            </div>
            <div className="filters">
              <label className="search-control">
                <span className="sr-only">Search registrations</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registrations" />
              </label>
              <label>
                <span className="sr-only">Filter by category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>
          {error ? <div className="table-state table-error" role="alert">{error}</div> : <RegistrationTable registrations={filteredRegistrations} loading={loading} onDelete={deleteRegistration} deletingId={deletingId} />}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        setSession({ loading: false, user: response.ok && data.ok ? data.user : null });
      })
      .catch(() => setSession({ loading: false, user: null }));
  }, []);

  if (session.loading) return <div className="loading-screen">Loading dashboard…</div>;
  if (!session.user) return <Login onLogin={(user) => setSession({ loading: false, user })} />;
  return <Dashboard user={session.user} onLogout={() => setSession({ loading: false, user: null })} />;
}
