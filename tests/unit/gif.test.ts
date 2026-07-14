import { describe, expect, it } from "vitest";

import {
  CURATED_GIFS,
  filterCuratedGifs,
  normalizeGifHost,
  resolveGifUrl,
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

describe("resolveGifUrl", () => {
  const canonical = (id: string) =>
    `https://media.giphy.com/media/${id}/giphy.gif`;

  it("rebuilds canonical media URL from a Giphy share link with a slug", () => {
    expect(
      resolveGifUrl("https://giphy.com/gifs/love-so-much-UWKe32vmKXLtDEdPmZ"),
    ).toBe(canonical("UWKe32vmKXLtDEdPmZ"));
  });

  it("rebuilds canonical media URL from a slugless Giphy share link", () => {
    expect(resolveGifUrl("https://giphy.com/gifs/IcGkqdUmYLFGE")).toBe(
      canonical("IcGkqdUmYLFGE"),
    );
  });

  it("rebuilds canonical media URL from a sharded media asset (v1 cid + webp)", () => {
    expect(
      resolveGifUrl(
        "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/IcGkqdUmYLFGE/200.webp",
      ),
    ).toBe(canonical("IcGkqdUmYLFGE"));
  });

  it("rebuilds canonical media URL from a plain media asset", () => {
    expect(
      resolveGifUrl("https://media3.giphy.com/media/abc123def/giphy.gif"),
    ).toBe(canonical("abc123def"));
  });

  it("rebuilds canonical media URL from a Giphy embed link", () => {
    expect(resolveGifUrl("https://giphy.com/embed/IcGkqdUmYLFGE")).toBe(
      canonical("IcGkqdUmYLFGE"),
    );
  });

  it("normalizes Tenor media hosts without a Giphy rebuild", () => {
    expect(resolveGifUrl("https://media1.tenor.com/abc/foo.gif")).toBe(
      "https://media.tenor.com/abc/foo.gif",
    );
  });

  it("rejects data: URLs and non-https input", () => {
    expect(
      resolveGifUrl("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5"),
    ).toBeNull();
    expect(resolveGifUrl("not a url")).toBeNull();
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
