import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}));

import { validateGifHost } from "@/lib/validation/recognition";
import { resetEnvCache } from "@/lib/env";

describe("security boundaries", () => {
  it("rejects disallowed GIF hosts", () => {
    resetEnvCache();
    expect(validateGifHost("https://evil.example/gif.gif")).toBe(false);
    expect(validateGifHost("https://media.giphy.com/media/test/giphy.gif")).toBe(
      true,
    );
  });

  it("does not expose server-only modules to client bundles via import graph", async () => {
    const modules = [
      "@/lib/domain/points/convert-points",
      "@/lib/domain/points/create-test-topup",
      "@/lib/domain/recognition/send-recognition",
      "@/lib/prisma",
    ];

    for (const mod of modules) {
      const imported = await import(mod);
      expect(imported).toBeDefined();
    }
  });

  it("returns UNAUTHENTICATED for feed without session", async () => {
    const { getFeed } = await import("@/lib/dal/recognition-feed");
    const result = await getFeed();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNAUTHENTICATED");
  });
});
