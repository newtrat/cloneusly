export type GifResult = {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
};

const GIPHY_MEDIA_HOST = "media.giphy.com";
const GIPHY_MEDIA_HOST_PATTERN = /^media\d*\.giphy\.com$/i;
const TENOR_MEDIA_HOST = "media.tenor.com";
const TENOR_MEDIA_HOST_PATTERN = /^media\d*\.tenor\.com$/i;

/**
 * Giphy/Tenor CDNs shard media across numbered subdomains (media0-4). The GIF
 * host allowlist only trusts the canonical `media.giphy.com`/`media.tenor.com`
 * hosts, and those aliases serve the same object paths, so collapse any sharded
 * host back to the canonical one. Returns null for URLs we cannot parse.
 */
export function normalizeGifHost(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (GIPHY_MEDIA_HOST_PATTERN.test(url.hostname)) {
      url.hostname = GIPHY_MEDIA_HOST;
    } else if (TENOR_MEDIA_HOST_PATTERN.test(url.hostname)) {
      url.hostname = TENOR_MEDIA_HOST;
    }
    return url.toString();
  } catch {
    return null;
  }
}

const GIPHY_ID_PATTERN = /^[A-Za-z0-9]{5,}$/;

/**
 * Extracts a Giphy GIF id from any Giphy URL shape:
 * - detail/share links: `/gifs/<slug>-<id>`, `/stickers/<slug>-<id>`, `/clips/...-<id>`
 * - embeds: `/embed/<id>`
 * - media assets: `/media/<id>/giphy.gif` or `/media/v1.<cid>/<id>/200.webp`
 * - short image hosts: `i.giphy.com/<id>.gif`
 */
function extractGiphyId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];

  const mediaIdx = segments.indexOf("media");
  if (mediaIdx !== -1 && segments.length > mediaIdx + 1) {
    if (last.includes(".") && segments.length >= 2) {
      const candidate = segments[segments.length - 2];
      if (candidate && !candidate.startsWith("v1.")) return candidate;
    }
    const afterMedia = segments[mediaIdx + 1];
    if (afterMedia && !afterMedia.startsWith("v1.")) return afterMedia;
    if (segments.length > mediaIdx + 2) return segments[mediaIdx + 2];
  }

  const embedIdx = segments.indexOf("embed");
  if (embedIdx !== -1 && segments[embedIdx + 1]) return segments[embedIdx + 1];

  if (
    segments.includes("gifs") ||
    segments.includes("stickers") ||
    segments.includes("clips")
  ) {
    const dashIdx = last.lastIndexOf("-");
    const id = dashIdx >= 0 ? last.slice(dashIdx + 1) : last;
    if (GIPHY_ID_PATTERN.test(id)) return id;
  }

  if (url.hostname.startsWith("i.") && last.includes(".")) {
    const id = last.split(".")[0];
    if (GIPHY_ID_PATTERN.test(id)) return id;
  }

  return null;
}

/**
 * Resolves a raw URL (e.g. from a drag-and-drop or a pasted link) into a GIF URL
 * on the allowlisted media host. Giphy links of any shape are rebuilt into the
 * canonical `media.giphy.com/media/<id>/giphy.gif`; other hosts fall back to
 * host normalization. Returns null for URLs we cannot use (e.g. `data:`).
 */
export function resolveGifUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (host === "giphy.com" || host.endsWith(".giphy.com")) {
    const id = extractGiphyId(url);
    if (id) {
      return `https://${GIPHY_MEDIA_HOST}/media/${id}/giphy.gif`;
    }
  }

  return normalizeGifHost(rawUrl);
}

function giphy(id: string): Pick<GifResult, "url" | "previewUrl"> {
  return {
    url: `https://${GIPHY_MEDIA_HOST}/media/${id}/giphy.gif`,
    previewUrl: `https://${GIPHY_MEDIA_HOST}/media/${id}/200w.gif`,
  };
}

type CuratedEntry = { id: string; title: string; tags: string[] };

const CURATED_ENTRIES: CuratedEntry[] = [
  { id: "l3q2K5jinAlChoCLS", title: "Thank you", tags: ["thanks", "thank you", "grateful", "kudos"] },
  { id: "3o7abKhOpu0NwenH3O", title: "Great job", tags: ["good job", "great", "awesome", "kudos", "well done"] },
  { id: "26u4cqiYI30juCOGY", title: "High five", tags: ["highfive", "high five", "teamwork", "nice"] },
  { id: "111ebonMs90YLu", title: "Clapping", tags: ["clap", "applause", "bravo", "congrats"] },
  { id: "3oz8xAFtqoOUUrsh7W", title: "Celebrate", tags: ["celebrate", "party", "congrats", "yay"] },
  { id: "l0MYt5jPR6QX5pnqM", title: "You rock", tags: ["awesome", "rock", "amazing", "kudos"] },
  { id: "26tPplGWjN0xLybiU", title: "Mind blown", tags: ["wow", "amazing", "mind blown", "impressive"] },
  { id: "3o6Zt6ML6BklcajjsA", title: "Party time", tags: ["party", "celebrate", "yay", "fun"] },
  { id: "g9582DNuQppxC", title: "Thumbs up", tags: ["thumbs up", "nice", "good", "approve"] },
  { id: "3oEjHAUOqG3lSS0f1C", title: "Excellent", tags: ["excellent", "great", "awesome", "kudos"] },
  { id: "26FPqAHtgCBzKG9mo", title: "Congrats", tags: ["congrats", "congratulations", "celebrate", "well done"] },
  { id: "l4FGuhL4U2WyjdkaY", title: "Love it", tags: ["love", "heart", "appreciate", "thanks"] },
];

export const CURATED_GIFS: GifResult[] = CURATED_ENTRIES.map((entry) => ({
  id: entry.id,
  title: entry.title,
  ...giphy(entry.id),
}));

const CURATED_SEARCH_INDEX: { gif: GifResult; haystack: string }[] =
  CURATED_ENTRIES.map((entry) => ({
    gif: {
      id: entry.id,
      title: entry.title,
      ...giphy(entry.id),
    },
    haystack: [entry.title, ...entry.tags].join(" ").toLowerCase(),
  }));

/**
 * Filters the curated set by a free-text query. Falls back to the full set when
 * the query is empty or matches nothing so the picker grid is never empty.
 */
export function filterCuratedGifs(query: string): GifResult[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return CURATED_GIFS;

  const terms = normalized.split(/\s+/).filter(Boolean);
  const matches = CURATED_SEARCH_INDEX.filter(({ haystack }) =>
    terms.some((term) => haystack.includes(term)),
  ).map(({ gif }) => gif);

  return matches.length > 0 ? matches : CURATED_GIFS;
}
