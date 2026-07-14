import { describe, expect, it } from "vitest";

import { emailDomain, emailHasDomain } from "@/lib/validation/email-domain";

describe("emailDomain", () => {
  it("returns the lowercased domain for valid addresses", () => {
    expect(emailDomain("Alice@TheRealReal.com")).toBe("therealreal.com");
    expect(emailDomain("  bob@therealreal.com  ")).toBe("therealreal.com");
  });

  it("returns null for malformed addresses", () => {
    expect(emailDomain("no-at-sign")).toBeNull();
    expect(emailDomain("two@@therealreal.com")).toBeNull();
    expect(emailDomain("@therealreal.com")).toBeNull();
    expect(emailDomain("alice@")).toBeNull();
    expect(emailDomain("alice@bad domain.com")).toBeNull();
  });
});

describe("emailHasDomain", () => {
  it("accepts only the exact allowed domain, case-insensitively", () => {
    expect(emailHasDomain("alice@therealreal.com", "therealreal.com")).toBe(true);
    expect(emailHasDomain("ALICE@THEREALREAL.COM", "therealreal.com")).toBe(true);
    expect(emailHasDomain("alice@therealreal.com", "@therealreal.com")).toBe(true);
  });

  it("rejects other domains and lookalikes", () => {
    expect(emailHasDomain("alice@gmail.com", "therealreal.com")).toBe(false);
    expect(
      emailHasDomain("alice@evil-therealreal.com", "therealreal.com"),
    ).toBe(false);
    expect(
      emailHasDomain("alice@therealreal.com.evil.com", "therealreal.com"),
    ).toBe(false);
    expect(emailHasDomain("not-an-email", "therealreal.com")).toBe(false);
  });
});
