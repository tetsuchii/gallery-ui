import { MONTH_LONG, MONTH_SHORT } from "./library.js";

function itemHaystack(it, monthLabel) {
  return [
    it.filename,
    it.note || "",
    it.collectionName || "",
    monthLabel,
    MONTH_SHORT[it.month] || "",
    String(it.year),
    it.day != null ? String(it.day) : "",
  ]
    .join(" ")
    .toLowerCase();
}

function collectionHaystack(c) {
  return `${c.name} ${c.note || ""}`.toLowerCase();
}

export function filterMonths(months, { year = null, month = null, query = "" } = {}) {
  const q = (query || "").trim().toLowerCase();
  const out = [];

  for (const m of months) {
    if (year != null && m.year !== year) continue;
    if (month != null && m.month !== month) continue;

    const monthLabel = `${MONTH_LONG[m.month]} ${m.year}`;
    const monthMatchesQuery = q && monthLabel.toLowerCase().includes(q);

    const collections = [];
    for (const c of m.collections) {
      const colMatches = !q || monthMatchesQuery || collectionHaystack(c).includes(q);
      let items;
      if (!q || monthMatchesQuery || colMatches) {
        items = c.items;
      } else {
        items = c.items.filter((it) => itemHaystack(it, monthLabel).includes(q));
      }
      const keep = items.length > 0 || (q && collectionHaystack(c).includes(q));
      if (keep) collections.push({ ...c, items });
    }

    let loose;
    if (!q || monthMatchesQuery) {
      loose = m.loose;
    } else {
      loose = m.loose.filter((it) => itemHaystack(it, monthLabel).includes(q));
    }

    if (collections.length === 0 && loose.length === 0) continue;
    out.push({ ...m, collections, loose });
  }

  return out;
}

export function filterItems(items, query, { collectionName = null } = {}) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => {
    const monthLabel = `${MONTH_LONG[it.month]} ${it.year}`;
    const hay = itemHaystack(it, monthLabel) + " " + (collectionName || "").toLowerCase();
    return hay.includes(q);
  });
}
