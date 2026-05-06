import { useCallback, useEffect, useState } from "react";

const KEY = "gallery.notes.v1";

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

// overrides map semantics:
//   id not in map   → no override, use file-based note
//   id → "text"     → user-edited note (replaces file note)
//   id → ""         → user deleted note (shows nothing)

export function useNotes() {
  const [overrides, setOverrides] = useState(load);

  useEffect(() => {
    persist(overrides);
  }, [overrides]);

  const setNote = useCallback((id, text) => {
    setOverrides((m) => {
      const next = new Map(m);
      next.set(id, typeof text === "string" ? text : "");
      return next;
    });
  }, []);

  // Remove override entirely — reverts to the original file-based note.
  const clearNote = useCallback((id) => {
    setOverrides((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setOverrides(new Map()), []);

  return { overrides, setNote, clearNote, clearAll };
}
