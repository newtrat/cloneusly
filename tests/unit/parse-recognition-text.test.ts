import { describe, expect, it } from "vitest";

import { parseRecognitionText } from "@/lib/recognition/parse-recognition-text";

describe("parseRecognitionText", () => {
  describe("handles", () => {
    it("extracts a single @handle", () => {
      const result = parseRecognitionText("@alice great work");
      expect(result.handles).toEqual(["alice"]);
    });

    it("extracts multiple @handles", () => {
      const result = parseRecognitionText("@alice and @bob.smith did great");
      expect(result.handles).toEqual(["alice", "bob.smith"]);
    });

    it("returns empty array when no @handles present", () => {
      const result = parseRecognitionText("great job everyone +10");
      expect(result.handles).toEqual([]);
    });

    it("handles @handles with dots", () => {
      const result = parseRecognitionText("@venkata.pallepu was amazing");
      expect(result.handles).toEqual(["venkata.pallepu"]);
    });
  });

  describe("points", () => {
    it("extracts +N as points", () => {
      const result = parseRecognitionText("@alice +100 great job");
      expect(result.points).toBe(100);
    });

    it("returns null when no +N present", () => {
      const result = parseRecognitionText("@alice great job");
      expect(result.points).toBeNull();
    });

    it("extracts the first +N when multiple are present", () => {
      const result = parseRecognitionText("+10 and +20 here");
      expect(result.points).toBe(10);
    });

    it("handles +N at the end of the message", () => {
      const result = parseRecognitionText("@alice great work +50");
      expect(result.points).toBe(50);
    });
  });

  describe("hashtags", () => {
    it("extracts a single hashtag", () => {
      const result = parseRecognitionText("great work #teamwork");
      expect(result.hashtags).toEqual(["teamwork"]);
    });

    it("extracts multiple hashtags", () => {
      const result = parseRecognitionText("@alice +10 nice #trr_smarts #trr_resilience");
      expect(result.hashtags).toEqual(["trr_smarts", "trr_resilience"]);
    });

    it("returns empty array when no hashtags present", () => {
      const result = parseRecognitionText("@alice +10 great job");
      expect(result.hashtags).toEqual([]);
    });
  });

  describe("messageText", () => {
    it("strips @handles, +points, and #hashtags leaving prose", () => {
      const result = parseRecognitionText(
        "@alice for being an amazing resource +100 #teamwork",
      );
      expect(result.messageText).toBe("for being an amazing resource");
    });

    it("returns empty string when only tokens are present", () => {
      const result = parseRecognitionText("@alice +10 #kudos");
      expect(result.messageText).toBe("");
    });

    it("collapses extra whitespace left by removed tokens", () => {
      const result = parseRecognitionText("@alice   +10   great   job");
      expect(result.messageText).toBe("great job");
    });

    it("returns empty string for empty input", () => {
      const result = parseRecognitionText("");
      expect(result.messageText).toBe("");
    });
  });

  describe("real-world examples", () => {
    it("parses a full recognition message", () => {
      const result = parseRecognitionText(
        "@venkata.pallepu for continuing to be an amazing resource in getting our new Shipping Service deployed! +100 #trr_smarts #trr_resilience",
      );
      expect(result.handles).toEqual(["venkata.pallepu"]);
      expect(result.points).toBe(100);
      expect(result.hashtags).toEqual(["trr_smarts", "trr_resilience"]);
      expect(result.messageText).toBe(
        "for continuing to be an amazing resource in getting our new Shipping Service deployed!",
      );
    });

    it("parses multi-recipient recognition", () => {
      const result = parseRecognitionText(
        "@kimberly.highsmith @stephanie.correa +25 Awesome job in June! #trr_resilience",
      );
      expect(result.handles).toEqual(["kimberly.highsmith", "stephanie.correa"]);
      expect(result.points).toBe(25);
      expect(result.hashtags).toEqual(["trr_resilience"]);
      expect(result.messageText).toBe("Awesome job in June!");
    });
  });
});
