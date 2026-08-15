import { useEffect, useMemo, useState } from "react";

const participantTypeOptions = [
  "Student",
  "Faculty / Academic",
  "Professional / Industry Delegate",
  "Researcher",
  "Other",
];

const panelOptions = [
  "AI in Agriculture",
  "AI in Education",
  "AI in Healthcare",
  "Interested in All Panels",
];

const registrationSections = [
  { id: "panel", number: "01", label: "Panel Discussion", status: "Live" },
  { id: "hackathon", number: "02", label: "Hackathon", status: "Awaiting themes" },
  { id: "workshops", number: "03", label: "Workshops", status: "Awaiting list" },
];

function formatDate(value) {
  if (!value) return "—";
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "Not provided" : value;
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
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-footnote">AI Conclave 2026 · Delegate data</p>
      </section>
    </main>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PanelTable({ registrations, loading, onOpen }) {
  if (loading) return <div className="table-state">Loading panel registrations…</div>;
  if (!registrations.length) return <div className="table-state">No registrations match the current filters.</div>;

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
            <th scope="col" className="action-heading"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => (
            <tr key={registration.id}>
              <td data-label="Participant">
                <strong className="cell-name">{registration.name}</strong>
                <a className="cell-secondary" href={`mailto:${registration.email}`}>{registration.email}</a>
              </td>
              <td data-label="Type"><span className="category-mark">{registration.participant_type}</span></td>
              <td data-label="Organisation">
                {registration.organisation}
                {registration.department && <span className="cell-secondary">{registration.department}</span>}
              </td>
              <td data-label="Panel"><span className="panel-mark">{registration.panel_selection}</span></td>
              <td data-label="Registered" className="cell-date">{formatDate(registration.created_at)}</td>
              <td data-label="Actions" className="cell-action">
                <button type="button" className="view-button" onClick={() => onOpen(registration)}>View details <span aria-hidden="true">→</span></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailItem({ label, children, wide = false }) {
  return <div className={`detail-item${wide ? " detail-item-wide" : ""}`}><dt>{label}</dt><dd>{children}</dd></div>;
}

function RegistrationDetails({ registration, onClose, onDelete, deleting }) {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!registration) return null;
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="detail-head">
          <div>
            <p className="eyebrow">Panel registration #{registration.id}</p>
            <h2 id="detail-title">{registration.name}</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close registration details">×</button>
        </div>
        <dl className="detail-grid">
          <DetailItem label="Email"><a href={`mailto:${registration.email}`}>{registration.email}</a></DetailItem>
          <DetailItem label="Phone"><a href={`tel:${registration.phone}`}>{registration.phone}</a></DetailItem>
          <DetailItem label="Participant type">{registration.participant_type}</DetailItem>
          <DetailItem label="Registered">{formatDate(registration.created_at)}</DetailItem>
          <DetailItem label="Organisation" wide>{registration.organisation}</DetailItem>
          <DetailItem label="Department / Branch" wide>{displayValue(registration.department)}</DetailItem>
          <DetailItem label="Panel selection" wide><span className="panel-mark">{registration.panel_selection}</span></DetailItem>
          <DetailItem label="Industry sector">{displayValue(registration.industry_sector)}</DetailItem>
          <DetailItem label="Sector details">{displayValue(registration.industry_sector_other)}</DetailItem>
          <DetailItem label="Organisation type">{displayValue(registration.organisation_type)}</DetailItem>
          <DetailItem label="Organisation details">{displayValue(registration.organisation_type_other)}</DetailItem>
          <DetailItem label="Information confirmed">{registration.information_confirmed ? "Yes" : "No"}</DetailItem>
          <DetailItem label="Updates opt-in">{registration.updates_opt_in ? "Yes" : "No"}</DetailItem>
        </dl>
        <div className="detail-actions">
          <button className="button button-quiet" type="button" onClick={onClose}>Close</button>
          <button className="button button-danger" type="button" disabled={deleting} onClick={() => onDelete(registration)}>{deleting ? "Deleting…" : "Delete registration"}</button>
        </div>
      </aside>
    </div>
  );
}

function EmptyRegistrationSection({ section }) {
  return (
    <section className="setup-section">
      <span className="setup-number">{section.number}</span>
      <p className="eyebrow">Registration module</p>
      <h2>{section.label}</h2>
      <p>This dashboard section will be connected after the registration fields and event list are finalised.</p>
      <span className="setup-status">{section.status}</span>
    </section>
  );
}

function Dashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("panel");
  const [registrations, setRegistrations] = useState([]);
  const [query, setQuery] = useState("");
  const [participantType, setParticipantType] = useState("all");
  const [panel, setPanel] = useState("all");
  const [sector, setSector] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadRegistrations() {
      try {
        const response = await fetch("/api/registrations?type=panel");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load panel registrations.");
        if (active) setRegistrations(data.registrations || []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRegistrations();
    return () => { active = false; };
  }, []);

  const sectorOptions = useMemo(() => [...new Set(registrations.map((item) => item.industry_sector).filter(Boolean))].sort(), [registrations]);

  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return registrations.filter((registration) => {
      if (participantType !== "all" && registration.participant_type !== participantType) return false;
      if (panel !== "all" && registration.panel_selection !== panel) return false;
      if (sector !== "all" && registration.industry_sector !== sector) return false;
      const searchable = [
        registration.name,
        registration.email,
        registration.phone,
        registration.participant_type,
        registration.organisation,
        registration.department,
        registration.panel_selection,
        registration.industry_sector,
        registration.industry_sector_other,
        registration.organisation_type,
        registration.organisation_type_other,
      ].filter(Boolean).join(" ").toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
  }, [panel, participantType, query, registrations, sector]);

  const allPanelsCount = registrations.filter((item) => item.panel_selection === "Interested in All Panels").length;
  const studentCount = registrations.filter((item) => item.participant_type === "Student").length;
  const latestRegistration = registrations[0]?.created_at;

  function resetFilters() {
    setQuery("");
    setParticipantType("all");
    setPanel("all");
    setSector("all");
  }

  async function deleteRegistration(registration) {
    if (!window.confirm(`Delete the panel registration for ${registration.name}? This cannot be undone.`)) return;
    setError("");
    setDeletingId(registration.id);
    try {
      const response = await fetch(`/api/registrations/${registration.id}?type=panel`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete registration.");
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
      setSelectedRegistration(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const currentSection = registrationSections.find((section) => section.id === activeSection);

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">AC</span><span>AI Conclave 2026</span></div>
        <div className="topbar-meta"><span className="signed-in">Signed in as {user?.username || "admin"}</span><button className="button button-quiet" onClick={logout}>Log out</button></div>
      </header>

      <main className="dashboard-main">
        <header className="dashboard-intro">
          <div><p className="eyebrow">Registration operations</p><h1>Delegate directory</h1></div>
          <p>Review registrations across every AI Conclave programme from one protected workspace.</p>
        </header>

        <nav className="section-switcher" aria-label="Registration sections">
          {registrationSections.map((section) => (
            <button key={section.id} type="button" className={`section-card${activeSection === section.id ? " is-active" : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "page" : undefined}>
              <span className="section-number">{section.number}</span>
              <strong>{section.label}</strong>
              <small>{section.id === "panel" ? `${registrations.length} registrations` : section.status}</small>
            </button>
          ))}
        </nav>

        {activeSection !== "panel" ? <EmptyRegistrationSection section={currentSection} /> : <>
          <section className="metrics-grid" aria-label="Panel registration summary">
            <MetricCard label="Total registrations" value={registrations.length} detail="Panel delegates" />
            <MetricCard label="Students" value={studentCount} detail="Registered students" />
            <MetricCard label="All panels" value={allPanelsCount} detail="Multi-panel interest" />
            <MetricCard label="Latest entry" value={latestRegistration ? formatDate(latestRegistration).split(",")[0] : "—"} detail={latestRegistration ? formatDate(latestRegistration) : "No entries yet"} />
          </section>

          <section className="data-section" aria-labelledby="table-heading">
            <div className="data-heading">
              <div><p className="eyebrow">Panel discussion</p><h2 id="table-heading">Registered participants</h2><p>{filteredRegistrations.length} of {registrations.length} entries shown</p></div>
              <button className="reset-button" type="button" onClick={resetFilters}>Clear filters</button>
            </div>
            <div className="filters">
              <label className="search-control"><span>Search all details</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone or organisation" /></label>
              <label><span>Participant type</span><select value={participantType} onChange={(event) => setParticipantType(event.target.value)}><option value="all">All participant types</option>{participantTypeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>Panel selection</span><select value={panel} onChange={(event) => setPanel(event.target.value)}><option value="all">All panel selections</option>{panelOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>Industry sector</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">All sectors</option>{sectorOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            </div>
            {error ? <div className="table-state table-error" role="alert">{error}</div> : <PanelTable registrations={filteredRegistrations} loading={loading} onOpen={setSelectedRegistration} />}
          </section>
        </>}
      </main>

      <RegistrationDetails registration={selectedRegistration} onClose={() => setSelectedRegistration(null)} onDelete={deleteRegistration} deleting={deletingId === selectedRegistration?.id} />
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
