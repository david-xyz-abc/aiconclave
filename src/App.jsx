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

const hackathonThemes = {
  Agriculture: [
    ["Smart Farming", "IoT-based crop monitoring · Smart irrigation · Automated farming"],
    ["Crop Disease Detection", "Image-based disease identification · Early warning systems"],
    ["Pest Management", "Pest detection · Pest prediction · Eco-friendly pest control"],
    ["Precision Agriculture", "Soil analysis · Crop-specific fertilizer recommendations"],
    ["Water Management", "Irrigation optimization · Water-level monitoring · Drought prediction"],
    ["Weather & Climate", "Weather-based crop advisory · Climate-risk prediction"],
    ["Soil Health", "Soil quality monitoring · Nutrient recommendation"],
    ["Crop Yield Prediction", "AI-based yield forecasting"],
    ["Farmer Support", "Farmer advisory apps · Multilingual voice assistants"],
    ["Market & Price Prediction", "Crop price forecasting · Direct farmer-to-consumer platforms"],
    ["Supply Chain", "Cold-chain monitoring · Post-harvest tracking"],
    ["Post-Harvest Management", "Food spoilage detection · Storage optimization"],
    ["Livestock & Dairy", "Animal health monitoring · Milk-production prediction"],
    ["Sustainable Agriculture", "Organic farming · Carbon footprint reduction"],
    ["Agri-FinTech", "Crop insurance · Agricultural loans · Financial planning"],
    ["Agri-Robotics", "Autonomous harvesting · Weed detection and removal"],
  ],
  Health: [
    ["Disease Detection", "AI-assisted early detection and screening"],
    ["Medical Imaging", "X-ray, CT or MRI image analysis"],
    ["Remote Healthcare", "Telemedicine · Remote consultation"],
    ["Health Monitoring", "IoT-based monitoring · Wearable-based monitoring"],
    ["Maternal & Child Health", "Pregnancy monitoring · Child nutrition"],
    ["Elderly Care", "Fall detection · Medication reminders · Emergency alerts"],
    ["Mental Wellness", "Stress-management applications · Wellness-support applications"],
    ["Nutrition", "Personalized diet and nutrition recommendations"],
    ["Medicine Management", "Medication reminders · Prescription management"],
    ["Emergency Healthcare", "Ambulance coordination · Emergency response"],
    ["Hospital Management", "Queue management · Bed allocation · Resource optimization"],
    ["Public Health", "Disease outbreak monitoring and prediction"],
    ["Accessibility", "Assistive technologies for people with disabilities"],
    ["Healthcare NLP", "Medical document summarization · Multilingual health assistants"],
    ["Health Records", "Secure digital health records"],
    ["Rural Healthcare", "Low-bandwidth healthcare solutions · Community health support"],
    ["Preventive Healthcare", "Risk prediction · Personalized preventive recommendations"],
  ],
  Education: [
    ["Personalized Learning", "AI-generated personalized learning paths"],
    ["AI Tutor", "Intelligent tutoring · Doubt-clearing systems"],
    ["Learning Analytics", "Student performance prediction · Learning-gap identification"],
    ["Accessibility", "Tools for visually and hearing impaired learners"],
    ["Language Learning", "AI-based language learning · Pronunciation systems"],
    ["Multilingual Education", "Translation · Voice-based learning in regional languages"],
    ["Digital Assessment", "Automated evaluation · Question generation"],
    ["Skill Development", "Personalized skill-gap analysis"],
    ["Career Guidance", "AI-based career and course recommendations"],
    ["Dropout Prediction", "Identifying students at risk of dropping out"],
    ["Teacher Support", "Lesson planning · Content generation · Assessment assistance"],
    ["AR/VR Education", "Virtual laboratories · Immersive learning"],
    ["STEM Education", "Interactive science and engineering learning"],
    ["Rural Education", "Offline and low-bandwidth learning platforms"],
    ["Special Education", "Assistive learning for children with special needs"],
    ["Academic Integrity", "Plagiarism · AI-generated content detection"],
    ["Gamification", "Game-based learning and engagement"],
    ["Digital Library", "Intelligent search and recommendation systems"],
  ],
};

