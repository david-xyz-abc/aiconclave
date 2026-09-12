import { DASHBOARD_NAVIGATION } from "../../config/dashboard.js";

export function DashboardNavigation({ route, onNavigate }) {
  return (
    <nav className="admin-tabs" aria-label="Registration sections">
      {DASHBOARD_NAVIGATION.map((item) => (
        <a key={item.id} href={item.path}
          aria-current={route.id === item.id ? "page" : undefined}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onNavigate(item.path);
          }}>
          {item.id === "panel" ? "Panel discussion" : item.label}
        </a>
      ))}
    </nav>
  );
}
