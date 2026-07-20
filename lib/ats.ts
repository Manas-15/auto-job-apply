export interface AtsKeywords {
  required: string[];
  niceToHave: string[];
  ats: string[];
}

export interface AtsResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string;
}

/**
 * ATS score: how well a résumé covers the keywords an ATS would scan the JD
 * for. Deterministic keyword matching — no AI cost. Required skills are
 * weighted more heavily than nice-to-haves.
 */
export function computeAtsScore(resumeText: string, keywords: AtsKeywords): AtsResult {
  const haystack = resumeText.toLowerCase();

  const buckets: { list: string[]; weight: number }[] = [
    { list: keywords.required, weight: 3 },
    { list: keywords.ats, weight: 1.5 },
    { list: keywords.niceToHave, weight: 1 },
  ];

  const matched = new Set<string>();
  const missing = new Set<string>();
  let earned = 0;
  let possible = 0;

  for (const { list, weight } of buckets) {
    for (const kw of dedupe(list)) {
      possible += weight;
      if (containsKeyword(haystack, kw)) {
        earned += weight;
        matched.add(kw);
      } else {
        missing.add(kw);
      }
    }
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    score,
    matchedKeywords: [...matched],
    missingKeywords: [...missing].filter((k) => !matched.has(k)),
    notes:
      possible === 0
        ? 'No keywords extracted — the job description may be too short.'
        : `Matched ${matched.size} of ${matched.size + missing.size} distinct keywords.`,
  };
}

/**
 * Whole-word-ish match that tolerates punctuation (e.g. "Node.js", "CI/CD").
 * A "." counts as a word boundary, so a bare keyword like "React" matches
 * "React.js" (and "Node" matches "Node.js"), while a dotted keyword such as
 * "Node.js" still matches literally. Prevents false negatives that unfairly
 * dragged down ATS scores.
 */
function containsKeyword(haystack: string, keyword: string): boolean {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Boundaries exclude only identifier chars (letters, digits, +, #) — a dot is
  // a boundary, so "react" matches inside "react.js" but not "reactive".
  const re = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i');
  return re.test(haystack);
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}
