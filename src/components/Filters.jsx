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
  const orderedYears = newestFirst ? [...years].reverse() : years;
  const months = selectedYear ? (monthsByYear.get(selectedYear) ?? []) : [];
  const orderedMonths = newestFirst ? [...months].reverse() : months;

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
            {orderedYears
              .filter((y) => selectedYear == null || y === selectedYear)
              .map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`chip ${selectedYear === y ? "is-active" : ""}`}
                  onClick={() => onYearChange(selectedYear === y ? null : y)}
                >
                  {y}
                </button>
              ))}
            {showFilters && selectedYear != null && orderedMonths.map((m) => (
              <button
                key={m}
                type="button"
                className={`chip ${selectedMonth === m ? "is-active" : ""}`}
                onClick={() => onMonthChange(selectedMonth === m ? null : m)}
              >
                {MONTH_SHORT[m]}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
