import { rtfToText } from "./rtf.js";

const imageModules = import.meta.glob(
  "../assets/images/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}",
  { eager: true, query: "?url", import: "default" }
);

const rtfModules = import.meta.glob(
  "../assets/images/**/*.rtf",
  { eager: true, query: "?raw", import: "default" }
);

const MONTH_NUM = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_LONG = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseFolderDate(folder) {
  const m = folder.match(/^(\d{4})[-_]([a-z]+)$/i);
  if (!m) return null;
  const month = MONTH_NUM[m[2].toLowerCase()];
  if (!month) return null;
  return { year: parseInt(m[1], 10), month };
}

function dayFromFilename(name, monthNum) {
  const stem = name.replace(/\.[^.]+$/, "");
  // Primary: trailing _NN at the end of the stem (filenames end with _<day>)
  const trail = stem.match(/_(\d{1,2})$/);
  if (trail) {
    const d = parseInt(trail[1], 10);
    if (d >= 1 && d <= 31) return d;
  }
  // Fallback: <month>_<day> anywhere (e.g. "..._dec_19_extra")
  const candidates = [MONTH_SHORT[monthNum], MONTH_LONG[monthNum]]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  if (!candidates.length) return null;
  const re = new RegExp(`(?:${candidates.join("|")})_?(\\d{1,2})`, "i");
  const m = stem.toLowerCase().match(re);
  return m ? parseInt(m[1], 10) : null;
}

function relPath(p) {
  return p.replace(/^.*\/assets\/images\//, "");
}

function parentDir(p) {
  return p.replace(/\/[^/]+$/, "");
}

export function buildLibrary() {
  const rtfByPath = {};
  for (const [p, raw] of Object.entries(rtfModules)) {
    rtfByPath[p] = rtfToText(raw);
  }

  const monthMap = new Map();

  function getMonth(folder) {
    const date = parseFolderDate(folder);
    if (!date) return null;
    if (!monthMap.has(folder)) {
      const key = `${date.year}-${String(date.month).padStart(2, "0")}`;
      monthMap.set(folder, {
        key,
        year: date.year,
        month: date.month,
        label: `${MONTH_LONG[date.month]} ${date.year}`,
        shortLabel: MONTH_LONG[date.month],
        collections: new Map(),
        loose: [],
      });
    }
    return monthMap.get(folder);
  }

  function getCollection(monthEntry, name) {
    if (!monthEntry.collections.has(name)) {
      monthEntry.collections.set(name, {
        key: `${monthEntry.key}::${name}`,
        name,
        note: null,
        items: [],
      });
    }
    return monthEntry.collections.get(name);
  }

  // Pass 1: images
  for (const [path, url] of Object.entries(imageModules)) {
    const rel = relPath(path);
    const parts = rel.split("/");
    if (parts.length < 2) continue;

    const monthEntry = getMonth(parts[0]);
    if (!monthEntry) continue;

    const filename = parts[parts.length - 1];
    const baseName = filename.replace(/\.[^.]+$/, "");
    const dirPath = parentDir(path);
    const noteText = rtfByPath[`${dirPath}/${baseName}_note.rtf`] || null;
    const day = dayFromFilename(filename, monthEntry.month);

    const item = {
      id: path,
      src: url,
      filename,
      day,
      note: noteText,
      year: monthEntry.year,
      month: monthEntry.month,
    };

    if (parts.length === 2) {
      monthEntry.loose.push(item);
    } else {
      const colName = parts[1];
      const c = getCollection(monthEntry, colName);
      item.collectionName = colName;
      item.collectionKey = c.key;
      c.items.push(item);
    }
  }

  // Pass 2: collection notes (also creates note-only collections)
  for (const path of Object.keys(rtfByPath)) {
    const rel = relPath(path);
    const parts = rel.split("/");
    if (parts.length < 3) continue;

    const filename = parts[parts.length - 1];
    let isCollectionNote = false;
    if (parts.length === 3 && /^note.*\.rtf$/i.test(filename)) {
      isCollectionNote = true;
    } else if (
      parts.length === 4 &&
      /\.rtfd$/i.test(parts[2]) &&
      /^TXT\.rtf$/i.test(parts[3])
    ) {
      isCollectionNote = true;
    }
    if (!isCollectionNote) continue;

    const monthEntry = getMonth(parts[0]);
    if (!monthEntry) continue;
    const c = getCollection(monthEntry, parts[1]);
    if (!c.note) c.note = rtfByPath[path];
  }

  // Pass 3: month-day notes (e.g. "feb_13_note.rtf") attach to every image
  // in that month folder taken on that day. Pass 1's exact stem-match
  // already handled the "<base>.jpg" + "<base>_note.rtf" pair (e.g.
  // dec_4.jpg ↔ dec_4_note.rtf); this pass covers the looser case where the
  // note is named after the date and the actual image filenames are
  // unrelated (e.g. 52595475_..._n_feb_13.jpg ← feb_13_note.rtf).
  for (const [path, text] of Object.entries(rtfByPath)) {
    const rel = relPath(path);
    const parts = rel.split("/");
    if (parts.length !== 2) continue;
    const m = parts[1].match(/^[a-z]+_(\d{1,2})_note\.rtf$/i);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    if (day < 1 || day > 31) continue;
    const monthEntry = monthMap.get(parts[0]);
    if (!monthEntry) continue;

    for (const it of monthEntry.loose) {
      if (it.day === day && !it.note) it.note = text;
    }
    for (const c of monthEntry.collections.values()) {
      for (const it of c.items) {
        if (it.day === day && !it.note) it.note = text;
      }
    }
  }

  // Sort
  const months = [...monthMap.values()].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  const dayThenName = (a, b) =>
    (a.day ?? 99) - (b.day ?? 99) || a.filename.localeCompare(b.filename);

  for (const m of months) {
    m.loose.sort(dayThenName);
    for (const c of m.collections.values()) c.items.sort(dayThenName);
    m.collections = [...m.collections.values()].sort((a, b) => {
      const ad = a.items[0]?.day ?? 99;
      const bd = b.items[0]?.day ?? 99;
      return ad - bd || a.name.localeCompare(b.name);
    });
  }

  return months;
}

export { MONTH_LONG, MONTH_SHORT };
