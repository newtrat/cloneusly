import { describe, expect, it } from "vitest";

import {
  createFirstAccessToken,
  verifyFirstAccessToken,
} from "@/lib/domain/auth/first-access-token";

const SECRET = "test-secret-value-at-least-32-chars-long!!";

describe("first-access token", () => {
  it("round-trips a valid token and returns the email", () => {
    const now = 1_000_000;
    const token = createFirstAccessToken("Alice@TheRealReal.com", {
      secret: SECRET,
      now,
      ttlMs: 60_000,
    });
    const result = verifyFirstAccessToken(token, {
      secret: SECRET,
      now: now + 30_000,
    });
    expect(result).toEqual({ email: "alice@therealreal.com" });
  });

  it("rejects an expired token", () => {
    const now = 1_000_000;
    const token = createFirstAccessToken("alice@therealreal.com", {
      secret: SECRET,
      now,
      ttlMs: 60_000,
    });
    expect(
      verifyFirstAccessToken(token, { secret: SECRET, now: now + 60_001 }),
    ).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createFirstAccessToken("alice@therealreal.com", {
      secret: SECRET,
      now: 1_000_000,
      ttlMs: 60_000,
    });
    expect(
      verifyFirstAccessToken(token, {
        secret: "another-secret-value-at-least-32-chars!!",
        now: 1_000_000,
      }),
    ).toBeNull();
  });

  it("rejects tampered payloads and malformed tokens", () => {
    const token = createFirstAccessToken("alice@therealreal.com", {
      secret: SECRET,
      now: 1_000_000,
      ttlMs: 60_000,
    });
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ p: "first-access", e: "attacker@therealreal.com", x: 9_999_999_999_999 }),
      "utf8",
    ).toString("base64url");
    const forged = `${forgedPayload}.${signature}`;

    expect(verifyFirstAccessToken(forged, { secret: SECRET, now: 1_000_000 })).toBeNull();
    expect(verifyFirstAccessToken("garbage", { secret: SECRET })).toBeNull();
    expect(verifyFirstAccessToken("a.b.c", { secret: SECRET })).toBeNull();
  });
});
