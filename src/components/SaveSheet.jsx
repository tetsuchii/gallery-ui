import { useEffect, useState } from "react";

export default function SaveSheet({ image, albums, onClose, onToggle, onCreate }) {
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

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Save to album">
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="sheet-card">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-head">
          <h3>Save to album</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            Done
          </button>
        </header>

        {albums.length === 0 && !creating && (
          <p className="sheet-empty">No albums yet — create your first one.</p>
        )}

        {!creating && albums.length > 0 && (
          <ul className="sheet-list">
            {albums.map((a) => {
              const checked = a.imageIds.includes(image.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`sheet-row ${checked ? "is-checked" : ""}`}
                    onClick={() => onToggle(a.id, image.id)}
                  >
                    <span
                      className={`sheet-check ${checked ? "is-on" : ""}`}
                      aria-hidden="true"
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="sheet-row-text">
                      <span className="sheet-row-name">{a.name}</span>
                      <span className="sheet-row-meta">
                        {a.imageIds.length} {a.imageIds.length === 1 ? "photo" : "photos"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!creating ? (
          <button type="button" className="sheet-cta" onClick={() => setCreating(true)}>
            + New album
          </button>
        ) : (
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
