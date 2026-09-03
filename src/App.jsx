import { useCallback, useEffect, useState } from "react";
import { LoginPage } from "./features/auth/LoginPage.jsx";
import { Dashboard } from "./features/dashboard/Dashboard.jsx";
import { LandingPage } from "./features/landing/LandingPage.jsx";
import { AttendanceApp } from "./features/attendance/AttendanceApp.jsx";
import { useDashboardRoute } from "./hooks/useDashboardRoute.js";
import { authApi } from "./services/dashboardApi.js";

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const [session, setSession] = useState({ loading: true, user: null });
  const { route, navigate } = useDashboardRoute();
  const clearSession = useCallback(
    () => setSession({ loading: false, user: null }),
    [],
  );

  useEffect(() => {
    if (pathname === "/" || pathname === "/attendance" || pathname.startsWith("/attendance/")) {
      setSession({ loading: false, user: null });
      return undefined;
    }
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
  }, [clearSession, pathname]);

  if (pathname === "/") return <LandingPage />;
  if (pathname === "/attendance" || pathname.startsWith("/attendance/")) return <AttendanceApp />;

  if (session.loading)
    return <div className="loading-screen">Loading dashboard…</div>;
  if (!session.user)
    return (
      <LoginPage
        onLogin={(user) => {
          window.history.replaceState({}, "", "/dashboard");
          setSession({ loading: false, user });
        }}
      />
    );
  return (
    <Dashboard user={session.user} route={route} onNavigate={navigate} onLogout={clearSession} />
  );
}
