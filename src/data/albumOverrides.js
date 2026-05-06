import { useCallback, useEffect, useState } from "react";

const KEY = "gallery.albumOverrides.v1";

// Override shape per album id:
//   { name?: string, note?: string, hidden?: boolean, hiddenImageIds?: string[] }
//
// Used for folder-based collection albums. User-created albums have their own
// full data in useAlbums, so they don't need overrides.

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Map(JSON.parse(raw)) : new Map();
  } catch {
    return new Map();
  }
}

function persist(m) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...m.entries()]));
  } catch {}
}

export function useAlbumOverrides() {
  const [overrides, setOverrides] = useState(load);

  useEffect(() => {
    persist(overrides);
  }, [overrides]);

  // Merge a partial patch into the stored override for one album.
  const patch = useCallback((id, partialPatch) => {
    setOverrides((m) => {
      const next = new Map(m);
      next.set(id, { ...(next.get(id) || {}), ...partialPatch });
      return next;
    });
  }, []);

  // Remove all overrides for one album (restores to filesystem state).
  const clearOne = useCallback((id) => {
    setOverrides((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }, []);

  // Add an image to the hidden list for a collection album.
  const hideImage = useCallback((albumId, imageId) => {
    setOverrides((m) => {
      const next = new Map(m);
      const ov = next.get(albumId) || {};
      const current = ov.hiddenImageIds || [];
      if (current.includes(imageId)) return m;
      next.set(albumId, { ...ov, hiddenImageIds: [...current, imageId] });
      return next;
    });
  }, []);

  // Remove an image from the hidden list for a collection album (re-include it).
  const showImage = useCallback((albumId, imageId) => {
    setOverrides((m) => {
      const next = new Map(m);
      const ov = next.get(albumId) || {};
      const current = ov.hiddenImageIds || [];
      if (!current.includes(imageId)) return m;
      next.set(albumId, { ...ov, hiddenImageIds: current.filter((id) => id !== imageId) });
      return next;
    });
  }, []);

  // Wipe all overrides (used by the global app-data reset).
  const clearAll = useCallback(() => setOverrides(new Map()), []);

  return { overrides, patch, clearOne, hideImage, showImage, clearAll };
}
