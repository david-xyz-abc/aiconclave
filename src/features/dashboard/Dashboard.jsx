import { useCallback, useEffect, useRef, useState } from "react";
import { AdminReport } from "./AdminReport.jsx";
import { OperationsHeader } from "../../components/layout/OperationsHeader.jsx";
import { DashboardNavigation } from "../../components/layout/DashboardNavigation.jsx";
import { DIRECTORY_ROUTES } from "../../config/dashboard.js";
import { clearAdminCache, useDashboardData } from "../../hooks/useDashboardData.js";
import { authApi, registrationsApi, isUnauthorized } from "../../services/dashboardApi.js";
import {
  downloadHackathonParticipantsWorkbook,
  downloadRegistrationsWorkbook,
} from "../../services/registrationExport.js";
import { OverviewPage } from "../overview/OverviewPage.jsx";
import { EmptyRegistrationSection } from "../registrations/EmptyRegistrationSection.jsx";
import { RegistrationDetails } from "../registrations/RegistrationDetails.jsx";
import { RegistrationDirectory } from "../registrations/RegistrationDirectory.jsx";

export function Dashboard({ user, route, onNavigate, onLogout }) {
  const canManageRegistrations = user?.registrationsAccess === "write";
  const {
    registrations,
    rows,
    refresh,
    coolingDown,
    syncedAt,
    summary,
    overviewStale,
    recent,
    loading,
    error,
    setError,
    removeRegistration,
    updateRegistration,
  } = useDashboardData(route.id, onLogout, user?.username);
  const detailVersion = useRef(0);
  const detailPending = useRef(false);
  const [opening, setOpening] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    detailVersion.current += 1;
    detailPending.current = false;
    setOpening(false);
    setSelectedRegistration(null);
    setExportError("");
    return () => { detailVersion.current += 1; };
  }, [route.id]);
  const closeDetails = useCallback(() => setSelectedRegistration(null), []);
  async function openRegistration(registration) {
    if (detailPending.current) return;
    detailPending.current = true;
    const version = ++detailVersion.current;
    setOpening(true);
    setError('');
    try {
      const data = await registrationsApi.detail(route.id, registration.id, registration.record_type);
      if (version === detailVersion.current) setSelectedRegistration(data.registration);
    } catch (error) {
      if (version !== detailVersion.current) return;
      if (isUnauthorized(error)) { clearAdminCache(); onLogout(); }
      else setError(error.message);
    } finally {
      if (version === detailVersion.current) { detailPending.current = false; setOpening(false); }
    }
  }
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
    clearAdminCache();
    onLogout();
  }
  async function downloadExcel(type = "workbook") {
    if (exporting) return;
    setExporting(type);
    setExportError("");
    try {
      const { registrations: complete } = await registrationsApi.export(route.id);
      if (type === "students")
        await downloadHackathonParticipantsWorkbook(complete);
      else await downloadRegistrationsWorkbook(route.id, complete);
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
      <OperationsHeader active="admin" onLogout={logout}>
        <a href="/dashboard" aria-current="page">Admin</a>
      </OperationsHeader>
      <main className="dashboard-main">
        <header className="dashboard-intro">
          <h1>
            {route.id === "overview" ? "Registration overview" : route.label}
          </h1>
        </header>
        <div className="admin-toolbar">
          <DashboardNavigation route={route} onNavigate={onNavigate} />
          {(route.id === 'overview' || DIRECTORY_ROUTES.has(route.id) || ['checked-in','judges-allocation'].includes(route.id)) && (
            <button className="admin-refresh-button" type="button" onClick={refresh} disabled={loading || coolingDown || opening || Boolean(savingId)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11a9 9 0 0 1 15.5-6.3L21 7" /><path d="M21 3v4h-4" /><path d="M21 13a9 9 0 0 1-15.5 6.3L3 17" /><path d="M7 17H3v4" /></svg>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
        {opening && <p role="status">Loading details…</p>}
        {route.id === "overview" && overviewStale && <p role="status">Registrations changed. Refresh to update this overview.</p>}
        {["checked-in", "judges-allocation"].includes(route.id) ? (
          <AdminReport key={route.id} type={route.id} rows={rows} loading={loading} error={error} syncedAt={syncedAt} />
        ) : route.id === "overview" ? (
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
            onOpen={openRegistration}
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
        canEdit={canManageRegistrations}
        canDelete={canManageRegistrations}
        onClose={closeDetails}
        onUpdate={saveRegistration}
        onDelete={deleteRegistration}
        saving={savingId === selectedRegistration?.id}
        deleting={deletingId === selectedRegistration?.id}
      />
    </div>
  );
}
