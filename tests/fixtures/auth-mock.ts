import { vi } from "vitest";

import type { AuthenticatedUser } from "@/lib/auth/require-user";

let mockedUser: AuthenticatedUser | null = null;

export function mockSessionUser(user: AuthenticatedUser): void {
  mockedUser = user;
}

export function clearSessionUser(): void {
  mockedUser = null;
}

export function getMockedSessionUser(): AuthenticatedUser | null {
  return mockedUser;
}

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => {
        if (!mockedUser) return null;
        return {
          user: {
            id: mockedUser.id,
            email: mockedUser.email,
            name: mockedUser.name,
            image: mockedUser.image,
            handle: mockedUser.handle,
            status: mockedUser.status,
            role: mockedUser.role,
          },
        };
      }),
    },
  },
}));

export function toAuthenticatedUser(input: {
  id: string;
  email: string;
  handle: string;
  name: string;
  role?: "MEMBER" | "TESTER";
}): AuthenticatedUser {
  return {
    id: input.id,
    email: input.email,
    name: input.name,
    image: null,
    handle: input.handle,
    status: "ACTIVE",
    role: input.role ?? "MEMBER",
  };
}
