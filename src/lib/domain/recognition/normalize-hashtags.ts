const HASHTAG_PATTERN = /^[a-z0-9_]{1,50}$/;

export type NormalizedHashtag = {
  normalizedName: string;
  displayName: string;
};

export function normalizeHashtag(raw: string): NormalizedHashtag | null {
  let value = raw.trim();
  if (value.startsWith("#")) {
    value = value.slice(1).trim();
  }
  if (!value) return null;

  const normalizedName = value.toLowerCase();
  if (!HASHTAG_PATTERN.test(normalizedName)) return null;

  return {
    normalizedName,
    displayName: value,
  };
}

export function normalizeHashtags(rawTags: string[]): NormalizedHashtag[] {
  const seen = new Set<string>();
  const result: NormalizedHashtag[] = [];

  for (const raw of rawTags) {
    const normalized = normalizeHashtag(raw);
    if (!normalized || seen.has(normalized.normalizedName)) continue;
    seen.add(normalized.normalizedName);
    result.push(normalized);
  }

  return result;
}
