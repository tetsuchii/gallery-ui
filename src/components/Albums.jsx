import { useMemo, useState } from "react";
import { filterItems } from "../data/search.js";
import {
  formatDateLong,
  formatGroupLong,
  groupByDate,
} from "../data/dates.js";

function BookmarkIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.5.5 0 0 1-.78.42L12 17.1l-5.72 3.52a.5.5 0 0 1-.78-.42V4a.5.5 0 0 1 .5-.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlbumCard({ album, byId, onOpen }) {
  const cover = album.imageIds.map((id) => byId.get(id)).find(Boolean);
  const isCollection = album.source === "collection";
  return (
    <button type="button" className="album-card" onClick={() => onOpen(album.id)}>
      <span className="album-cover">
        {cover ? (
          <img src={cover.src} alt="" loading="lazy" />
        ) : (
          <span className="album-cover-empty">Empty</span>
        )}
      </span>
      <span className="album-card-body">
        <span className="album-card-name">{album.name}</span>
        <span className="album-card-meta">
          {album.imageIds.length} {album.imageIds.length === 1 ? "photo" : "photos"}
          {isCollection && album.monthLabel ? ` · ${album.monthLabel}` : ""}
        </span>
        {album.note && <span className="album-card-note">{album.note}</span>}
      </span>
    </button>
  );
}

function GroupedPhoto({ item, dateInHeader, onOpen, onSave, savedCount }) {
  const onAny = !!savedCount;
  return (
    <figure className="photo">
      <div className="photo-frame">
        <button
          type="button"
          className="photo-button"
          onClick={() => onOpen(item)}
          aria-label={`Open photo from ${formatDateLong(item)}`}
        >
          <img src={item.src} alt="" loading="lazy" />
        </button>
        <button
          type="button"
          className={`photo-bookmark ${onAny ? "is-on" : ""}`}
          onClick={(e) => { e.stopPropagation(); onSave(item); }}
          aria-label="Manage albums"
          title="Manage albums"
        >
          <BookmarkIcon filled={onAny} />
        </button>
      </div>
      {(item.note || !dateInHeader) && (
        <figcaption className="photo-note">
          {!dateInHeader && <span className="photo-date">{formatDateLong(item)}</span>}
          {item.note && <span className="photo-note-text">{item.note}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function AlbumDetail({ album, byId, query, savedCounts, newestFirst, onBack, onOpenPhoto, onSave, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(album.name);
  const [note, setNote] = useState(album.note);

  const items = useMemo(() => {
    const list = album.imageIds.map((id) => byId.get(id)).filter(Boolean);
    const cmp = newestFirst
      ? (a, b) =>
          (b.year - a.year) ||
          (b.month - a.month) ||
          ((b.day ?? -1) - (a.day ?? -1)) ||
          a.filename.localeCompare(b.filename)
      : (a, b) =>
          (a.year - b.year) ||
          (a.month - b.month) ||
          ((a.day ?? 99) - (b.day ?? 99)) ||
          a.filename.localeCompare(b.filename);
    list.sort(cmp);
    return filterItems(list, query);
  }, [album, byId, query, newestFirst]);

  const groups = useMemo(() => groupByDate(items), [items]);

  const isCollection = album.source === "collection";

  function commit(e) {
    e.preventDefault();
    onUpdate(album.id, { name, note });
    setEditing(false);
  }

  function handleDelete() {
    if (window.confirm(`Delete album "${album.name}"? Photos stay in the gallery.`)) {
      onDelete(album.id);
      onBack();
    }
  }

  return (
    <div className="album-detail">
      <div className="album-bar">
        <button type="button" className="link-button" onClick={onBack}>
          ‹ All albums
        </button>
        {!isCollection && (
          <div className="album-bar-actions">
            <button type="button" className="link-button" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </button>
            <button type="button" className="link-button link-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      {editing && !isCollection ? (
        <form className="album-edit" onSubmit={commit}>
          <label className="sheet-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
          <label className="sheet-field">
            <span>Note</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={400} />
          </label>
          <div className="sheet-form-actions">
            <button type="submit" className="btn-solid">Save</button>
          </div>
        </form>
      ) : (
        <header className="album-head">
          <h2 className="album-title">{album.name}</h2>
          <span className="album-meta">
            {album.imageIds.length} {album.imageIds.length === 1 ? "photo" : "photos"}
            {isCollection && album.monthLabel ? ` · ${album.monthLabel}` : ""}
          </span>
          {album.note && <p className="album-note">{album.note}</p>}
        </header>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          {album.imageIds.length === 0
            ? "No photos yet. Tap the bookmark on any photo to add it here."
            : "No photos match this search."}
        </div>
      ) : (
        <div className="album-grid">
          {groups.map((g) =>
            g.items.length > 1 && g.day != null ? (
              <div key={g.key} className="date-group">
                <div className="date-group-head">
                  <span className="date-group-label">{formatGroupLong(g)}</span>
                  <span className="date-group-count">
                    · {g.items.length} photos
                  </span>
                </div>
                {g.items.map((it) => (
                  <GroupedPhoto
                    key={it.id}
                    item={it}
                    dateInHeader
                    onOpen={() => onOpenPhoto(it, items)}
                    onSave={onSave}
                    savedCount={savedCounts.get(it.id) || 0}
                  />
                ))}
              </div>
            ) : (
              <GroupedPhoto
                key={g.items[0].id}
                item={g.items[0]}
                dateInHeader={false}
                onOpen={() => onOpenPhoto(g.items[0], items)}
                onSave={onSave}
                savedCount={savedCounts.get(g.items[0].id) || 0}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function AlbumsIndex({ albums, byId, query, onOpen, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const visible = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) =>
      `${a.name} ${a.note || ""} ${a.monthLabel || ""}`.toLowerCase().includes(q)
    );
  }, [albums, query]);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, note);
    setName("");
    setNote("");
    setCreating(false);
  }

  return (
    <div className="albums-index">
      <div className="albums-bar">
        <h2 className="albums-bar-title">Albums</h2>
        {!creating && (
          <button type="button" className="btn-solid" onClick={() => setCreating(true)}>
            + New
          </button>
        )}
      </div>

      {creating && (
        <form className="album-create" onSubmit={submit}>
          <label className="sheet-field">
            <span>Album name</span>
            <input
              autoFocus
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
              rows={2}
              maxLength={400}
              placeholder="A line of context for this album"
            />
          </label>
          <div className="sheet-form-actions">
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-solid" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">No albums match this search.</div>
      ) : (
        <div className="albums-grid">
          {visible.map((a) => (
            <AlbumCard key={a.id} album={a} byId={byId} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Albums({
  albums,
  byId,
  query,
  openAlbumId,
  savedCounts,
  newestFirst,
  onOpenAlbum,
  onCloseAlbum,
  onCreate,
  onUpdate,
  onDelete,
  onOpenPhoto,
  onSave,
}) {
  const open = openAlbumId ? albums.find((a) => a.id === openAlbumId) : null;

  if (open) {
    return (
      <AlbumDetail
        album={open}
        byId={byId}
        query={query}
        savedCounts={savedCounts}
        newestFirst={newestFirst}
        onBack={onCloseAlbum}
        onOpenPhoto={onOpenPhoto}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  return (
    <AlbumsIndex
      albums={albums}
      byId={byId}
      query={query}
      onOpen={onOpenAlbum}
      onCreate={onCreate}
    />
  );
}

export { BookmarkIcon };
