import { MetricCard } from "../../components/common/MetricCard.jsx";

export function OverviewPage({ summary, recent, loading, error, onNavigate }) {
  return (
    <div className="overview-page">
      <section className="metrics-grid" aria-label="Registration summary">
        <MetricCard
          label="All registrations"
          value={summary.total}
          detail="Current total"
        />
        <MetricCard
          label="Panel discussion"
          value={summary.panelTotal}
          detail="Day 1 registrations"
        />
        <MetricCard
          label="Hackathon"
          value={summary.hackathonTotal}
          detail="Day 2 registrations"
        />
      </section>
      <section className="overview-recent" aria-labelledby="recent-heading">
        <div className="data-heading">
          <div>
            <p className="eyebrow">Latest activity</p>
            <h2 id="recent-heading">Recent registrations</h2>
          </div>
        </div>
        {error ? (
          <div className="table-state table-error" role="alert">
            {error}
          </div>
        ) : loading ? (
          <div className="table-state">Loading registrations…</div>
        ) : recent.length ? (
          <ul className="recent-list">
            {recent.map((registration) => {
              const path =
                registration.registration_type === "hackathon"
                  ? "/hackathon-registrations"
                  : "/panel-registrations";
              return (
                <li
                  key={`${registration.registration_type}-${registration.id}`}
                >
                  <a
                    href={path}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(path);
                    }}
                  >
                    <span>
                      <strong>{registration.name}</strong>
                      <small>{registration.activity_label}</small>
                    </span>
                    <span>
                      {registration.registration_type}{" "}
                      <i aria-hidden="true">→</i>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="table-state">No registrations yet.</div>
        )}
      </section>
    </div>
  );
}
