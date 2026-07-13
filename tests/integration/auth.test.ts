import { describe, expect, it, vi } from "vitest";

import { toSafeUserView, toUserSummary } from "@/lib/dal/current-user";

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

describe("auth guards", () => {
  it("maps user records to safe view models without extra fields", () => {
    const summary = toUserSummary({
      id: "user-1",
      handle: "alice",
      name: "Alice",
      image: null,
      role: "MEMBER",
    });

    expect(summary).toEqual({
      id: "user-1",
      handle: "alice",
      name: "Alice",
      image: null,
    });
    expect(summary).not.toHaveProperty("email");
    expect(summary).not.toHaveProperty("role");
  });

  it("toSafeUserView matches toUserSummary", () => {
    const user = {
      id: "user-2",
      handle: "bob",
      name: "Bob",
      image: "https://example.com/a.png",
      role: "TESTER" as const,
    };
    expect(toSafeUserView(user)).toEqual(toUserSummary(user));
  });
});

describe("requireActiveUser", () => {
  it("returns UNAUTHENTICATED without a session", async () => {
    const { requireActiveUser } = await import("@/lib/auth/require-user");
    const result = await requireActiveUser();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });
});
