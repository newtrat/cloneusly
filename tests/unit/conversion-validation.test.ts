import { describe, expect, it } from "vitest";

import { parseConvertReceivedPointsInput } from "@/lib/validation/conversion";

describe("conversion validation", () => {
  it("accepts valid conversion input", () => {
    const result = parseConvertReceivedPointsInput({
      requestId: "req-convert-1",
      amount: 25,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.amount).toBe(25);
    }
  });

  it("rejects non-positive amounts", () => {
    const result = parseConvertReceivedPointsInput({
      requestId: "req-convert-2",
      amount: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects short request IDs", () => {
    const result = parseConvertReceivedPointsInput({
      requestId: "short",
      amount: 10,
    });
    expect(result.ok).toBe(false);
  });
});
