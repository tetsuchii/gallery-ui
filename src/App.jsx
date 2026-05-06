import { useMemo, useState } from "react";
import { buildLibrary } from "./data/library.js";
import { useAlbums } from "./data/albums.js";
import { useNotes } from "./data/notes.js";
import { filterMonths } from "./data/search.js";
import { chronologicalBlocks } from "./data/dates.js";
import Header from "./components/Header.jsx";
import Filters from "./components/Filters.jsx";
import Timeline from "./components/Timeline.jsx";
import Lightbox from "./components/Lightbox.jsx";
import SaveSheet from "./components/SaveSheet.jsx";
import Albums from "./components/Albums.jsx";

export default function App() {
  const months = useMemo(() => buildLibrary(), []);

  const allItems = useMemo(() => {
    const out = [];
    for (const m of months) {
      for (const c of m.collections) for (const it of c.items) out.push(it);
      for (const it of m.loose) out.push(it);
    }
    return out;
  }, [months]);

  const itemsById = useMemo(() => {
    const map = new Map();
    for (const it of allItems) map.set(it.id, it);
    return map;
  }, [allItems]);

  // File-system collections show up in the Albums tab as read-only albums
  // (you can't edit/delete them, and they don't accept new photos via the
  // Save sheet — they're just a different view of what's already on disk).
  const collectionAlbums = useMemo(() => {
    const out = [];
    for (const m of months) {
      for (const c of m.collections) {
        if (c.items.length === 0) continue;
        out.push({
          id: `col::${c.key}`,
          source: "collection",
          name: c.name,
          note: c.note || "",
          imageIds: c.items.map((it) => it.id),
          monthLabel: m.label,
          monthKey: m.key,
          year: m.year,
          month: m.month,
        });
      }
    }
    out.sort((a, b) => a.year - b.year || a.month - b.month || a.name.localeCompare(b.name));
    return out;
  }, [months]);

  const years = useMemo(
    () => [...new Set(months.map((m) => m.year))].sort((a, b) => a - b),
    [months]
  );

  const monthsByYear = useMemo(() => {
    const map = new Map();
    for (const m of months) {
      if (!map.has(m.year)) map.set(m.year, []);
      map.get(m.year).push(m.month);
    }
    for (const list of map.values()) list.sort((a, b) => a - b);
    return map;
  }, [months]);

  // UI state
  const [view, setView] = useState("timeline");
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [newestFirst, setNewestFirst] = useState(true);

  // Notes (user edits stored in localStorage)
  const { overrides: noteOverrides, setNote, clearNote } = useNotes();

  const effectiveById = useMemo(() => {
    if (!noteOverrides.size) return itemsById;
    const map = new Map(itemsById);
    for (const [id, note] of noteOverrides) {
      const item = map.get(id);
      if (item) map.set(id, { ...item, note });
    }
    return map;
  }, [itemsById, noteOverrides]);

  // Albums
  const albumsApi = useAlbums();
  const [openAlbumId, setOpenAlbumId] = useState(null);
  const [saveTarget, setSaveTarget] = useState(null);

  const combinedAlbums = useMemo(() => {
    const sortKey = (a) =>
      a.source === "collection"
        ? new Date(a.year, a.month - 1, 1).getTime()
        : a.createdAt || 0;
    const list = [...albumsApi.albums, ...collectionAlbums];
    list.sort((a, b) =>
      newestFirst ? sortKey(b) - sortKey(a) : sortKey(a) - sortKey(b)
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

  // Timeline filtering
  const filteredMonths = useMemo(
    () => filterMonths(months, { year: selectedYear, month: selectedMonth, query }),
    [months, selectedYear, selectedMonth, query]
  );

  const orderedMonths = useMemo(() => {
    const base = newestFirst ? [...filteredMonths].reverse() : filteredMonths;
    if (!noteOverrides.size) return base;
    // Shallow-clone items that have a note override so child components re-render
    function applyOverride(it) {
      return noteOverrides.has(it.id) ? { ...it, note: noteOverrides.get(it.id) } : it;
    }
    return base.map((m) => ({
      ...m,
      loose: m.loose.map(applyOverride),
      collections: m.collections.map((c) => ({
        ...c,
        items: c.items.map(applyOverride),
      })),
    }));
  }, [filteredMonths, newestFirst, noteOverrides]);

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

  return (
    <div className="app">
      <header className="app-header">
        <Header view={view} onView={setView} query={query} onQuery={setQuery} />

        <Filters
          years={years}
          monthsByYear={monthsByYear}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={handleYear}
          onMonthChange={setSelectedMonth}
          newestFirst={newestFirst}
          onToggleSort={() => setNewestFirst((v) => !v)}
          showFilters={view === "timeline"}
        />
      </header>

      <main className="app-main">
        {view === "timeline" ? (
          <Timeline
            months={orderedMonths}
            onOpen={openInTimeline}
            onSave={setSaveTarget}
            savedCounts={savedCounts}
            newestFirst={newestFirst}
          />
        ) : (
          <Albums
            albums={combinedAlbums}
            byId={effectiveById}
            query={query}
            openAlbumId={openAlbumId}
            savedCounts={savedCounts}
            newestFirst={newestFirst}
            noteOverrides={noteOverrides}
            setNote={setNote}
            clearNote={clearNote}
            onOpenAlbum={setOpenAlbumId}
            onCloseAlbum={() => setOpenAlbumId(null)}
            onCreate={albumsApi.create}
            onUpdate={albumsApi.update}
            onDelete={albumsApi.remove}
            onOpenPhoto={openInList}
            onSave={setSaveTarget}
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
          onClose={() => setSaveTarget(null)}
          onToggle={albumsApi.toggleImage}
          onCreate={albumsApi.create}
        />
      )}
    </div>
  );
}
