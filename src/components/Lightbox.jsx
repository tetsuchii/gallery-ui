import { useEffect } from "react";
import { BookmarkIcon } from "./Albums.jsx";
import { formatDateBar } from "../data/dates.js";

export default function Lightbox({ items, index, onClose, onIndex, onSave, savedCounts }) {
  const item = items[index];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      else if (e.key === "ArrowRight") onIndex(Math.min(items.length - 1, index + 1));
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button
        type="button"
        className="lightbox-backdrop"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="lightbox-bar">
        <div className="lightbox-bar-lead">
          <span className="lightbox-bar-date">{formatDateBar(item)}</span>
          <span className="lightbox-counter">
            {index + 1} / {items.length}
          </span>
        </div>
        <div className="lightbox-bar-actions">
          {onSave && (
            <button
              type="button"
              className={`lightbox-action ${savedCounts?.get(item.id) ? "is-on" : ""}`}
              onClick={() => onSave(item)}
              aria-label="Save to album"
              title="Save to album"
            >
              <BookmarkIcon filled={!!savedCounts?.get(item.id)} />
            </button>
          )}
          <button
            type="button"
            className="lightbox-close"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
      </div>

      <div className="lightbox-stage">
        <button
          type="button"
          className="lightbox-nav lightbox-nav--prev"
          onClick={() => hasPrev && onIndex(index - 1)}
          disabled={!hasPrev}
          aria-label="Previous photo"
        >
          ‹
        </button>

        <img className="lightbox-img" src={item.src} alt="" />

        <button
          type="button"
          className="lightbox-nav lightbox-nav--next"
          onClick={() => hasNext && onIndex(index + 1)}
          disabled={!hasNext}
          aria-label="Next photo"
        >
          ›
        </button>
      </div>

      {(item.collectionName || item.note) && (
        <aside className="lightbox-meta">
          {item.collectionName && (
            <div className="lightbox-collection">{item.collectionName}</div>
          )}
          {item.note && <p className="lightbox-note">{item.note}</p>}
        </aside>
      )}
    </div>
  );
}
