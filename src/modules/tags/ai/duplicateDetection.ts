// Duplicate-tag detection is a string-similarity problem, not a reasoning problem —
// deliberately NOT an LLM call. Cheaper, deterministic, explainable, and doesn't spend
// AI credits on something Levenshtein distance already solves well.

export interface TagNamePair {
  a: { id: string; name: string };
  b: { id: string; name: string };
  similarity: number;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Finds pairs of tags whose normalized names are near-identical (e.g. "VIP" vs
 * "V.I.P", "High Value" vs "High-Value Client") — surfaced for a human to merge,
 * never auto-merged.
 */
export function findDuplicateTagPairs(
  tags: { id: string; name: string }[],
  threshold = 0.82,
): TagNamePair[] {
  const pairs: TagNamePair[] = [];
  const normalized = tags.map((t) => ({ ...t, norm: normalize(t.name) }));

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const score = similarity(normalized[i].norm, normalized[j].norm);
      if (score >= threshold) {
        pairs.push({ a: tags[i], b: tags[j], similarity: score });
      }
    }
  }

  return pairs.sort((p1, p2) => p2.similarity - p1.similarity);
}
