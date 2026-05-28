import { useMemo, useState } from "react";
import { filterItems } from "../data/search.js";
import { Photo } from "./Timeline.jsx";

function AlbumCard({ album, byId, onOpen }) {
  const cover = album.imageIds.map((id) => byId.get(id)).find(Boolean);

  return (
    <button type="button" className="album-card" onClick={() => onOpen(album.id)}>
      <span className="album-cover">
        {cover ? (
          <img src={cover.src} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="album-cover-empty">Empty</span>
        )}
      </span>
      <span className="album-card-body">
        <span className="album-card-name">{album.name}</span>
        <span className="album-card-meta">
          {album.imageIds.length} {album.imageIds.length === 1 ? "Photo" : "Photos"}
          {album.monthLabel ? `  ${album.monthLabel}` : ""}
        </span>
        {album.note && <span className="album-card-note">{album.note}</span>}
      </span>
    </button>
  );
}

function AlbumDetail({ album, byId, query, newestFirst, editing, setEditing, onBack, onOpenPhoto, onUpdate, onDelete }) {
  const [name, setName] = useState(album.name);
  const [albumNote, setAlbumNote] = useState(album.note ?? "");
  const [seenEditing, setSeenEditing] = useState(editing);

  if (seenEditing !== editing) {
    setSeenEditing(editing);
    if (editing) {
      setName(album.name);
      setAlbumNote(album.note ?? "");
    }
  }

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

  function save() {
    onUpdate(album.id, { name, note: albumNote });
    setEditing(false);
  }

  function handleDelete() {
    if (window.confirm(`Delete album "${album.name}"? Photos stay in the gallery.`)) {
      onDelete(album.id);
      onBack();
    }
  }

  function handleOpen(item) { onOpenPhoto(item, items); }

  return (
    <div className="album-detail">
      <section className="collection">
        <header className="collection-head">
          {editing ? (
            <div className="note-edit">
              <input
                autoFocus
                className="album-edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Album name"
              />
              <textarea
                className="note-textarea"
                value={albumNote}
                onChange={(e) => setAlbumNote(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Add a description…"
              />
              <div className="note-edit-actions">
                <button type="button" className="note-btn note-btn--danger" onClick={handleDelete}>
                  Delete
                </button>
                <button type="button" className="note-btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="button" className="note-btn note-btn--save" onClick={save}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="collection-title">{album.name}</h2>
              {album.note && <p className="collection-note">{album.note}</p>}
              <span className="collection-meta">
                {album.imageIds.length} {album.imageIds.length === 1 ? "photo" : "photos"}
                {album.monthLabel ? ` · ${album.monthLabel}` : ""}
              </span>
            </>
          )}
        </header>
        {items.length === 0 ? (
          <p className="collection-empty">
            {album.imageIds.length === 0
              ? "No photos yet. Tap the bookmark icon on any photo to add it here."
              : "No photos match this search."}
          </p>
        ) : (
          <div className="collection-day">
            <div className="collection-grid">
              {items.map((item) => (
                <Photo key={item.id} item={item} onOpen={handleOpen} compact />
              ))}
            </div>
          </div>
        )}
      </section>
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
      {creating ? (
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
      ) : (
        <button type="button" className="album-new-btn" onClick={() => setCreating(true)}>
          + New album
        </button>
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
  newestFirst,
  albumEditing,
  setAlbumEditing,
  onOpenAlbum,
  onCloseAlbum,
  onCreate,
  onUpdate,
  onDelete,
  onOpenPhoto,
}) {
  const open = openAlbumId ? albums.find((a) => a.id === openAlbumId) : null;

  if (open) {
    return (
      <AlbumDetail
        album={open}
        byId={byId}
        query={query}
        newestFirst={newestFirst}
        editing={albumEditing}
        setEditing={setAlbumEditing}
        onBack={onCloseAlbum}
        onOpenPhoto={onOpenPhoto}
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

