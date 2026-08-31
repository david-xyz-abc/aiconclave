import { useCallback, useEffect, useState } from "react";
import { BrandLockup } from "../../components/common/BrandLockup.jsx";
import { DashboardNavigation } from "../../components/layout/DashboardNavigation.jsx";
import { DIRECTORY_ROUTES } from "../../config/dashboard.js";
import { useDashboardData } from "../../hooks/useDashboardData.js";
import { authApi, isUnauthorized } from "../../services/dashboardApi.js";
import {
  downloadHackathonParticipantsWorkbook,
  downloadRegistrationsWorkbook,
} from "../../services/registrationExport.js";
import { OverviewPage } from "../overview/OverviewPage.jsx";
import { EmptyRegistrationSection } from "../registrations/EmptyRegistrationSection.jsx";
import { RegistrationDetails } from "../registrations/RegistrationDetails.jsx";
import { RegistrationDirectory } from "../registrations/RegistrationDirectory.jsx";

export function Dashboard({ user, route, onNavigate, onLogout }) {
  // Accounts created before role-based access was introduced were all dashboard
  // administrators. Preserve their existing permissions until the migration
  // supplies the explicit `admin` role.
  const userRole = user?.role || "admin";
  const {
    registrations,
    summary,
    recent,
    loading,
    error,
    setError,
    removeRegistration,
    updateRegistration,
  } = useDashboardData(route.id, onLogout);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    setSelectedRegistration(null);
    setExportError("");
  }, [route.id]);
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
  async function saveRegistration(registration, payload) {
    setError("");
    setSavingId(registration.id);
    try {
      const updated = await updateRegistration(route.id, registration, payload);
      setSelectedRegistration(updated);
      return updated;
    } catch (saveError) {
      if (isUnauthorized(saveError)) onLogout();
      throw saveError;
    } finally {
      setSavingId(null);
    }
  }
  async function logout() {
    await authApi.logout().catch(() => {});
    onLogout();
  }
  async function downloadExcel(type = "workbook") {
    setExporting(type);
    setExportError("");
    try {
      if (type === "students")
        await downloadHackathonParticipantsWorkbook(registrations);
      else await downloadRegistrationsWorkbook(route.id, registrations);
    } catch (downloadError) {
      setExportError(
        downloadError instanceof Error
          ? downloadError.message
          : "The Excel file could not be created.",
      );
    } finally {
      setExporting("");
    }
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
          onDownloadPanel={() => downloadExcel("workbook")}
          panelDownloadDisabled={
            route.id !== "panel" || loading || Boolean(exporting) || !registrations.length
          }
          panelDownloading={route.id === "panel" && exporting === "workbook"}
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
            exporting={exporting}
            exportError={exportError}
            onDownloadExcel={downloadExcel}
          />
        ) : (
          <EmptyRegistrationSection section={route} />
        )}
      </main>
      <RegistrationDetails
        registration={selectedRegistration}
        registrationType={route.id}
        canEdit={new Set(["editor", "admin"]).has(userRole)}
        canDelete={userRole === "admin"}
        onClose={closeDetails}
        onUpdate={saveRegistration}
        onDelete={deleteRegistration}
        saving={savingId === selectedRegistration?.id}
        deleting={deletingId === selectedRegistration?.id}
      />
    </div>
  );
}
