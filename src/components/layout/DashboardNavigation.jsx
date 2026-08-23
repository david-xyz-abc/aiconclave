import { DASHBOARD_NAVIGATION } from "../../config/dashboard.js";

export function DashboardNavigation({
  route,
  counts,
  onNavigate,
  onDownloadPanel,
  panelDownloadDisabled,
  panelDownloading,
}) {
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
        {DASHBOARD_NAVIGATION.map((item) => {
          const showPanelDownload = item.id === "panel" && route.id === "panel";
          return (
            <div className="section-card-shell" key={item.id}>
              <a
                href={item.path}
                className={`section-card${route.id === item.id ? " is-active" : ""}${showPanelDownload ? " has-action" : ""}`}
                onClick={(event) => navigate(event, item.path)}
                aria-current={route.id === item.id ? "page" : undefined}
              >
                <span className="section-number">{item.number}</span>
                <strong>{item.label}</strong>
                <small>{itemStatus(item)}</small>
              </a>
              {showPanelDownload && (
                <button
                  className="section-card-download"
                  type="button"
                  disabled={panelDownloadDisabled}
                  onClick={onDownloadPanel}
                  title="Download every panel discussion registration as Excel"
                >
                  {panelDownloading ? "Preparing…" : "Download"}
                  <span aria-hidden="true">↓</span>
                </button>
              )}
            </div>
          );
        })}
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
