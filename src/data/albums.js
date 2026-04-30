import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gallery.albums.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function save(albums) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
  } catch {
    // storage may be full or disabled; nothing else we can do offline
  }
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAlbums() {
  const [albums, setAlbums] = useState(() =>
    load().map((a) => ({ source: "user", ...a }))
  );

  useEffect(() => {
    save(albums);
  }, [albums]);

  const create = useCallback((name, note = "") => {
    const id = newId();
    setAlbums((list) => [
      ...list,
      {
        id,
        source: "user",
        name: name.trim() || "Untitled album",
        note: note.trim(),
        imageIds: [],
        createdAt: Date.now(),
      },
    ]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setAlbums((list) => list.filter((a) => a.id !== id));
  }, []);

  const update = useCallback((id, patch) => {
    setAlbums((list) =>
      list.map((a) => (a.id === id ? { ...a, ...patch, name: (patch.name ?? a.name).trim() || a.name } : a))
    );
  }, []);

  const toggleImage = useCallback((albumId, imageId) => {
    setAlbums((list) =>
      list.map((a) => {
        if (a.id !== albumId) return a;
        const has = a.imageIds.includes(imageId);
        return {
          ...a,
          imageIds: has ? a.imageIds.filter((i) => i !== imageId) : [...a.imageIds, imageId],
        };
      })
    );
  }, []);

  return { albums, create, remove, update, toggleImage };
}
