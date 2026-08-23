import { useEffect, useMemo, useState } from "react";
import {
  downloadHackathonParticipantsWorkbook,
  downloadRegistrationsWorkbook,
} from "../../services/registrationExport.js";
import {
  parseTracks,
  searchableRegistrationText,
} from "../../utils/registration.js";
import { RegistrationFilters } from "./RegistrationFilters.jsx";
import { HackathonMetrics } from "./HackathonMetrics.jsx";
import { HackathonTable, PanelTable } from "./RegistrationTables.jsx";

export function RegistrationDirectory({
  route,
  registrations,
  loading,
  error,
  onOpen,
}) {
  const [query, setQuery] = useState("");
  const [participantType, setParticipantType] = useState("all");
  const [focus, setFocus] = useState("all");
  const [sector, setSector] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    setQuery("");
    setParticipantType("all");
    setFocus("all");
    setSector("all");
    setFiltersOpen(false);
    setExportError("");
  }, [route.id]);
  const participantOptions = useMemo(
    () =>
      [
        ...new Set(
          registrations
            .map((item) =>
              route.id === "hackathon"
                ? item.participant_category || item.participant_type
                : item.participant_type,
            )
            .filter(Boolean),
        ),
      ].sort(),
    [registrations],
  );
  const focusOptions = useMemo(
    () =>
      [
        ...new Set(
          registrations
            .map((item) =>
              route.id === "hackathon"
                ? item.sector_track || item.challenge_area
                : item.panel_selection,
            )
            .filter(Boolean),
        ),
      ].sort(),
    [registrations, route.id],
  );
  const sectorOptions = useMemo(
    () =>
      [
        ...new Set(
          registrations
            .flatMap((item) =>
              route.id === "hackathon"
                ? [item.solution_type, ...parseTracks(item.tracks)]
                : [item.industry_sector],
            )
            .filter(Boolean),
        ),
      ].sort(),
    [registrations, route.id],
  );
  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return registrations.filter((registration) => {
      if (
        participantType !== "all" &&
        (route.id === "hackathon"
          ? registration.participant_category || registration.participant_type
          : registration.participant_type) !== participantType
      )
        return false;
      if (
        focus !== "all" &&
        (route.id === "hackathon"
          ? registration.sector_track || registration.challenge_area
          : registration.panel_selection) !== focus
      )
        return false;
      if (
        sector !== "all" &&
        (route.id === "hackathon"
          ? ![
              registration.solution_type,
              ...parseTracks(registration.tracks),
            ].includes(sector)
          : registration.industry_sector !== sector)
      )
        return false;
      return (
        !normalizedQuery ||
        searchableRegistrationText(registration).includes(normalizedQuery)
      );
    });
  }, [focus, participantType, query, registrations, route.id, sector]);
  const activeFilterCount = [
    participantType !== "all",
    focus !== "all",
    sector !== "all",
  ].filter(Boolean).length;
  const resetFilters = () => {
    setQuery("");
    setParticipantType("all");
    setFocus("all");
    setSector("all");
    setFiltersOpen(false);
  };
  const downloadExcel = async (type = "workbook") => {
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
  };
  const Table = route.id === "hackathon" ? HackathonTable : PanelTable;
  return (
    <section
      className="data-section panel-directory"
      aria-labelledby="table-heading"
    >
      {route.id === "hackathon" && (
        <HackathonMetrics
          registrations={registrations}
          downloadingStudents={exporting === "students"}
          downloadDisabled={loading || Boolean(exporting)}
          onDownloadStudents={() => downloadExcel("students")}
        />
      )}
      <div className="data-heading">
        <div>
          <p className="eyebrow">
            {route.id === "hackathon"
              ? "Day 2 · Hackathon"
              : "Panel discussion"}
          </p>
          <h2 id="table-heading">
            {route.id === "hackathon"
              ? "Registered teams"
              : "Registered participants"}
          </h2>
          <p>
            {filteredRegistrations.length} of {registrations.length} entries
            shown
          </p>
        </div>
        <div className="directory-actions">
          <button
            className="export-button"
            type="button"
            disabled={loading || exporting || !registrations.length}
            onClick={() => downloadExcel("workbook")}
            title={`Download all ${registrations.length} ${
              route.id === "hackathon" ? "teams" : "registrations"
            } as an Excel workbook`}
          >
            {exporting === "workbook" ? "Preparing Excel…" : "Download Excel"}
            <span aria-hidden="true">↓</span>
          </button>
          <button className="reset-button" type="button" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      </div>
      {exportError && (
        <p className="export-error" role="alert">
          {exportError}
        </p>
      )}
      <RegistrationFilters
        routeId={route.id}
        query={query}
        onQueryChange={setQuery}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
        participantType={participantType}
        onParticipantTypeChange={setParticipantType}
        participantOptions={participantOptions}
        focus={focus}
        onFocusChange={setFocus}
        focusOptions={focusOptions}
        sector={sector}
        onSectorChange={setSector}
        sectorOptions={sectorOptions}
      />
      {error ? (
        <div className="table-state table-error" role="alert">
          {error}
        </div>
      ) : (
        <Table
          registrations={filteredRegistrations}
          loading={loading}
          onOpen={onOpen}
        />
      )}
    </section>
  );
}
