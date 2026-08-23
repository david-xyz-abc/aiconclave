import { useCallback, useEffect, useState } from "react";
import { LoginPage } from "./features/auth/LoginPage.jsx";
import { Dashboard } from "./features/dashboard/Dashboard.jsx";
import { useDashboardRoute } from "./hooks/useDashboardRoute.js";
import { authApi } from "./services/dashboardApi.js";

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const { route, navigate } = useDashboardRoute();
  const clearSession = useCallback(
    () => setSession({ loading: false, user: null }),
    [],
  );

  useEffect(() => {
    let active = true;
    authApi
      .currentUser()
      .then((data) => {
        if (active) setSession({ loading: false, user: data.user });
      })
      .catch(() => {
        if (active) clearSession();
      });
    return () => {
      active = false;
    };
  }, [clearSession]);

  if (session.loading)
    return <div className="loading-screen">Loading dashboard…</div>;
  if (!session.user)
    return (
      <LoginPage onLogin={(user) => setSession({ loading: false, user })} />
    );
  return (
    <Dashboard route={route} onNavigate={navigate} onLogout={clearSession} />
  );
}
