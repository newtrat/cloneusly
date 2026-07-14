import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

const lookupByEmail = vi.fn();

vi.mock("@/lib/slack/client", () => ({
  getSlackClient: () => ({
    users: { lookupByEmail },
  }),
}));

import { setFirstPassword } from "@/lib/domain/auth/set-first-password";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  getTestPrisma,
} from "../fixtures/database";
import { createActiveUser } from "../fixtures/factories";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("setFirstPassword integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    lookupByEmail.mockReset();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("provisions a new user when Slack has a matching workspace member", async () => {
    lookupByEmail.mockResolvedValue({
      ok: true,
      user: {
        id: "U123",
        name: "newperson",
        profile: { real_name: "New Person" },
      },
    });

    const result = await setFirstPassword({
      email: "new.person@test.local",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(true);

    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({
      where: { email: "new.person@test.local" },
    });
    expect(user).not.toBeNull();
    expect(user?.status).toBe("ACTIVE");

    const account = await prisma.account.findFirst({
      where: { userId: user!.id, providerId: "credential" },
    });
    expect(account).not.toBeNull();
  });

  it("rejects an unknown email that doesn't match a Slack workspace member", async () => {
    lookupByEmail.mockResolvedValue({ ok: false });

    const result = await setFirstPassword({
      email: "stranger@outside.example",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
    }

    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({
      where: { email: "stranger@outside.example" },
    });
    expect(user).toBeNull();
  });

  it("rejects an inactive user without provisioning or reactivating them", async () => {
    const user = await createActiveUser({
      email: "offboarded@test.local",
      handle: "offboarded",
      name: "Offboarded Person",
    });
    const prisma = getTestPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "INACTIVE" },
    });

    const result = await setFirstPassword({
      email: "offboarded@test.local",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
    }
    expect(lookupByEmail).not.toHaveBeenCalled();
  });

  it("rejects a user who already has a password set", async () => {
    await createActiveUser({
      email: "already-set@test.local",
      handle: "alreadyset",
      name: "Already Set",
    });

    const result = await setFirstPassword({
      email: "already-set@test.local",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PASSWORD_ALREADY_SET");
    }
  });

  it("sets the password for an existing user with no credential account yet", async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({
      data: {
        email: "provisioned@test.local",
        emailVerified: true,
        name: "Provisioned Person",
        handle: "provisioned",
        status: "ACTIVE",
        role: "MEMBER",
      },
    });
    await prisma.pointAccount.create({
      data: { userId: user.id, givingBalance: 0, receivedBalance: 0 },
    });

    const result = await setFirstPassword({
      email: "provisioned@test.local",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(true);
    expect(lookupByEmail).not.toHaveBeenCalled();

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    expect(account).not.toBeNull();
  });
});
