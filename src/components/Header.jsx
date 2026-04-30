import { useState } from "react";

function SearchIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({ view, onView, query, onQuery }) {
  const [searchOpen, setSearchOpen] = useState(!!query);

  function handleToggleSearch() {
    if (searchOpen) {
      onQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  }

  return (
    <>
      <div className="header-top">
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
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === "timeline"}
              className={`tab ${view === "timeline" ? "is-active" : ""}`}
              onClick={() => onView("timeline")}
            >
              Photos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "albums"}
              className={`tab ${view === "albums" ? "is-active" : ""}`}
              onClick={() => onView("albums")}
            >
              Albums
            </button>
          </div>
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
