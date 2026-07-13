import { describe, expect, it } from "vitest";

import { parseCreateTestTopUpInput } from "@/lib/validation/topup";

describe("test top-up validation", () => {
  it("accepts valid top-up amounts within limit", () => {
    const result = parseCreateTestTopUpInput(
      { requestId: "req-topup-1", amount: 100 },
      1000,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects amounts above configured maximum", () => {
    const result = parseCreateTestTopUpInput(
      { requestId: "req-topup-2", amount: 2000 },
      1000,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects invalid request IDs", () => {
    const result = parseCreateTestTopUpInput(
      { requestId: "tiny", amount: 50 },
      1000,
    );
    expect(result.ok).toBe(false);
  });
});
