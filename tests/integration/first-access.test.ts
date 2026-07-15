import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

const lookupByEmail = vi.fn();

vi.mock("@/lib/slack/client", () => ({
  getSlackClient: () => ({
    users: { lookupByEmail },
  }),
}));

import { storeVerificationCode } from "@/lib/domain/auth/first-access-code";
import { setFirstPassword } from "@/lib/domain/auth/set-first-password";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  getTestPrisma,
} from "../fixtures/database";
import { createActiveUser } from "../fixtures/factories";

const hasDatabase = Boolean(getTestDatabaseUrl());

const CODE = "123456";

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

    const email = "new.person@therealreal.com";
    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
      password: "a-strong-password",
    });

    expect(result.ok).toBe(true);

    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.status).toBe("ACTIVE");

    const account = await prisma.account.findFirst({
      where: { userId: user!.id, providerId: "credential" },
    });
    expect(account).not.toBeNull();
  });

  it("rejects a non-company email domain", async () => {
    const email = "stranger@gmail.com";
    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMAIL_DOMAIN_NOT_ALLOWED");
    }
    expect(lookupByEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired verification code", async () => {
    lookupByEmail.mockResolvedValue({ ok: false });

    const result = await setFirstPassword({
      email: "no.code@therealreal.com",
      code: "000000",
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_OR_EXPIRED_CODE");
    }
  });

  it("rejects an unknown email that doesn't match a Slack workspace member", async () => {
    lookupByEmail.mockResolvedValue({ ok: false });

    const email = "stranger@therealreal.com";
    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
    }

    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });

  it("rejects an inactive user without provisioning or reactivating them", async () => {
    const email = "offboarded@therealreal.com";
    const user = await createActiveUser({
      email,
      handle: "offboarded",
      name: "Offboarded Person",
    });
    const prisma = getTestPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "INACTIVE" },
    });

    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
      password: "a-strong-password",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
    }
    expect(lookupByEmail).not.toHaveBeenCalled();
  });

  it("resets the password for a user who already has one", async () => {
    const email = "already-set@therealreal.com";
    const user = await createActiveUser({
      email,
      handle: "alreadyset",
      name: "Already Set",
    });
    const prisma = getTestPrisma();
    const before = await prisma.account.findFirstOrThrow({
      where: { userId: user.id, providerId: "credential" },
      select: { id: true, password: true },
    });

    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
      password: "a-brand-new-password",
    });

    expect(result.ok).toBe(true);

    // The credential is updated in place (same row, new hash), not duplicated.
    const after = await prisma.account.findMany({
      where: { userId: user.id, providerId: "credential" },
      select: { id: true, password: true },
    });
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(after[0].password).not.toBe(before.password);
  });

  it("sets the password for an existing user with no credential account yet", async () => {
    const email = "provisioned@therealreal.com";
    const prisma = getTestPrisma();
    const user = await prisma.user.create({
      data: {
        email,
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

    await storeVerificationCode(email, CODE);
    const result = await setFirstPassword({
      email,
      code: CODE,
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
