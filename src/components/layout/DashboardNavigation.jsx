import { DASHBOARD_NAVIGATION } from "../../config/dashboard.js";

export function DashboardNavigation({ route, counts, onNavigate }) {
  const itemStatus = (item) =>
    counts[item.id] === undefined
      ? item.status
      : `${counts[item.id]} registrations`;
  const navigate = (event, path) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    onNavigate(path);
  };
  return (
    <>
      <nav className="section-switcher" aria-label="Dashboard pages">
        {DASHBOARD_NAVIGATION.map((item) => (
          <a
            key={item.id}
            href={item.path}
            className={`section-card${route.id === item.id ? " is-active" : ""}`}
            onClick={(event) => navigate(event, item.path)}
            aria-current={route.id === item.id ? "page" : undefined}
          >
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
          <select
            value={route.path}
            onChange={(event) => onNavigate(event.target.value)}
            aria-label="Choose dashboard page"
          >
            {DASHBOARD_NAVIGATION.map((item) => (
              <option value={item.path} key={item.id}>
                {item.label} — {itemStatus(item)}
              </option>
            ))}
          </select>
          <i aria-hidden="true"></i>
        </div>
      </label>
    </>
  );
}
