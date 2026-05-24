import { rtfToText } from "./rtf.js";

const imageModules = import.meta.glob(
  "../assets/images/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}",
  { eager: true, query: "?url", import: "default" }
);

const rtfModules = import.meta.glob(
  "../assets/images/**/*.rtf",
  { eager: true, query: "?raw", import: "default" }
);

const txtModules = import.meta.glob(
  "../assets/images/**/*.txt",
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
  const noteByPath = {};
  for (const [p, raw] of Object.entries(rtfModules)) {
    noteByPath[p] = rtfToText(raw);
  }
  for (const [p, raw] of Object.entries(txtModules)) {
    noteByPath[p] = raw?.trim() || null;
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
    const noteText =
      noteByPath[`${dirPath}/${baseName}_note.txt`] ||
      noteByPath[`${dirPath}/${baseName}_note.rtf`] ||
      null;
    const day = dayFromFilename(filename, monthEntry.month);

    const item = {
      id: path,
      src: url,
      filename,
      day,
      note: noteText,
      collectionNote: null,
      collectionName: null,
      collectionKey: null,
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

  // Pass 2: collection notes — any note file inside a collection folder:
  // "note*.rtf/txt" (old style), "<mon>_<day>_note.rtf/txt" (new style),
  // plus the .rtfd/TXT.rtf|txt variant. After setting c.note, the note text
  // is also copied to each item so the lightbox can display it.
  for (const path of Object.keys(noteByPath)) {
    const rel = relPath(path);
    const parts = rel.split("/");
    if (parts.length < 3) continue;

    const filename = parts[parts.length - 1];
    let isCollectionNote = false;
    // depth 3: name starts with "note" OR ends with "_note", any supported ext
    if (parts.length === 3 && /(?:^note|_note)\.(?:rtf|txt)$/i.test(filename)) {
      isCollectionNote = true;
    // depth 4: <anything>.rtfd/TXT.rtf|txt
    } else if (
      parts.length === 4 &&
      /\.rtfd$/i.test(parts[2]) &&
      /^TXT\.(?:rtf|txt)$/i.test(parts[3])
    ) {
      isCollectionNote = true;
    }
    if (!isCollectionNote) continue;

    const monthEntry = getMonth(parts[0]);
    if (!monthEntry) continue;
    const c = getCollection(monthEntry, parts[1]);
    if (!c.note) {
      c.note = noteByPath[path];
      // propagate to all items already in this collection
      for (const it of c.items) it.collectionNote = c.note;
    }
  }

  // Pass 3: month-day notes attach to every loose image in that month taken
  // on that day. Handles:
  //   <mon>_<day>_note.rtf|txt          depth 2: "2019-feb/feb_13_note.txt"
  //   <mon>_<day>_note.rtfd/TXT.rtf|txt depth 3: "2019-aug/aug_24_note.rtfd/TXT.txt"
  for (const [path, text] of Object.entries(noteByPath)) {
    const rel = relPath(path);
    const parts = rel.split("/");

    let day = null;
    if (parts.length === 2) {
      const m = parts[1].match(/^[a-z]+_(\d{1,2})_note\.(?:rtf|txt)$/i);
      if (m) day = parseInt(m[1], 10);
    } else if (
      parts.length === 3 &&
      /^TXT\.(?:rtf|txt)$/i.test(parts[2]) &&
      /^[a-z]+_\d{1,2}_note\.rtfd$/i.test(parts[1])
    ) {
      const m = parts[1].match(/_(\d{1,2})_note\.rtfd$/i);
      if (m) day = parseInt(m[1], 10);
    }

    if (!day || day < 1 || day > 31) continue;
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
