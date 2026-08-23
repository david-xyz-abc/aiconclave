import { useCallback, useEffect, useState } from "react";
import { BrandLockup } from "../../components/common/BrandLockup.jsx";
import { DashboardNavigation } from "../../components/layout/DashboardNavigation.jsx";
import { DIRECTORY_ROUTES } from "../../config/dashboard.js";
import { useDashboardData } from "../../hooks/useDashboardData.js";
import { authApi, isUnauthorized } from "../../services/dashboardApi.js";
import { OverviewPage } from "../overview/OverviewPage.jsx";
import { EmptyRegistrationSection } from "../registrations/EmptyRegistrationSection.jsx";
import { RegistrationDetails } from "../registrations/RegistrationDetails.jsx";
import { RegistrationDirectory } from "../registrations/RegistrationDirectory.jsx";

export function Dashboard({ route, onNavigate, onLogout }) {
  const {
    registrations,
    summary,
    recent,
    loading,
    error,
    setError,
    removeRegistration,
  } = useDashboardData(route.id, onLogout);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  useEffect(() => setSelectedRegistration(null), [route.id]);
  const closeDetails = useCallback(() => setSelectedRegistration(null), []);
  async function deleteRegistration(registration) {
    const registrationName = registration.team_name || registration.name;
    if (
      !window.confirm(
        `Delete the ${route.id} registration for ${registrationName}? This cannot be undone.`,
      )
    )
      return;
    setError("");
    setDeletingId(registration.id);
    try {
      await removeRegistration(route.id, registration);
      closeDetails();
    } catch (deleteError) {
      if (isUnauthorized(deleteError)) onLogout();
      else setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }
  async function logout() {
    await authApi.logout().catch(() => {});
    onLogout();
  }
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <BrandLockup />
        <div className="topbar-meta">
          <button className="button button-quiet" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="dashboard-main">
        <header className="dashboard-intro">
          <h1>
            {route.id === "overview" ? "Registration overview" : route.label}
          </h1>
        </header>
        <DashboardNavigation
          route={route}
          counts={{
            panel:
              route.id === "panel" ? registrations.length : summary.panelTotal,
            hackathon:
              route.id === "hackathon"
                ? registrations.length
                : summary.hackathonTotal,
          }}
          onNavigate={onNavigate}
        />
        {route.id === "overview" ? (
          <OverviewPage
            summary={summary}
            recent={recent}
            loading={loading}
            error={error}
            onNavigate={onNavigate}
          />
        ) : DIRECTORY_ROUTES.has(route.id) ? (
          <RegistrationDirectory
            route={route}
            registrations={registrations}
            loading={loading}
            error={error}
            onOpen={setSelectedRegistration}
          />
        ) : (
          <EmptyRegistrationSection section={route} />
        )}
      </main>
      <RegistrationDetails
        registration={selectedRegistration}
        registrationType={route.id}
        onClose={closeDetails}
        onDelete={deleteRegistration}
        deleting={deletingId === selectedRegistration?.id}
      />
    </div>
  );
}
