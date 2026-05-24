import { useEffect, useMemo, useState } from "react";
import { MONTH_SHORT } from "../data/library.js";

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 4 }}>
      <path d="M2 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function SheetRow({ name, meta, checked, isCollection, onClick }) {
  return (
    <button
      type="button"
      className={`sheet-row ${checked ? "is-checked" : ""}`}
      onClick={onClick}
    >
      <span className={`sheet-check ${checked ? "is-on" : ""}`} aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
      <span className="sheet-row-text">
        <span className="sheet-row-name">
          {isCollection && <FolderIcon />}{name}
        </span>
        {meta && <span className="sheet-row-meta">{meta}</span>}
      </span>
    </button>
  );
}

export default function SaveSheet({ image, albums, collectionAlbums, onClose, onToggle, onToggleCollection, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = onCreate(name, note);
    onToggle(id, image.id);
    setName("");
    setNote("");
    setCreating(false);
  }

  // Collection albums this photo belongs to (usually 0 or 1)
  const currentCollAlbums = useMemo(
    () => (collectionAlbums ?? []).filter((a) => a.imageIds.includes(image.id)),
    [collectionAlbums, image.id]
  );

  // User albums split by membership
  const userAlbumsIn = useMemo(
    () => albums.filter((a) => a.imageIds.includes(image.id)),
    [albums, image.id]
  );
  const userAlbumsOut = useMemo(
    () => albums.filter((a) => !a.imageIds.includes(image.id)),
    [albums, image.id]
  );

  const hasAnyCurrentAlbum = currentCollAlbums.length > 0 || userAlbumsIn.length > 0;
  const hasAlbumsToAdd = userAlbumsOut.length > 0;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Albums">
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="sheet-card">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-head">
          <h3>Albums</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            Done
          </button>
        </header>

        {/* Currently in */}
        {hasAnyCurrentAlbum && (
          <>
            <p className="sheet-section-label">Saved in</p>
            <ul className="sheet-list">
              {currentCollAlbums.map((a) => {
                const monthLabel = image.month ? `${MONTH_SHORT[image.month]} ${image.year}` : null;
                return (
                  <li key={a.id}>
                    <SheetRow
                      name={a.name}
                      meta={monthLabel ?? undefined}
                      checked
                      isCollection
                      onClick={() => onToggleCollection(a.id, image.id)}
                    />
                  </li>
                );
              })}
              {userAlbumsIn.map((a) => (
                <li key={a.id}>
                  <SheetRow
                    name={a.name}
                    meta={`${a.imageIds.length} ${a.imageIds.length === 1 ? "photo" : "photos"}`}
                    checked
                    onClick={() => onToggle(a.id, image.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Add to more albums */}
        {!creating && (
          <>
            {hasAlbumsToAdd && (
              <>
                {hasAnyCurrentAlbum && <p className="sheet-section-label">Add to album</p>}
                <ul className="sheet-list">
                  {userAlbumsOut.map((a) => (
                    <li key={a.id}>
                      <SheetRow
                        name={a.name}
                        meta={`${a.imageIds.length} ${a.imageIds.length === 1 ? "photo" : "photos"}`}
                        checked={false}
                        onClick={() => onToggle(a.id, image.id)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}

            {!hasAnyCurrentAlbum && !hasAlbumsToAdd && (
              <p className="sheet-empty">No albums yet — create your first one.</p>
            )}

            <button type="button" className="sheet-cta" onClick={() => setCreating(true)}>
              + New album
            </button>
          </>
        )}

        {creating && (
          <form className="sheet-form" onSubmit={handleCreate}>
            <label className="sheet-field">
              <span>Album name</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Favorites"
                maxLength={80}
              />
            </label>
            <label className="sheet-field">
              <span>Note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A line of context for this album"
                rows={2}
                maxLength={400}
              />
            </label>
            <div className="sheet-form-actions">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-solid" disabled={!name.trim()}>
                Create &amp; add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
