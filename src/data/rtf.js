// Minimal RTF → plain text converter tuned for the macOS TextEdit notes
// in this gallery: handles \'XX byte escapes, \uNNNN unicode (incl. surrogate
// pairs for emoji), \uc fallback skip count, \par/\line breaks, and skips
// header destinations like \fonttbl, \colortbl, \*\expandedcolortbl.

const SKIP_DESTINATIONS = new Set([
  "fonttbl", "colortbl", "expandedcolortbl", "stylesheet", "info",
  "filetbl", "listtable", "listoverridetable", "rsidtbl", "generator",
  "pgptbl", "themedata", "datastore", "nonshppict", "shppict", "object",
  "pntext", "fldinst", "latentstyles", "lsdlockedexcept", "pict",
  "header", "footer", "headerl", "headerr", "footerl", "footerr",
]);

export function rtfToText(rtf) {
  if (!rtf) return null;

  let i = 0;
  let depth = 0;
  let out = "";
  let skipDepth = -1;
  let ucSkip = 1;
  let pendingSkip = 0;

  const emitChar = (ch) => {
    if (skipDepth >= 0) return;
    if (pendingSkip > 0) { pendingSkip--; return; }
    out += ch;
  };

  while (i < rtf.length) {
    const c = rtf[i];

    if (c === "{") {
      depth++;
      i++;
      // detect destination groups starting with \word or \*\word
      let j = i;
      if (rtf[j] === "\\" && rtf[j + 1] === "*") j += 2;
      if (rtf[j] === "\\") {
        const m = rtf.slice(j + 1).match(/^([a-z]+)/i);
        if (m && SKIP_DESTINATIONS.has(m[1].toLowerCase()) && skipDepth < 0) {
          skipDepth = depth;
        }
      }
      continue;
    }

    if (c === "}") {
      if (skipDepth === depth) skipDepth = -1;
      depth--;
      i++;
      continue;
    }

    if (c === "\\") {
      const next = rtf[i + 1];

      // \'XX hex byte
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        i += 4;
        if (skipDepth < 0) {
          if (pendingSkip > 0) pendingSkip--;
          else out += String.fromCharCode(parseInt(hex, 16));
        }
        continue;
      }

      // escaped literals
      if (next === "\\" || next === "{" || next === "}") {
        emitChar(next);
        i += 2;
        continue;
      }

      // \* destination marker
      if (next === "*") {
        i += 2;
        continue;
      }

      // \<newline> = paragraph break
      if (next === "\n" || next === "\r") {
        if (skipDepth < 0) out += "\n";
        i += 2;
        continue;
      }

      // control word
      const m = rtf.slice(i + 1).match(/^([a-z]+)(-?\d+)?/i);
      if (m) {
        const word = m[1].toLowerCase();
        const param = m[2] != null ? parseInt(m[2], 10) : null;
        i += 1 + m[0].length;
        if (rtf[i] === " ") i++; // optional delimiter

        if (skipDepth >= 0) continue;

        if (word === "u" && param != null) {
          if (pendingSkip > 0) {
            pendingSkip--;
          } else {
            const cu = param < 0 ? param + 65536 : param;
            out += String.fromCharCode(cu);
            pendingSkip = ucSkip;
          }
          continue;
        }
        if (word === "uc") {
          ucSkip = param != null ? param : 1;
          continue;
        }
        if (word === "par" || word === "line" || word === "sect") {
          if (pendingSkip > 0) pendingSkip--;
          else out += "\n";
          continue;
        }
        if (word === "tab") {
          if (pendingSkip > 0) pendingSkip--;
          else out += "\t";
          continue;
        }
        // unrecognised control words are formatting noise — drop them
        continue;
      }

      // lone backslash, skip
      i++;
      continue;
    }

    if (c === "\n" || c === "\r") {
      // raw newlines in source are not text breaks in RTF
      i++;
      continue;
    }

    emitChar(c);
    i++;
  }

  return out.replace(/\n{2,}/g, "\n").trim();
}
