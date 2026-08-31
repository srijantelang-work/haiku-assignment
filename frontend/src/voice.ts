const SYNONYMS: Record<string, string> = {
  mail: "male",
  email: "male",
  may: "male",
  main: "male",
  man: "male",
  men: "male",
  guy: "male",
  boy: "male",
  woman: "female",
  women: "female",
  girl: "female",
  lady: "female",
  मेल: "male",
  मैल: "male",
  पुरुष: "male",
  आदमी: "male",
  फीमेल: "female",
  महिला: "female",
  स्त्री: "female",
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  const cleaned = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return SYNONYMS[cleaned] ?? cleaned;
}

export function matchOption(transcript: string, options: string[]): string | null {
  const raw = transcript.trim().toLowerCase();

  const directSynonym = SYNONYMS[raw] || SYNONYMS[transcript.trim()];
  if (directSynonym) {
    for (const opt of options) {
      if (opt.toLowerCase() === directSynonym) return opt;
    }
  }

  const t = normalize(transcript);
  if (!t) return null;

  for (const opt of options) {
    if (normalize(opt) === t) return opt;
  }

  if (SYNONYMS[t]) {
    const syn = SYNONYMS[t];
    for (const opt of options) {
      if (normalize(opt) === syn) return opt;
    }
  }

  const tokens = t.split(" ").filter(Boolean).map((w) => SYNONYMS[w] || w);
  for (const opt of options) {
    const optNorm = normalize(opt);
    const optTokens = optNorm.split(" ").filter(Boolean);

    for (const tok of tokens) {
      if (tok === optNorm || optTokens.includes(tok)) return opt;
    }

    if (t.includes(optNorm) || optNorm.includes(t)) return opt;
  }

  for (const opt of options) {
    const optNorm = normalize(opt);
    for (const tok of tokens) {
      const maxDist = Math.max(1, Math.floor(optNorm.length * 0.3));
      if (levenshtein(tok, optNorm) <= maxDist) {
        return opt;
      }
    }
  }

  return null;
}

export function matchYesNo(transcript: string): boolean | null {
  const raw = transcript.trim();
  if (
    ["हाँ", "हां", "हा", "सही", "yes", "yeah", "yep", "yup", "ya", "sure", "correct", "affirmative"].includes(
      raw.toLowerCase()
    )
  ) {
    return true;
  }
  if (
    ["नहीं", "ना", "न", "गलत", "no", "nope", "nah", "negative"].includes(raw.toLowerCase())
  ) {
    return false;
  }

  const t = normalize(transcript);
  if (!t) return null;
  if (/^(yes|yeah|yep|yup|ya|sure|correct|affirmative)$/.test(t)) return true;
  if (/^(no|nope|nah|negative)$/.test(t)) return false;
  if (/^yes\b/.test(t)) return true;
  if (/^no\b/.test(t)) return false;
  return null;
}
