import { MONTH_LONG, MONTH_SHORT } from "./library.js";

export function formatDateLong(item) {
  const m = MONTH_LONG[item.month];
  return item.day ? `${m} ${item.day}, ${item.year}` : `${m} ${item.year}`;
}

export function formatDateShort(item) {
  const m = MONTH_SHORT[item.month];
  return item.day ? `${m} ${item.day}` : m;
}

export function formatDateBar(item) {
  const m = MONTH_SHORT[item.month];
  return item.day ? `${m} ${item.day}, ${item.year}` : `${m} ${item.year}`;
}

// Walk a pre-sorted item list and bucket consecutive photos taken on the same
// (year, month, day) so the UI can render a single date header above them
// instead of stamping every thumbnail.
export function groupByDate(items) {
  const groups = [];
  for (const it of items) {
    const key = `${it.year}-${it.month}-${it.day ?? "x"}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(it);
    } else {
      groups.push({ key, year: it.year, month: it.month, day: it.day ?? null, items: [it] });
    }
  }
  return groups;
}

export function formatGroupShort(group) {
  const m = MONTH_SHORT[group.month];
  return group.day ? `${m} ${group.day}` : m;
}

export function formatGroupLong(group) {
  const m = MONTH_LONG[group.month];
  return group.day ? `${m} ${group.day}, ${group.year}` : `${m} ${group.year}`;
}

// Merge a month's collections and loose-day-groups into a single chronological
// stream, so the timeline reads day-by-day instead of "all collections first,
// then loose photos." Collections without a known day, and photos without a
// day, always sort to the bottom of the month regardless of direction.
export function chronologicalBlocks(month, { newestFirst = false } = {}) {
  const NULL_DAY = newestFirst ? -1 : 99;
  const blocks = [];

  for (const g of groupByDate(month.loose)) {
    const items = newestFirst ? [...g.items].reverse() : g.items;
    blocks.push({ kind: "photos", day: g.day ?? NULL_DAY, group: { ...g, items } });
  }
  for (const c of month.collections) {
    const firstDay = c.items[0]?.day ?? null;
    const items = newestFirst ? [...c.items].reverse() : c.items;
    blocks.push({ kind: "collection", day: firstDay ?? NULL_DAY, collection: { ...c, items } });
  }

  blocks.sort((a, b) => {
    const cmp = a.day - b.day;
    return newestFirst ? -cmp : cmp;
  });
  return blocks;
}

