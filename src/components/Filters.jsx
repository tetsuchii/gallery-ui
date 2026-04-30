import { MONTH_SHORT } from "../data/library.js";

export default function Filters({
  years,
  monthsByYear,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  newestFirst,
  onToggleSort,
  showFilters = true,
}) {
  const months = selectedYear ? monthsByYear.get(selectedYear) ?? [] : [];

  return (
    <div className="filters">
      <div className="chip-row">
        <button
          type="button"
          className="chip chip--sort"
          onClick={onToggleSort}
          aria-pressed={!newestFirst}
          title={newestFirst ? "Newest first — tap for oldest first" : "Oldest first — tap for newest first"}
          aria-label={newestFirst ? "Switch to oldest first" : "Switch to newest first"}
        >
          <span className="sort-arrow" aria-hidden="true">{newestFirst ? "↓" : "↑"}</span>
        </button>
        {showFilters && (
          <>
            <button
              type="button"
              className={`chip ${selectedYear == null ? "is-active" : ""}`}
              onClick={() => onYearChange(null)}
            >
              All
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`chip ${selectedYear === y ? "is-active" : ""}`}
                onClick={() => onYearChange(y)}
              >
                {y}
              </button>
            ))}
          </>
        )}
      </div>

      {showFilters && selectedYear != null && (
        <div
          className="chip-row chip-row--months"
          role="tablist"
          aria-label="Filter by month"
        >
          <button
            type="button"
            className={`chip chip--soft ${selectedMonth == null ? "is-active" : ""}`}
            onClick={() => onMonthChange(null)}
          >
            All
          </button>
          {months.map((m) => (
            <button
              key={m}
              type="button"
              className={`chip chip--soft ${selectedMonth === m ? "is-active" : ""}`}
              onClick={() => onMonthChange(m)}
            >
              {MONTH_SHORT[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
