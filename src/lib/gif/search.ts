import "server-only";

import { getEnv } from "@/lib/env";
import {
  filterCuratedGifs,
  normalizeGifHost,
  type GifResult,
} from "@/lib/gif/curated";

const GIPHY_ENDPOINT = "https://api.giphy.com/v1/gifs";
const REQUEST_TIMEOUT_MS = 5000;

type GiphyImage = { url?: unknown };
type GiphyItem = {
  id?: unknown;
  title?: unknown;
  images?: {
    original?: GiphyImage;
    fixed_height?: GiphyImage;
    fixed_height_small?: GiphyImage;
  };
};

function pickUrl(image: GiphyImage | undefined): string | null {
  return typeof image?.url === "string" ? image.url : null;
}

function mapGiphyItem(item: GiphyItem): GifResult | null {
  const images = item.images ?? {};
  const fullSource = pickUrl(images.original) ?? pickUrl(images.fixed_height);
  if (!fullSource) return null;

  const url = normalizeGifHost(fullSource);
  if (!url) return null;

  const previewSource =
    pickUrl(images.fixed_height_small) ?? pickUrl(images.fixed_height);
  const previewUrl =
    (previewSource ? normalizeGifHost(previewSource) : null) ?? url;

  return {
    id: typeof item.id === "string" ? item.id : url,
    url,
    previewUrl,
    title: typeof item.title === "string" && item.title ? item.title : "GIF",
  };
}

/**
 * Returns GIF results for the picker. Uses the Giphy API when GIPHY_API_KEY is
 * configured, otherwise (or on any failure) returns a curated fallback set so
 * the feature works without external credentials. Every returned URL is
 * normalized to a host on the GIF allowlist.
 */
export async function searchGifs(
  query: string,
  limit = 18,
): Promise<GifResult[]> {
  const trimmed = query.trim();
  const apiKey = getEnv().GIPHY_API_KEY;

  if (!apiKey) {
    return filterCuratedGifs(trimmed);
  }

  try {
    const isSearch = trimmed.length > 0;
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      rating: "g",
      bundle: "fixed_height",
    });
    if (isSearch) params.set("q", trimmed);

    const response = await fetch(
      `${GIPHY_ENDPOINT}/${isSearch ? "search" : "trending"}?${params.toString()}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    if (!response.ok) return filterCuratedGifs(trimmed);

    const payload: unknown = await response.json();
    const data =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: unknown }).data
        : null;
    if (!Array.isArray(data)) return filterCuratedGifs(trimmed);

    const results = data
      .map((item) => mapGiphyItem(item as GiphyItem))
      .filter((gif): gif is GifResult => gif !== null);

    return results.length > 0 ? results : filterCuratedGifs(trimmed);
  } catch {
    return filterCuratedGifs(trimmed);
  }
}
