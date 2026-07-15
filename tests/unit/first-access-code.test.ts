import { describe, expect, it } from "vitest";

import {
  codesMatch,
  generateVerificationCode,
  hashVerificationCode,
} from "@/lib/domain/auth/first-access-code";

const SECRET = "test-secret-value-at-least-32-chars-long!!";

describe("generateVerificationCode", () => {
  it("produces a zero-padded 6-digit numeric code", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashVerificationCode", () => {
  it("is deterministic for the same code + secret", () => {
    expect(hashVerificationCode("123456", SECRET)).toBe(
      hashVerificationCode("123456", SECRET),
    );
  });

  it("differs for different codes and does not expose the code", () => {
    const hashed = hashVerificationCode("123456", SECRET);
    expect(hashed).not.toBe(hashVerificationCode("654321", SECRET));
    expect(hashed).not.toContain("123456");
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the secret differs", () => {
    expect(hashVerificationCode("123456", SECRET)).not.toBe(
      hashVerificationCode("123456", "another-secret-value-32-chars-min!!"),
    );
  });
});

describe("codesMatch", () => {
  it("matches identical strings and rejects mismatches or length diffs", () => {
    expect(codesMatch("abc", "abc")).toBe(true);
    expect(codesMatch("abc", "abd")).toBe(false);
    expect(codesMatch("abc", "abcd")).toBe(false);
  });
});
