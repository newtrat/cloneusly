import { describe, expect, it } from "vitest";

import {
  CURATED_GIFS,
  filterCuratedGifs,
  normalizeGifHost,
} from "@/lib/gif/curated";

describe("normalizeGifHost", () => {
  it("collapses sharded Giphy hosts to the canonical media host", () => {
    expect(
      normalizeGifHost("https://media3.giphy.com/media/abc/giphy.gif"),
    ).toBe("https://media.giphy.com/media/abc/giphy.gif");
    expect(normalizeGifHost("https://media0.giphy.com/media/x/200w.gif")).toBe(
      "https://media.giphy.com/media/x/200w.gif",
    );
  });

  it("collapses sharded Tenor hosts to the canonical media host", () => {
    expect(normalizeGifHost("https://media1.tenor.com/abc/foo.gif")).toBe(
      "https://media.tenor.com/abc/foo.gif",
    );
  });

  it("preserves the query string while rewriting the host", () => {
    expect(
      normalizeGifHost("https://media2.giphy.com/media/x/giphy.gif?cid=abc"),
    ).toBe("https://media.giphy.com/media/x/giphy.gif?cid=abc");
  });

  it("leaves already-canonical and unknown https hosts unchanged", () => {
    expect(normalizeGifHost("https://media.giphy.com/media/x/giphy.gif")).toBe(
      "https://media.giphy.com/media/x/giphy.gif",
    );
    expect(normalizeGifHost("https://example.com/foo.gif")).toBe(
      "https://example.com/foo.gif",
    );
  });

  it("rejects non-https and unparsable URLs", () => {
    expect(normalizeGifHost("http://media.giphy.com/x.gif")).toBeNull();
    expect(normalizeGifHost("not a url")).toBeNull();
  });
});

describe("filterCuratedGifs", () => {
  it("returns the full curated set for an empty query", () => {
    expect(filterCuratedGifs("")).toEqual(CURATED_GIFS);
    expect(filterCuratedGifs("   ")).toEqual(CURATED_GIFS);
  });

  it("filters by title or tag, case-insensitively", () => {
    const results = filterCuratedGifs("THANKS");
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(CURATED_GIFS.length);
  });

  it("falls back to the full set when nothing matches", () => {
    expect(filterCuratedGifs("zzz-no-match")).toEqual(CURATED_GIFS);
  });

  it("only exposes GIFs on the allowlisted Giphy media host over https", () => {
    for (const gif of CURATED_GIFS) {
      const url = new URL(gif.url);
      const preview = new URL(gif.previewUrl);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("media.giphy.com");
      expect(preview.hostname).toBe("media.giphy.com");
    }
  });
});
