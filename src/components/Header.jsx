import { useState } from "react";

function SearchIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <rect x="7" y="13" width="3" height="3" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="13" width="3" height="3" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BackIcon({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function EditIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export default function Header({ view, onView, query, onQuery, filtersOpen, onToggleFilters, onBack, onHeaderAction }) {
  const [searchOpen, setSearchOpen] = useState(!!query);

  function handleToggleSearch() {
    if (searchOpen) {
      onQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  }

  if (onBack) {
    return (
      <div className="header-top">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <h1 className="app-title">Maja</h1>
        <div className="header-actions">
          {onHeaderAction && (
            <button type="button" className="icon-button" onClick={onHeaderAction} aria-label="Edit album">
              <EditIcon />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="header-top">
        {view === "timeline" ? (
          <button
            type="button"
            className={`icon-button ${filtersOpen ? "is-active" : ""}`}
            onClick={onToggleFilters}
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            aria-pressed={filtersOpen}
          >
            <CalendarIcon />
          </button>
        ) : (
          <span className="header-left-spacer" />
        )}

        <h1 className="app-title">Maja</h1>

        <div className="header-actions">
          <button
            type="button"
            className={`icon-button ${searchOpen ? "is-active" : ""}`}
            onClick={handleToggleSearch}
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-pressed={searchOpen}
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="search">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search photos, notes, albums…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            autoFocus
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onQuery("")}
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
      )}
    </>
  );
}
