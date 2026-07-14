import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/lib/auth/require-user";
import { logOperation } from "@/lib/domain/logger";
import { getCompanyLocalGrantMonth } from "@/lib/domain/points/grant-month";
import { grantUserMonthlyAllowance } from "@/lib/domain/points/reconcile-monthly-grants";
import { prisma } from "@/lib/prisma";
import { getSlackClient } from "@/lib/slack/client";

export type SlackProfileLike = {
  id?: string;
  name?: string;
  deleted?: boolean;
  is_bot?: boolean;
  profile?: {
    email?: string;
    display_name?: string;
    display_name_normalized?: string;
    real_name?: string;
    real_name_normalized?: string;
  };
};

export async function findUserByEmailAnyStatus(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
}

export async function generateUniqueHandle(seed: string): Promise<string> {
  const base =
    seed
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 32) || "user";
  const padded = base.length < 2 ? `${base}xx`.slice(0, 2) : base;

  let candidate = padded;
  let suffix = 2;
  while (
    await prisma.user.findFirst({
      where: { handle: { equals: candidate, mode: "insensitive" } },
      select: { id: true },
    })
  ) {
    const suffixStr = `-${suffix}`;
    candidate = `${padded.slice(0, 32 - suffixStr.length)}${suffixStr}`;
    suffix += 1;
  }

  return candidate;
}

/**
 * Best-effort Slack profile lookup by email, for entry points (e.g. the web
 * first-access flow) that don't already have a Slack user object in hand.
 * Returns null if Slack isn't configured, the lookup fails, or no workspace
 * member matches — callers should fall back to email-derived defaults.
 */
export async function fetchSlackProfileByEmail(
  email: string,
): Promise<SlackProfileLike | null> {
  try {
    const client = getSlackClient();
    const result = await client.users.lookupByEmail({ email });
    if (!result.ok || !result.user) return null;
    return result.user;
  } catch {
    return null;
  }
}

export async function provisionUserFromSlackProfile(
  slackProfile: SlackProfileLike,
  email: string,
): Promise<AuthenticatedUser> {
  const name =
    slackProfile.profile?.real_name?.trim() ||
    slackProfile.profile?.display_name?.trim() ||
    email;
  const handle = await generateUniqueHandle(
    slackProfile.name ?? email.split("@")[0],
  );

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, handle, status: "ACTIVE", role: "MEMBER" },
      });
      await tx.pointAccount.create({
        data: { userId: user.id, givingBalance: 0, receivedBalance: 0 },
      });
      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Concurrent provisioning attempts can race on the same brand-new email.
      const winner = await findUserByEmailAnyStatus(email);
      if (winner) return toAuthenticatedUser(winner);
    }
    throw error;
  }

  try {
    await grantUserMonthlyAllowance(created.id, getCompanyLocalGrantMonth());
  } catch (error) {
    // Don't block account creation on a grant hiccup; the daily cron will
    // pick it up as a normal reconciliation pass.
    logOperation("error", "Failed to grant first-month allowance to new user", {
      operation: "provisionUserFromSlackProfile",
      userId: created.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return toAuthenticatedUser(created);
}

export function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string;
  image: string | null;
  handle: string;
  status: "ACTIVE" | "INACTIVE";
  role: "MEMBER" | "TESTER";
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    handle: user.handle,
    status: user.status,
    role: user.role,
  };
}
