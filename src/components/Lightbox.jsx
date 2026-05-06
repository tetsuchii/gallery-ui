import { useEffect, useRef, useState } from "react";
import { BookmarkIcon } from "./Albums.jsx";
import { formatDateBar } from "../data/dates.js";

const SWIPE_THRESHOLD = 60;
const CLOSE_THRESHOLD = 120;

function NoteEditor({ item, noteOverrides, setNote, clearNote }) {
  const hasOverride = noteOverrides.has(item.id);
  // Original = file-based note (may be null). Current = what's actually shown.
  const original = item.note;                              // file-based
  const current = hasOverride ? noteOverrides.get(item.id) : original;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Reset editing state when the viewed photo changes.
  useEffect(() => {
    setEditing(false);
  }, [item.id]);

  function startEdit() {
    setDraft(current ?? "");
    setEditing(true);
  }

  function save() {
    setNote(item.id, draft);
    setEditing(false);
  }

  function deleteNote() {
    setNote(item.id, "");
    setEditing(false);
  }

  function restoreOriginal() {
    clearNote(item.id);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="note-edit">
        <textarea
          autoFocus
          className="note-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Add a note…"
        />
        <div className="note-edit-actions">
          <button type="button" className="note-btn note-btn--danger" onClick={deleteNote}>
            Delete
          </button>
          {hasOverride && original && (
            <button type="button" className="note-btn" onClick={restoreOriginal}>
              Restore original
            </button>
          )}
          <button type="button" className="note-btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="button" className="note-btn note-btn--save" onClick={save}>
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-display">
      {current && <p className="lightbox-note">{current}</p>}
      <button type="button" className="note-edit-btn" onClick={startEdit}>
        {current ? "Edit note" : "Add note"}
      </button>
      {hasOverride && <span className="note-edited-badge">edited</span>}
    </div>
  );
}

export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
  onSave,
  savedCounts,
  noteOverrides,
  setNote,
  clearNote,
}) {
  const item = items[index];
  const wrapRef = useRef(null);
  const touch = useRef(null);

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

  function setStageTransform(dx, dy, withTransition) {
    const el = wrapRef.current;
    if (!el) return;
    el.style.transition = withTransition ? "transform 0.22s ease" : "none";
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  function resetStage() {
    setStageTransform(0, 0, true);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, dx: 0, dy: 0 };
    setStageTransform(0, 0, false);
  }

  function onTouchMove(e) {
    if (!touch.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current.dx = dx;
    touch.current.dy = dy;
    const ty = dy > 0 ? dy * 0.6 : 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      setStageTransform(dx, 0, false);
    } else {
      setStageTransform(0, ty, false);
    }
  }

  function onTouchEnd() {
    if (!touch.current) return;
    const { dx, dy } = touch.current;
    touch.current = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > SWIPE_THRESHOLD && hasPrev) { onIndex(index - 1); resetStage(); return; }
      if (dx < -SWIPE_THRESHOLD && hasNext) { onIndex(index + 1); resetStage(); return; }
    } else if (dy > CLOSE_THRESHOLD) {
      onClose();
      return;
    }
    resetStage();
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button type="button" className="lightbox-backdrop" onClick={onClose} aria-label="Close" />

      <div className="lightbox-bar">
        <div className="lightbox-bar-lead">
          <span className="lightbox-bar-date">{formatDateBar(item)}</span>
          <span className="lightbox-counter">{index + 1} / {items.length}</span>
        </div>
        <div className="lightbox-bar-actions">
          {onSave && (
            <button
              type="button"
              className={`lightbox-action ${savedCounts?.get(item.id) ? "is-on" : ""}`}
              onClick={() => onSave(item)}
              aria-label="Save to album"
            >
              <BookmarkIcon filled={!!savedCounts?.get(item.id)} />
            </button>
          )}
          <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
      </div>

      <div
        className="lightbox-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <button
          type="button"
          className="lightbox-nav lightbox-nav--prev"
          onClick={() => hasPrev && onIndex(index - 1)}
          disabled={!hasPrev}
          aria-label="Previous photo"
        >
          ‹
        </button>

        <div className="lightbox-img-wrap" ref={wrapRef}>
          <img className="lightbox-img" src={item.src} alt="" />
        </div>

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

      <aside className="lightbox-meta">
        {item.collectionName && (
          <div className="lightbox-collection">{item.collectionName}</div>
        )}
        {item.collectionNote && (
          <p className="lightbox-note lightbox-note--collection">{item.collectionNote}</p>
        )}
        {noteOverrides ? (
          <NoteEditor
            item={item}
            noteOverrides={noteOverrides}
            setNote={setNote}
            clearNote={clearNote}
          />
        ) : (
          item.note && <p className="lightbox-note">{item.note}</p>
        )}
      </aside>
    </div>
  );
}
