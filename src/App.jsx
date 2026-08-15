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
  { id: "panel", path: "/panel-registrations", number: "01", label: "Panel Discussion", status: "Live" },
  { id: "hackathon", path: "/hackathon-registrations", number: "02", label: "Hackathon", status: "Awaiting themes" },
  { id: "workshops", path: "/workshop-registrations", number: "03", label: "Workshops", status: "Awaiting list" },
];

const dashboardNavigation = [
  { id: "overview", path: "/", number: "00", label: "Overview", status: "Dashboard" },
  ...registrationSections,
];

function currentDashboardRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return dashboardNavigation.find((item) => item.path === path) || dashboardNavigation[0];
}

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
              <td data-label="Name">
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

function DetailItem({ label, children, wide = false, important = false }) {
  return <div className={`detail-item${wide ? " detail-item-wide" : ""}${important ? " detail-item-important" : ""}`}><dt>{label}</dt><dd>{children}</dd></div>;
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
            <p className="eyebrow">Participant · Registration #{registration.id}</p>
            <h2 id="detail-title">{registration.name}</h2>
            <span className="detail-panel-mark">{registration.panel_selection}</span>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close registration details">×</button>
        </div>
        <dl className="detail-grid">
          <DetailItem label="Email" important><a href={`mailto:${registration.email}`}>{registration.email}</a></DetailItem>
          <DetailItem label="Phone" important><a href={`tel:${registration.phone}`}>{registration.phone}</a></DetailItem>
          <DetailItem label="Participant type" important>{registration.participant_type}</DetailItem>
          <DetailItem label="Registered">{formatDate(registration.created_at)}</DetailItem>
          <DetailItem label="Organisation" wide important>{registration.organisation}</DetailItem>
          <DetailItem label="Department / Branch" wide important>{displayValue(registration.department)}</DetailItem>
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

function DashboardNavigation({ route, panelCount, onNavigate }) {
  const navigate = (event, path) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(path);
  };
  return <>
    <nav className="section-switcher" aria-label="Dashboard pages">
      {dashboardNavigation.map((item) => (
        <a key={item.id} href={item.path} className={`section-card${route.id === item.id ? " is-active" : ""}`} onClick={(event) => navigate(event, item.path)} aria-current={route.id === item.id ? "page" : undefined}>
          <span className="section-number">{item.number}</span>
          <strong>{item.label}</strong>
          <small>{item.id === "panel" ? `${panelCount} registrations` : item.status}</small>
        </a>
      ))}
    </nav>
    <label className="mobile-section-picker">
      <span>Dashboard page</span>
      <div className="mobile-section-control">
        <strong aria-hidden="true">{route.number}</strong>
        <select value={route.path} onChange={(event) => onNavigate(event.target.value)} aria-label="Choose dashboard page">
          {dashboardNavigation.map((item) => (
            <option value={item.path} key={item.id}>{item.label} — {item.id === "panel" ? `${panelCount} registrations` : item.status}</option>
          ))}
        </select>
        <i aria-hidden="true"></i>
      </div>
    </label>
  </>;
}

function OverviewPage({ summary, recent, loading, error, onNavigate }) {
  return <div className="overview-page">
    <section className="metrics-grid" aria-label="Registration summary">
      <MetricCard label="Panel registrations" value={summary.total} detail="Current total" />
      <MetricCard label="Students" value={summary.students} detail="Panel students" />
      <MetricCard label="All panels" value={summary.allPanels} detail="Multi-panel interest" />
    </section>
    <section className="overview-recent" aria-labelledby="recent-heading">
      <div className="data-heading"><div><p className="eyebrow">Latest activity</p><h2 id="recent-heading">Recent panel registrations</h2></div><a href="/panel-registrations" onClick={(event) => { event.preventDefault(); onNavigate("/panel-registrations"); }}>Open directory <span aria-hidden="true">→</span></a></div>
      {error ? <div className="table-state table-error" role="alert">{error}</div> : loading ? <div className="table-state">Loading registrations…</div> : recent.length ? <ul className="recent-list">{recent.map((registration) => <li key={registration.id}><a href="/panel-registrations" onClick={(event) => { event.preventDefault(); onNavigate("/panel-registrations"); }}><span><strong>{registration.name}</strong><small>{registration.panel_selection}</small></span><span>Open <i aria-hidden="true">→</i></span></a></li>)}</ul> : <div className="table-state">No panel registrations yet.</div>}
    </section>
  </div>;
}