const registrationSections = [
  { id: "panel", path: "/panel-registrations", number: "01", label: "Panel Discussion", status: "Live" },
  { id: "hackathon", path: "/hackathon-registrations", number: "02", label: "Hackathon", status: "Live" },
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

function HackathonTable({ registrations, loading, onOpen }) {
  if (loading) return <div className="table-state">Loading hackathon registrations…</div>;
  if (!registrations.length) return <div className="table-state">No hackathon registrations match the current filters.</div>;

  return <div className="table-scroll"><table><thead><tr><th scope="col">Participant</th><th scope="col">Type</th><th scope="col">Track</th><th scope="col">Challenge</th><th scope="col">Registered</th><th scope="col" className="action-heading"><span className="sr-only">Actions</span></th></tr></thead><tbody>
    {registrations.map((registration) => <tr key={registration.id}>
      <td data-label="Name"><strong className="cell-name">{registration.name}</strong><a className="cell-secondary" href={`mailto:${registration.email}`}>{registration.email}</a></td>
      <td data-label="Type"><span className="category-mark">{registration.participant_type}</span></td>
      <td data-label="Track">{parseTracks(registration.tracks).map((track) => <span className="track-mark" key={track}>{track.replace("Hackathon ", "")}</span>)}</td>
      <td data-label="Challenge"><span className="panel-mark">{registration.challenge_area}</span><span className="cell-secondary">{registration.subcategory} · {registration.problem_area}</span></td>
      <td data-label="Registered" className="cell-date">{formatDate(registration.created_at)}</td>
      <td data-label="Actions" className="cell-action"><button type="button" className="view-button" onClick={() => onOpen(registration)}>View details <span aria-hidden="true">→</span></button></td>
    </tr>)}
  </tbody></table></div>;
}

function DetailItem({ label, children, wide = false, important = false }) {
  return <div className={`detail-item${wide ? " detail-item-wide" : ""}${important ? " detail-item-important" : ""}`}><dt>{label}</dt><dd>{children}</dd></div>;
}

function RegistrationDetails({ registration, registrationType, onClose, onDelete, deleting }) {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!registration) return null;
  const isHackathon = registrationType === "hackathon";
  const tracks = parseTracks(registration.tracks);
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="detail-head">
          <div>
            <p className="eyebrow">Participant · Registration #{registration.id}</p>
            <h2 id="detail-title">{registration.name}</h2>
            <span className="detail-panel-mark">{isHackathon ? `${registration.challenge_area} · ${registration.subcategory}` : registration.panel_selection}</span>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close registration details">×</button>
        </div>
        <dl className="detail-grid">
          <DetailItem label="Email" important><a href={`mailto:${registration.email}`}>{registration.email}</a></DetailItem>
          <DetailItem label="Phone" important><a href={`tel:${registration.phone}`}>{registration.phone}</a></DetailItem>
          <DetailItem label="Participant type" important>{registration.participant_type}</DetailItem>
          <DetailItem label="Registered">{formatDate(registration.created_at)}</DetailItem>
          <DetailItem label="Organisation" wide important>{registration.organisation}</DetailItem>
          {isHackathon ? <>
            <DetailItem label="Hackathon track" wide important>{tracks.join(", ")}</DetailItem>
            <DetailItem label="Challenge sector">{registration.challenge_area}</DetailItem>
            <DetailItem label="Subcategory">{registration.subcategory}</DetailItem>
            <DetailItem label="Suggested problem area" wide important>{registration.problem_area}</DetailItem>
            <DetailItem label="Problem statement / idea" wide>{displayValue(registration.idea_summary)}</DetailItem>
          </> : <>
            <DetailItem label="Department / Branch" wide important>{displayValue(registration.department)}</DetailItem>
            <DetailItem label="Industry sector">{displayValue(registration.industry_sector)}</DetailItem>
            <DetailItem label="Sector details">{displayValue(registration.industry_sector_other)}</DetailItem>
            <DetailItem label="Organisation type">{displayValue(registration.organisation_type)}</DetailItem>
            <DetailItem label="Organisation details">{displayValue(registration.organisation_type_other)}</DetailItem>
          </>}
          <DetailItem label="Information confirmed">{registration.information_confirmed ? "Yes" : "No"}</DetailItem>
          {!isHackathon && <DetailItem label="Updates opt-in">{registration.updates_opt_in ? "Yes" : "No"}</DetailItem>}
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

function HackathonThemeCatalog() {
  const [activeTheme, setActiveTheme] = useState("Agriculture");
  const themes = hackathonThemes[activeTheme];
  return (
    <section className="theme-catalog" aria-labelledby="theme-catalog-heading">
      <header className="theme-catalog-head">
        <div><p className="eyebrow">Hackathon form configuration</p><h2 id="theme-catalog-heading">Challenge themes</h2><p>The participant form now uses these sector, subcategory and suggested problem-area options. Registration data will appear here after backend integration.</p></div>
        <span className="setup-status">Frontend ready</span>
      </header>
      <div className="theme-summary" aria-label="Theme summary">
        {Object.entries(hackathonThemes).map(([theme, entries]) => <button type="button" className={activeTheme === theme ? "is-active" : ""} key={theme} onClick={() => setActiveTheme(theme)} aria-pressed={activeTheme === theme}><span>{String(Object.keys(hackathonThemes).indexOf(theme) + 1).padStart(2, "0")}</span><strong>{theme}</strong><small>{entries.length} subcategories</small></button>)}
      </div>
      <div className="theme-list-head"><div><p className="eyebrow">Selected sector</p><h3>{activeTheme}</h3></div><strong>{themes.length}</strong></div>
      <ol className="theme-list">{themes.map(([subcategory, ideas], index) => <li key={subcategory}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{subcategory}</strong><p>{ideas}</p></div></li>)}</ol>
    </section>
  );
}

function DashboardNavigation({ route, counts, onNavigate }) {
  const itemStatus = (item) => counts[item.id] === undefined ? item.status : `${counts[item.id]} registrations`;
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
          <small>{itemStatus(item)}</small>
        </a>
      ))}
    </nav>
    <label className="mobile-section-picker">
      <span>Dashboard page</span>
      <div className="mobile-section-control">
        <strong aria-hidden="true">{route.number}</strong>
        <select value={route.path} onChange={(event) => onNavigate(event.target.value)} aria-label="Choose dashboard page">
          {dashboardNavigation.map((item) => (
            <option value={item.path} key={item.id}>{item.label} — {itemStatus(item)}</option>
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
      <MetricCard label="All registrations" value={summary.total} detail="Current total" />
      <MetricCard label="Panel discussion" value={summary.panelTotal} detail="Day 1 registrations" />
      <MetricCard label="Hackathon" value={summary.hackathonTotal} detail="Day 2 registrations" />
    </section>
    <section className="overview-recent" aria-labelledby="recent-heading">
      <div className="data-heading"><div><p className="eyebrow">Latest activity</p><h2 id="recent-heading">Recent registrations</h2></div></div>
      {error ? <div className="table-state table-error" role="alert">{error}</div> : loading ? <div className="table-state">Loading registrations…</div> : recent.length ? <ul className="recent-list">{recent.map((registration) => { const path = registration.registration_type === "hackathon" ? "/hackathon-registrations" : "/panel-registrations"; return <li key={`${registration.registration_type}-${registration.id}`}><a href={path} onClick={(event) => { event.preventDefault(); onNavigate(path); }}><span><strong>{registration.name}</strong><small>{registration.activity_label}</small></span><span>{registration.registration_type} <i aria-hidden="true">→</i></span></a></li>; })}</ul> : <div className="table-state">No registrations yet.</div>}
    </section>
  </div>;
}

function Dashboard({ route, onNavigate, onLogout }) {
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({ total: 0, panelTotal: 0, hackathonTotal: 0, students: 0 });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [loadedDirectory, setLoadedDirectory] = useState("");
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
    setQuery("");
    setParticipantType("all");
    setPanel("all");
    setSector("all");
    setFiltersOpen(false);
    setSelectedRegistration(null);
  }, [route.id]);

  useEffect(() => {
    let active = true;
    async function loadPageData() {
      if (route.id === "overview" && summaryLoaded) return;
      if (new Set(["panel", "hackathon"]).has(route.id) && loadedDirectory === route.id) return;
      if (!new Set(["overview", "panel", "hackathon"]).has(route.id)) {
        setLoading(false);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const registrationType = route.id === "hackathon" ? "hackathon" : "panel";
        const response = await fetch(`/api/registrations?type=${registrationType}${route.id === "overview" ? "&view=summary" : ""}`);
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          onLogout();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load registrations.");
        if (!active) return;
        if (route.id === "overview") {
          setSummary(data.summary || { total: 0, panelTotal: 0, hackathonTotal: 0, students: 0 });
          setRecentRegistrations(data.recent || []);
          setSummaryLoaded(true);
        } else {
          setRegistrations(data.registrations || []);
          setLoadedDirectory(route.id);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPageData();
    return () => { active = false; };
  }, [loadedDirectory, route.id, summaryLoaded]);

  const participantOptions = useMemo(() => [...new Set(registrations.map((item) => item.participant_type).filter(Boolean))].sort(), [registrations]);
  const focusOptions = useMemo(() => [...new Set(registrations.map((item) => route.id === "hackathon" ? item.challenge_area : item.panel_selection).filter(Boolean))].sort(), [registrations, route.id]);
  const sectorOptions = useMemo(() => [...new Set(registrations.flatMap((item) => route.id === "hackathon" ? parseTracks(item.tracks) : [item.industry_sector]).filter(Boolean))].sort(), [registrations, route.id]);

  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return registrations.filter((registration) => {
      if (participantType !== "all" && registration.participant_type !== participantType) return false;
      if (panel !== "all" && (route.id === "hackathon" ? registration.challenge_area : registration.panel_selection) !== panel) return false;
      if (sector !== "all" && (route.id === "hackathon" ? !parseTracks(registration.tracks).includes(sector) : registration.industry_sector !== sector)) return false;
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
        registration.tracks,
        registration.challenge_area,
        registration.subcategory,
        registration.problem_area,
        registration.idea_summary,
      ].filter(Boolean).join(" ").toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
  }, [panel, participantType, query, registrations, route.id, sector]);

  const activeFilterCount = [participantType !== "all", panel !== "all", sector !== "all"].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setParticipantType("all");
    setPanel("all");
    setSector("all");
    setFiltersOpen(false);
  }

  async function deleteRegistration(registration) {
    const registrationType = route.id === "hackathon" ? "hackathon" : "panel";
    if (!window.confirm(`Delete the ${registrationType} registration for ${registration.name}? This cannot be undone.`)) return;
    setError("");
    setDeletingId(registration.id);
    try {
      const response = await fetch(`/api/registrations/${registration.id}?type=${registrationType}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete registration.");
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
      setLoadedDirectory("");
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

        <DashboardNavigation route={route} counts={{ panel: route.id === "panel" ? registrations.length : summary.panelTotal, hackathon: route.id === "hackathon" ? registrations.length : summary.hackathonTotal }} onNavigate={onNavigate} />

        {route.id === "overview" ? <OverviewPage summary={summary} recent={recentRegistrations} loading={loading} error={error} onNavigate={onNavigate} /> : !new Set(["panel", "hackathon"]).has(route.id) ? <EmptyRegistrationSection section={route} /> : <section className="data-section panel-directory" aria-labelledby="table-heading">
            <div className="data-heading">
              <div><p className="eyebrow">{route.id === "hackathon" ? "Day 2 · Hackathon" : "Panel discussion"}</p><h2 id="table-heading">Registered participants</h2><p>{filteredRegistrations.length} of {registrations.length} entries shown</p></div>
              <button className="reset-button" type="button" onClick={resetFilters}>Clear filters</button>
            </div>
            <div className="filters">
              <label className="search-control"><span>Search all details</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone or organisation" /></label>
              <button className="mobile-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="advanced-filters" onClick={() => setFiltersOpen((current) => !current)}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}<span aria-hidden="true">⌄</span></button>
              <div className={`advanced-filters${filtersOpen ? " is-open" : ""}`} id="advanced-filters">
                <label><span>Participant type</span><select value={participantType} onChange={(event) => setParticipantType(event.target.value)}><option value="all">All participant types</option>{participantOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>{route.id === "hackathon" ? "Challenge sector" : "Panel selection"}</span><select value={panel} onChange={(event) => setPanel(event.target.value)}><option value="all">All {route.id === "hackathon" ? "challenge sectors" : "panel selections"}</option>{focusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label><span>{route.id === "hackathon" ? "Hackathon track" : "Industry sector"}</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">All {route.id === "hackathon" ? "tracks" : "sectors"}</option>{sectorOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              </div>
            </div>
            {error ? <div className="table-state table-error" role="alert">{error}</div> : route.id === "hackathon" ? <HackathonTable registrations={filteredRegistrations} loading={loading} onOpen={setSelectedRegistration} /> : <PanelTable registrations={filteredRegistrations} loading={loading} onOpen={setSelectedRegistration} />}
          </section>
        }
      </main>

      <RegistrationDetails registration={selectedRegistration} registrationType={route.id} onClose={() => setSelectedRegistration(null)} onDelete={deleteRegistration} deleting={deletingId === selectedRegistration?.id} />
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
