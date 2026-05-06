import { useCallback, useEffect, useState } from "react";

const KEY = "gallery.deletedImages.v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {}
}

export function useDeletedImages() {
  const [deletedIds, setDeletedIds] = useState(load);

  useEffect(() => {
    persist(deletedIds);
  }, [deletedIds]);

  const markDeleted = useCallback((id) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setDeletedIds(new Set()), []);

  return { deletedIds, markDeleted, clearAll };
}