function Dashboard({ route, onNavigate, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({ total: 0, students: 0, allPanels: 0 });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [panelLoaded, setPanelLoaded] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [participantType, setParticipantType] = useState("all");
  const [panel, setPanel] = useState("all");
  const [sector, setSector] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadPageData() {
      if (route.id === "overview" && summaryLoaded) return;
      if (route.id === "panel" && panelLoaded) return;
      if (!new Set(["overview", "panel"]).has(route.id)) {
        setLoading(false);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/registrations?type=panel${route.id === "overview" ? "&view=summary" : ""}`);
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          onLogout();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load panel registrations.");
        if (!active) return;
        if (route.id === "overview") {
          setSummary(data.summary || { total: 0, students: 0, allPanels: 0 });
          setRecentRegistrations(data.recent || []);
          setSummaryLoaded(true);
        } else {
          setRegistrations(data.registrations || []);
          setPanelLoaded(true);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPageData();
    return () => { active = false; };
  }, [panelLoaded, route.id, summaryLoaded]);

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

  const activeFilterCount = [participantType !== "all", panel !== "all", sector !== "all"].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setParticipantType("all");
    setPanel("all");
    setSector("all");
    setFiltersOpen(false);
  }

  async function deleteRegistration(registration) {
    if (!window.confirm(`Delete the panel registration for ${registration.name}? This cannot be undone.`)) return;
    setError("");
    setDeletingId(registration.id);
    try {
      const response = await fetch(`/api/registrations/${registration.id}?type=panel`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete registration.");
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
      setSummaryLoaded(false);
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

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">AC</span><span>AI Conclave 2026</span></div>
        <div className="topbar-meta"><button className="button button-quiet" onClick={logout}>Log out</button></div>
      </header>

      <main className="dashboard-main">
        <header className="dashboard-intro">
          <h1>{route.id === "overview" ? "Registration overview" : route.label}</h1>
        </header>

        <DashboardNavigation route={route} panelCount={panelLoaded ? registrations.length : summary.total} onNavigate={onNavigate} />

        {route.id === "overview" ? <OverviewPage summary={summary} recent={recentRegistrations} loading={loading} error={error} onNavigate={onNavigate} /> : route.id !== "panel" ? <EmptyRegistrationSection section={route} /> : <section className="data-section panel-directory" aria-labelledby="table-heading">
            <div className="data-heading">
              <div><p className="eyebrow">Panel discussion</p><h2 id="table-heading">Registered participants</h2><p>{filteredRegistrations.length} of {registrations.length} entries shown</p></div>
              <button className="reset-button" type="button" onClick={resetFilters}>Clear filters</button>
            </div>
            <div className="filters">
              <label className="search-control"><span>Search all details</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone or organisation" /></label>
              <button className="mobile-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="advanced-filters" onClick={() => setFiltersOpen((current) => !current)}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}<span aria-hidden="true">⌄</span></button>
              <div className={`advanced-filters${filtersOpen ? " is-open" : ""}`} id="advanced-filters">
                <label><span>Participant type</span><select value={participantType} onChange={(event) => setParticipantType(event.target.value)}><option value="all">All participant types</option>{participantTypeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Panel selection</span><select value={panel} onChange={(event) => setPanel(event.target.value)}><option value="all">All panel selections</option>{panelOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>Industry sector</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">All sectors</option>{sectorOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              </div>
            </div>
            {error ? <div className="table-state table-error" role="alert">{error}</div> : <PanelTable registrations={filteredRegistrations} loading={loading} onOpen={setSelectedRegistration} />}
          </section>
        }
      </main>

      <RegistrationDetails registration={selectedRegistration} onClose={() => setSelectedRegistration(null)} onDelete={deleteRegistration} deleting={deletingId === selectedRegistration?.id} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [route, setRoute] = useState(currentDashboardRoute);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        setSession({ loading: false, user: response.ok && data.ok ? data.user : null });
      })
      .catch(() => setSession({ loading: false, user: null }));
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(currentDashboardRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.title = `${route.id === "overview" ? "Registration Overview" : route.label} — AI Conclave Dashboard`;
  }, [route]);

  const navigate = (path) => {
    if (path !== window.location.pathname) window.history.pushState({}, "", path);
    setRoute(currentDashboardRoute());
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (session.loading) return <div className="loading-screen">Loading dashboard…</div>;
  if (!session.user) return <Login onLogin={(user) => setSession({ loading: false, user })} />;
  return <Dashboard route={route} onNavigate={navigate} onLogout={() => setSession({ loading: false, user: null })} />;
}
