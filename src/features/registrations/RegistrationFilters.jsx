export function RegistrationFilters({
  routeId,
  query,
  onQueryChange,
  filtersOpen,
  onFiltersOpenChange,
  activeFilterCount,
  participantType,
  onParticipantTypeChange,
  participantOptions,
  focus,
  onFocusChange,
  focusOptions,
  sector,
  onSectorChange,
  sectorOptions,
}) {
  const isHackathon = routeId === "hackathon";
  return (
    <div className="filters">
      <label className="search-control">
        <span>Search all details</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name, email, phone or organisation"
        />
      </label>
      <button
        className="mobile-filter-toggle"
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="advanced-filters"
        onClick={() => onFiltersOpenChange(!filtersOpen)}
      >
        Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
        <span aria-hidden="true">⌄</span>
      </button>
      <div
        className={`advanced-filters${filtersOpen ? " is-open" : ""}`}
        id="advanced-filters"
      >
        <label>
          <span>Participant type</span>
          <select
            value={participantType}
            onChange={(event) => onParticipantTypeChange(event.target.value)}
          >
            <option value="all">All participant types</option>
            {participantOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{isHackathon ? "Challenge sector" : "Panel selection"}</span>
          <select
            value={focus}
            onChange={(event) => onFocusChange(event.target.value)}
          >
            <option value="all">
              All {isHackathon ? "challenge sectors" : "panel selections"}
            </option>
            {focusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{isHackathon ? "Hackathon track" : "Industry sector"}</span>
          <select
            value={sector}
            onChange={(event) => onSectorChange(event.target.value)}
          >
            <option value="all">
              All {isHackathon ? "tracks" : "sectors"}
            </option>
            {sectorOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
