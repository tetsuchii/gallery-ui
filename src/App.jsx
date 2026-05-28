import { useEffect, useMemo, useState } from "react";
import { buildLibrary } from "./data/library.js";
import { useAlbums } from "./data/albums.js";
import { useNotes } from "./data/notes.js";
import { useAlbumOverrides } from "./data/albumOverrides.js";
import { useDeletedImages } from "./data/deletedImages.js";
import { filterMonths } from "./data/search.js";
import { chronologicalBlocks } from "./data/dates.js";
import Header from "./components/Header.jsx";
import Filters from "./components/Filters.jsx";
import Timeline from "./components/Timeline.jsx";
import Lightbox from "./components/Lightbox.jsx";
import SaveSheet from "./components/SaveSheet.jsx";
import Albums from "./components/Albums.jsx";

function PhotosIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18" />
      <path d="M8 2v4M16 2v4" />
      <rect x="7" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="13" width="3.5" height="3.5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AlbumsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a2 2 0 0 1 2-2h4.5l2 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

export default function App() {
  const libraryMonths = useMemo(() => buildLibrary(), []);

  const [uploadedImages, setUploadedImages] = useState([]);

  useEffect(() => {
    async function loadUploadedImages() {
      try {
        const apiBase = `http://${window.location.hostname}:3001`;
        const res = await fetch(`${apiBase}/images-list`);
        const files = await res.json();

        const now = new Date();

        const items = files.map((file) => ({
          id: `upload::${file}`,
          src: `${apiBase}/images/${file}`,
          filename: file,
          day: now.getDate(),
          note: null,
          collectionNote: null,
          collectionName: null,
          collectionKey: null,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          source: "upload",
        }));

        setUploadedImages(items);
      } catch (err) {
        console.error("Could not load uploaded images", err);
      }
    }

    loadUploadedImages();

    const interval = setInterval(loadUploadedImages, 3000);
    return () => clearInterval(interval);
  }, []);

  const deletedImagesApi = useDeletedImages();

  async function deleteAnyImage(item) {
    deletedImagesApi.markDeleted(item.id);

    if (item.source === "upload") {
      const apiBase = `http://${window.location.hostname}:3001`;
      await fetch(`${apiBase}/images/${item.filename}`, {
        method: "DELETE",
      });
      setUploadedImages((imgs) =>
        imgs.filter((img) => img.filename !== item.filename),
      );
    }
  }

  const months = useMemo(() => {
    if (!uploadedImages.length) return libraryMonths;

    const now = new Date();

    const uploadMonth = {
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-uploads`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      label: "Uploaded images",
      shortLabel: "Uploads",
      collections: [],
      loose: uploadedImages,
    };

    return [...libraryMonths, uploadMonth];
  }, [libraryMonths, uploadedImages]);

  const monthsWithoutDeleted = useMemo(() => {
    if (!deletedImagesApi.deletedIds.size) return months;
    return months.map((m) => ({
      ...m,
      loose: m.loose.filter((it) => !deletedImagesApi.deletedIds.has(it.id)),
      collections: m.collections.map((c) => ({
        ...c,
        items: c.items.filter((it) => !deletedImagesApi.deletedIds.has(it.id)),
      })),
    }));
  }, [months, deletedImagesApi.deletedIds]);

  const allItems = useMemo(() => {
    const out = [];
    for (const m of monthsWithoutDeleted) {
      for (const c of m.collections) for (const it of c.items) out.push(it);
      for (const it of m.loose) out.push(it);
    }
    return out;
  }, [monthsWithoutDeleted]);

  const itemsById = useMemo(() => {
    const map = new Map();
    for (const it of allItems) map.set(it.id, it);
    return map;
  }, [allItems]);

  // Hooks that collectionAlbums depends on must come first
  const { overrides: noteOverrides, setNote, clearNote } = useNotes();
  const albumOverridesApi = useAlbumOverrides();

  // File-system collections show up in the Albums tab as read-only albums
  // (you can't edit/delete them, and they don't accept new photos via the
  // Save sheet — they're just a different view of what's already on disk).
  const collectionAlbums = useMemo(() => {
    const out = [];
    for (const m of monthsWithoutDeleted) {
      for (const c of m.collections) {
        if (c.items.length === 0) continue;
        const id = `col::${c.key}`;
        const ov = albumOverridesApi.overrides.get(id) || {};
        if (ov.hidden) continue;
        const hiddenSet = new Set(ov.hiddenImageIds || []);
        out.push({
          id,
          source: "collection",
          name: ov.name ?? c.name,
          note: ov.note !== undefined ? ov.note : (c.note || ""),
          imageIds: c.items.filter((it) => !hiddenSet.has(it.id)).map((it) => it.id),
          monthLabel: m.label,
          monthKey: m.key,
          year: m.year,
          month: m.month,
        });
      }
    }
    out.sort(
      (a, b) =>
        a.year - b.year || a.month - b.month || a.name.localeCompare(b.name),
    );
    return out;
  }, [monthsWithoutDeleted, albumOverridesApi.overrides]);

  const years = useMemo(
    () => [...new Set(monthsWithoutDeleted.map((m) => m.year))].sort((a, b) => a - b),
    [monthsWithoutDeleted],
  );

  const monthsByYear = useMemo(() => {
    const map = new Map();
    for (const m of monthsWithoutDeleted) {
      if (!map.has(m.year)) map.set(m.year, []);
      map.get(m.year).push(m.month);
    }
    for (const list of map.values()) list.sort((a, b) => a - b);
    return map;
  }, [monthsWithoutDeleted]);

  // UI state
  const [view, setView] = useState("timeline");
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [query, selectedYear, selectedMonth, newestFirst]);

  const effectiveById = useMemo(() => {
    const map = new Map(itemsById);
    for (const id of deletedImagesApi.deletedIds) {
      map.delete(id);
    }
    for (const [id, note] of noteOverrides) {
      const item = map.get(id);
      if (item) map.set(id, { ...item, note });
    }
    return map;
  }, [itemsById, noteOverrides, deletedImagesApi.deletedIds]);

  // Albums
  const albumsApi = useAlbums();
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [albumEditing, setAlbumEditing] = useState(false);
  const [saveTarget, setSaveTarget] = useState(null);

  function openAlbum(id) { setOpenAlbumId(id); setAlbumEditing(false); }
  function closeAlbum() { setOpenAlbumId(null); setAlbumEditing(false); }
  function openAlbumFromTimeline(id) { setView("albums"); openAlbum(id); }

  const combinedAlbums = useMemo(() => {
    const sortKey = (a) =>
      a.source === "collection"
        ? new Date(a.year, a.month - 1, 1).getTime()
        : a.createdAt || 0;
    const list = [...albumsApi.albums, ...collectionAlbums];
    list.sort((a, b) =>
      newestFirst ? sortKey(b) - sortKey(a) : sortKey(a) - sortKey(b),
    );
    return list;
  }, [albumsApi.albums, collectionAlbums, newestFirst]);

  const savedCounts = useMemo(() => {
    const map = new Map();
    for (const a of albumsApi.albums) {
      for (const id of a.imageIds) map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  }, [albumsApi.albums]);

  // Merge all user edits (note overrides + album name/note overrides) into the
  // month tree so that filterMonths searches the effective text, not raw data.
  const monthsWithNotes = useMemo(() => {
    const hasNotes = noteOverrides.size > 0;
    const hasAlbum = albumOverridesApi.overrides.size > 0;
    if (!hasNotes && !hasAlbum) return monthsWithoutDeleted;
    return monthsWithoutDeleted.map((m) => ({
      ...m,
      loose: hasNotes
        ? m.loose.map((it) =>
            noteOverrides.has(it.id) ? { ...it, note: noteOverrides.get(it.id) } : it
          )
        : m.loose,
      collections: m.collections.map((c) => {
        const ov = hasAlbum ? (albumOverridesApi.overrides.get(`col::${c.key}`) || {}) : {};
        const c2 = (ov.name !== undefined || ov.note !== undefined)
          ? { ...c, name: ov.name ?? c.name, note: ov.note !== undefined ? ov.note : c.note }
          : c;
        return hasNotes
          ? { ...c2, items: c2.items.map((it) =>
              noteOverrides.has(it.id) ? { ...it, note: noteOverrides.get(it.id) } : it
            ) }
          : c2;
      }),
    }));
  }, [monthsWithoutDeleted, noteOverrides, albumOverridesApi.overrides]);

  // Timeline filtering
  const filteredMonths = useMemo(
    () => filterMonths(monthsWithNotes, { year: selectedYear, month: selectedMonth, query }),
    [monthsWithNotes, selectedYear, selectedMonth, query],
  );

  const orderedMonths = useMemo(
    () => newestFirst ? [...filteredMonths].reverse() : filteredMonths,
    [filteredMonths, newestFirst],
  );

  const flatTimelineItems = useMemo(() => {
    const out = [];
    for (const m of orderedMonths) {
      for (const b of chronologicalBlocks(m, { newestFirst })) {
        if (b.kind === "collection") {
          for (const it of b.collection.items) out.push(it);
        } else {
          for (const it of b.group.items) out.push(it);
        }
      }
    }
    return out;
  }, [orderedMonths, newestFirst]);

  const [lightbox, setLightbox] = useState(null);

  function openInTimeline(item) {
    const idx = flatTimelineItems.findIndex((it) => it.id === item.id);
    if (idx >= 0) setLightbox({ items: flatTimelineItems, index: idx });
  }
  function openInList(item, list) {
    const idx = list.findIndex((it) => it.id === item.id);
    if (idx >= 0) setLightbox({ items: list, index: idx });
  }

  function handleYear(y) {
    setSelectedYear(y);
    setSelectedMonth(null);
  }

  // Unified album update — routes to the right store based on album source
  function handleAlbumUpdate(albumId, patch) {
    const album = combinedAlbums.find((a) => a.id === albumId);
    if (!album) return;
    if (album.source === "collection") {
      albumOverridesApi.patch(albumId, patch);
    } else {
      albumsApi.update(albumId, patch);
    }
  }

  // Unified album delete — hides collection albums, fully removes user albums
  function handleAlbumDelete(albumId) {
    const album = combinedAlbums.find((a) => a.id === albumId);
    if (!album) return;
    if (album.source === "collection") {
      albumOverridesApi.patch(albumId, { hidden: true });
    } else {
      albumsApi.remove(albumId);
    }
    setOpenAlbumId(null);
  }

  // Toggle a photo's presence in its original collection album (hide ↔ restore).
  function handleToggleCollectionImage(albumId, imageId) {
    const album = collectionAlbums.find((a) => a.id === albumId);
    if (!album) return;
    if (album.imageIds.includes(imageId)) {
      albumOverridesApi.hideImage(albumId, imageId);
    } else {
      albumOverridesApi.showImage(albumId, imageId);
    }
  }


  return (
    <div className="app">
      <header className="app-header">
        <Header
          view={view}
          onView={setView}
          query={query}
          onQuery={setQuery}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          onBack={view === "albums" && openAlbumId ? closeAlbum : undefined}
          onHeaderAction={view === "albums" && openAlbumId ? () => setAlbumEditing(true) : undefined}
        />

        {filtersOpen && view === "timeline" && (
          <Filters
            years={years}
            monthsByYear={monthsByYear}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={handleYear}
            onMonthChange={setSelectedMonth}
            newestFirst={newestFirst}
            onToggleSort={() => setNewestFirst((v) => !v)}
            showFilters
          />
        )}
      </header>

      <main className="app-main">
        {view === "timeline" ? (
          <Timeline
            months={orderedMonths}
            onOpen={openInTimeline}
            onSave={setSaveTarget}
            savedCounts={savedCounts}
            newestFirst={newestFirst}
            onOpenAlbum={openAlbumFromTimeline}
          />
        ) : (
          <Albums
            albums={combinedAlbums}
            byId={effectiveById}
            query={query}
            openAlbumId={openAlbumId}
            newestFirst={newestFirst}
            albumEditing={albumEditing}
            setAlbumEditing={setAlbumEditing}
            onOpenAlbum={openAlbum}
            onCloseAlbum={closeAlbum}
            onCreate={albumsApi.create}
            onUpdate={handleAlbumUpdate}
            onDelete={handleAlbumDelete}
            onOpenPhoto={openInList}
          />
        )}
      </main>

      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox((lb) => ({ ...lb, index: i }))}
          onSave={setSaveTarget}
          onDelete={deleteAnyImage}
          savedCounts={savedCounts}
          noteOverrides={noteOverrides}
          setNote={setNote}
          clearNote={clearNote}
        />
      )}

      {saveTarget && (
        <SaveSheet
          image={saveTarget}
          albums={albumsApi.albums}
          collectionAlbums={collectionAlbums}
          onClose={() => setSaveTarget(null)}
          onToggle={albumsApi.toggleImage}
          onToggleCollection={handleToggleCollectionImage}
          onCreate={albumsApi.create}
        />
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="bottom-tab-bar">
          <button
            type="button"
            className={`bottom-tab ${view === "timeline" ? "is-active" : ""}`}
            onClick={() => setView("timeline")}
            aria-label="Photos"
          >
            <PhotosIcon />
            <span>Photos</span>
          </button>
          <button
            type="button"
            className={`bottom-tab ${view === "albums" ? "is-active" : ""}`}
            onClick={() => setView("albums")}
            aria-label="Albums"
          >
            <AlbumsIcon />
            <span>Albums</span>
          </button>
        </div>
        <div className="home-indicator" aria-hidden="true" />
      </nav>
    </div>
  );
}
