import { useEffect, useRef, useState } from "react";
import {
  formatDateLong,
  chronologicalBlocks,
  groupByDate,
} from "../data/dates.js";

// ── Photo ─────────────────────────────────────────────────────────────────────
// Native loading="lazy" lets the browser defer JPEG downloads without any JS.
// decoding="async" keeps image decoding off the main thread.

function Photo({ item, onOpen, compact, dateInHeader }) {
  const showCaption = !compact && (!dateInHeader || item.note);

  return (
    <figure className="photo">
      <div className="photo-frame">
        <button
          type="button"
          className="photo-button"
          onClick={() => onOpen(item)}
          aria-label={`Open photo from ${formatDateLong(item)}`}
        >
          <img src={item.src} alt="" loading="lazy" decoding="async" />
        </button>
      </div>

      {showCaption && (
        <figcaption className="photo-note">
          {!dateInHeader && (
            <span className="photo-date">{formatDateLong(item)}</span>
          )}
          {item.note && <span className="photo-note-text">{item.note}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function DayHeader() {
  return <div />;
}

// ── Collection ────────────────────────────────────────────────────────────────

function Collection({ collection, monthLabel, onOpen, savedCounts, onOpenAlbum }) {
  const hasItems = collection.items.length > 0;
  const groups = groupByDate(collection.items);
  const albumId = `col::${collection.key}`;

  return (
    <section className="collection" aria-label={collection.name}>
      <header
        className={`collection-head${onOpenAlbum ? " collection-head--link" : ""}`}
        onClick={onOpenAlbum ? () => onOpenAlbum(albumId) : undefined}
      >
        <h3 className="collection-title">{collection.name}</h3>
        <span className="collection-meta">
          {hasItems
            ? `${collection.items.length} ${collection.items.length === 1 ? "photo" : "photos"}`
            : "Note"}
          {" · "}
          {monthLabel}
        </span>
        {collection.note && <p className="collection-note">{collection.note}</p>}
      </header>

      {hasItems && groups.map((g) => {
        const groupHeaderShown = g.items.length > 1 && g.day != null;
        return (
          <div key={g.key} className="collection-day">
            {groupHeaderShown && <DayHeader group={g} compact />}
            <div className="collection-grid">
              {g.items.map((item) => (
                <Photo
                  key={item.id}
                  item={item}
                  onOpen={onOpen}
                  savedCount={savedCounts.get(item.id) || 0}
                  compact
                  dateInHeader={groupHeaderShown}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function LooseGroup({ group, onOpen, savedCounts }) {
  const groupHeaderShown = group.items.length > 1 && group.day != null;
  if (!groupHeaderShown) {
    const item = group.items[0];
    return (
      <Photo
        item={item}
        onOpen={onOpen}
        savedCount={savedCounts.get(item.id) || 0}
      />
    );
  }
  return (
    <div className="date-group">
      <DayHeader group={group} />
      {group.items.map((item) => (
        <Photo
          key={item.id}
          item={item}
          onOpen={onOpen}
          savedCount={savedCounts.get(item.id) || 0}
          dateInHeader
        />
      ))}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
// Renders months progressively: starts with INITIAL_MONTHS visible and appends
// CHUNK_SIZE more each time the sentinel scrolls into view. This keeps the
// initial DOM small regardless of archive size.

const INITIAL_MONTHS = 4;
const CHUNK_SIZE = 3;

export default function Timeline({ months, onOpen, onSave, savedCounts, newestFirst, onOpenAlbum }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_MONTHS);
  const [seenLength, setSeenLength] = useState(months.length);
  const sentinelRef = useRef(null);

  // Reset when the month list changes (filter/search applied)
  if (seenLength !== months.length) {
    setSeenLength(months.length);
    setVisibleCount(INITIAL_MONTHS);
  }

  // Sentinel observer — load next chunk when bottom approaches viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= months.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((n) => Math.min(n + CHUNK_SIZE, months.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, months.length]);

  if (!months.length) {
    return (
      <div className="empty-state">
        <p>Nothing here for that filter.</p>
      </div>
    );
  }

  const visible = months.slice(0, visibleCount);

  return (
    <div className="timeline">
      {visible.map((m) => {
        const blocks = chronologicalBlocks(m, { newestFirst });
        return (
          <section key={m.key} className="month" id={`month-${m.key}`}>
            <header className="month-head">
              <h2 className="month-title">{m.label}</h2>
              <span className="month-rule" aria-hidden="true" />
            </header>

            <div className="month-stream">
              {blocks.map((b) =>
                b.kind === "collection" ? (
                  <Collection
                    key={b.collection.key}
                    collection={b.collection}
                    monthLabel={m.label}
                    onOpen={onOpen}
                    onSave={onSave}
                    savedCounts={savedCounts}
                    onOpenAlbum={onOpenAlbum}
                  />
                ) : (
                  <LooseGroup
                    key={b.group.key}
                    group={b.group}
                    onOpen={onOpen}
                    onSave={onSave}
                    savedCounts={savedCounts}
                  />
                )
              )}
            </div>
          </section>
        );
      })}

      {/* Sentinel: triggers loading the next chunk of months */}
      {visibleCount < months.length && (
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      )}
    </div>
  );
}

export { DayHeader, Photo };
