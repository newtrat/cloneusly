import { describe, expect, it, vi } from "vitest";

import { computeTotalCost, hasDuplicateStrings } from "@/lib/validation/common";
import { normalizeHashtags } from "@/lib/domain/recognition/normalize-hashtags";
import {
  parseSendRecognitionInput,
  validateGifHost,
} from "@/lib/validation/recognition";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    ALLOWED_GIF_HOSTS: ["media.giphy.com", "media.tenor.com"],
  }),
}));

describe("recognition validation", () => {
  it("computes total cost for multiple recipients", () => {
    expect(computeTotalCost(10, 2)).toBe(20);
  });

  it("rejects duplicate recipients", () => {
    expect(hasDuplicateStrings(["a", "b", "a"])).toBe(true);
    const parsed = parseSendRecognitionInput({
      requestId: "req-12345678",
      recipientIds: ["u1", "u1"],
      pointsPerRecipient: 10,
      text: "Great job",
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects total-cost overflow", () => {
    expect(computeTotalCost(Number.MAX_SAFE_INTEGER, 2)).toBeNull();
  });

  it("normalizes and deduplicates hashtags", () => {
    const tags = normalizeHashtags(["#TeamWork", "teamwork", "Kudos"]);
    expect(tags.map((t) => t.normalizedName)).toEqual(["teamwork", "kudos"]);
  });

  it("validates allowed GIF hosts", () => {
    expect(
      validateGifHost("https://media.giphy.com/media/abc/giphy.gif"),
    ).toBe(true);
    expect(validateGifHost("https://evil.example/gif.gif")).toBe(false);
    expect(validateGifHost("http://media.giphy.com/gif.gif")).toBe(false);
  });

  it("accepts valid recognition input", () => {
    const parsed = parseSendRecognitionInput({
      requestId: "req-12345678",
      recipientIds: ["u1", "u2"],
      pointsPerRecipient: 10,
      text: "Thanks!",
      hashtags: ["#teamwork"],
    });
    expect(parsed.ok).toBe(true);
  });
});
