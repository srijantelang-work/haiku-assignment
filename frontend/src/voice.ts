// Fuzzy matching for "or just say your answer" voice input. Turns a raw
// transcript into the nearest option (or a boolean for yes/no) so a spoken
// answer can drive the same tap path — no perfect ASR needed.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best option in `options` that the transcript matches, or null. */
export function matchOption(transcript: string, options: string[]): string | null {
  const t = normalize(transcript);
  if (!t) return null;

  // Exact match first (most reliable).
  for (const opt of options) {
    if (normalize(opt) === t) return opt;
  }
  // Then containment either way (e.g. "over a year" vs "a year or more").
  for (const opt of options) {
    const o = normalize(opt);
    if (!o) continue;
    if (t.includes(o) || o.includes(t)) return opt;
  }
  return null;
}

/** Interpret a spoken yes/no. Returns true/false, or null if ambiguous. */
export function matchYesNo(transcript: string): boolean | null {
  const t = normalize(transcript);
  if (!t) return null;
  if (/^(yes|yeah|yep|yup|ya|sure|correct|affirmative)$/.test(t)) return true;
  if (/^(no|nope|nah|negative)$/.test(t)) return false;
  // Prefixed forms: "yes i do" / "no i haven't".
  if (/^yes\b/.test(t)) return true;
  if (/^no\b/.test(t)) return false;
  return null;
}
