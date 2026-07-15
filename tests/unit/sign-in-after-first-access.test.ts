import { describe, expect, it, vi } from "vitest";

import {
  AUTO_SIGN_IN_FAILED_MESSAGE,
  signInAfterFirstAccess,
} from "@/lib/auth/sign-in-after-first-access";

const credentials = {
  email: "ada@example.com",
  password: "secure-pass",
};

describe("signInAfterFirstAccess", () => {
  it("returns signed-in when Better Auth accepts credentials", async () => {
    const signInEmail = vi.fn().mockResolvedValue({ error: null });

    await expect(
      signInAfterFirstAccess(signInEmail, credentials),
    ).resolves.toBe("signed-in");

    expect(signInEmail).toHaveBeenCalledWith(credentials);
  });

  it("returns sign-in-failed when Better Auth returns an error", async () => {
    const signInEmail = vi
      .fn()
      .mockResolvedValue({ error: { message: "Invalid credentials" } });

    await expect(
      signInAfterFirstAccess(signInEmail, credentials),
    ).resolves.toBe("sign-in-failed");
  });

  it("returns sign-in-failed when the sign-in call throws", async () => {
    const signInEmail = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      signInAfterFirstAccess(signInEmail, credentials),
    ).resolves.toBe("sign-in-failed");
  });

  it("exposes a user-facing message for the failed outcome", () => {
    expect(AUTO_SIGN_IN_FAILED_MESSAGE).toMatch(/couldn't sign you in/i);
  });
});
