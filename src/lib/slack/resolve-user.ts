import "server-only";

import type { AuthenticatedUser } from "@/lib/auth/require-user";
import type { RecipientRef } from "@/lib/slack/parse-thanks";
import { getSlackClient } from "@/lib/slack/client";
import { prisma } from "@/lib/prisma";

export type ResolveSlackUserResult =
  | { ok: true; user: AuthenticatedUser; label: string }
  | { ok: false; label: string; reason: string };

export async function resolveSlackUserById(
  slackUserId: string,
): Promise<ResolveSlackUserResult> {
  const client = getSlackClient();
  const info = await client.users.info({ user: slackUserId });

  if (!info.ok || !info.user) {
    return {
      ok: false,
      label: slackUserId,
      reason: `Could not look up Slack user ${slackUserId}.`,
    };
  }

  return mapSlackUserToCloneusly(info.user, `<@${slackUserId}>`);
}

export async function resolveRecipientRef(
  ref: RecipientRef,
): Promise<ResolveSlackUserResult> {
  if (ref.kind === "slack_id") {
    return resolveSlackUserById(ref.value);
  }

  const byHandle = await findActiveUserByHandle(ref.value);
  if (byHandle) {
    return { ok: true, user: byHandle, label: `@${ref.value}` };
  }

  const slackUser = await findSlackUserByName(ref.value);
  if (!slackUser) {
    return {
      ok: false,
      label: `@${ref.value}`,
      reason: `Could not find \`@${ref.value}\` in Slack or as a Cloneusly handle. Try Slack’s @ autocomplete so the mention is linked.`,
    };
  }

  return mapSlackUserToCloneusly(slackUser, `@${ref.value}`);
}

export async function resolveRecipientRefs(refs: RecipientRef[]): Promise<{
  resolved: Array<{ label: string; user: AuthenticatedUser }>;
  failures: Array<{ label: string; reason: string }>;
}> {
  const results = await Promise.all(refs.map(resolveRecipientRef));
  const resolved: Array<{ label: string; user: AuthenticatedUser }> = [];
  const failures: Array<{ label: string; reason: string }> = [];
  const seenUserIds = new Set<string>();

  for (const result of results) {
    if (!result.ok) {
      failures.push({ label: result.label, reason: result.reason });
      continue;
    }
    if (seenUserIds.has(result.user.id)) continue;
    seenUserIds.add(result.user.id);
    resolved.push({ label: result.label, user: result.user });
  }

  return { resolved, failures };
}

/** @deprecated Use resolveSlackUserById */
export async function resolveSlackUser(slackUserId: string) {
  const result = await resolveSlackUserById(slackUserId);
  if (result.ok) {
    return { ok: true as const, user: result.user, slackUserId };
  }
  return { ok: false as const, slackUserId, reason: result.reason };
}

/** @deprecated Use resolveRecipientRefs */
export async function resolveSlackUsers(slackUserIds: string[]) {
  const { resolved, failures } = await resolveRecipientRefs(
    slackUserIds.map((value) => ({ kind: "slack_id" as const, value })),
  );
  return {
    resolved: resolved.map((r) => ({
      slackUserId: r.label,
      user: r.user,
    })),
    failures: failures.map((f) => ({
      slackUserId: f.label,
      reason: f.reason,
    })),
  };
}

async function findActiveUserByHandle(
  handle: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      handle: { equals: handle, mode: "insensitive" },
      status: "ACTIVE",
    },
  });
  return user ? toAuthenticatedUser(user) : null;
}

async function findActiveUserByEmail(
  email: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      status: "ACTIVE",
    },
  });
  return user ? toAuthenticatedUser(user) : null;
}

type SlackUserLike = {
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

async function mapSlackUserToCloneusly(
  slackUser: SlackUserLike,
  label: string,
): Promise<ResolveSlackUserResult> {
  const slackUserId = slackUser.id ?? label;

  if (
    slackUser.deleted ||
    slackUser.is_bot ||
    slackUser.id === "USLACKBOT"
  ) {
    return {
      ok: false,
      label,
      reason: `Slack user ${label} is not a recognizable workspace member.`,
    };
  }

  const email = slackUser.profile?.email?.trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      label,
      reason: `No email on Slack profile for ${label}. Ensure the bot has users:read.email.`,
    };
  }

  const user = await findActiveUserByEmail(email);
  if (!user) {
    return {
      ok: false,
      label,
      reason: `No active Cloneusly account for ${email} (${label}).`,
    };
  }

  return { ok: true, user, label };
}

async function findSlackUserByName(
  handle: string,
): Promise<SlackUserLike | null> {
  const client = getSlackClient();
  const needle = handle.toLowerCase();
  let cursor: string | undefined;

  do {
    const page = await client.users.list({
      limit: 200,
      cursor,
    });
    if (!page.ok || !page.members) return null;

    for (const member of page.members) {
      if (member.deleted || member.is_bot || member.id === "USLACKBOT") {
        continue;
      }
      const candidates = [
        member.name,
        member.profile?.display_name,
        member.profile?.display_name_normalized,
        member.profile?.real_name,
        member.profile?.real_name_normalized,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      if (candidates.includes(needle)) {
        return member;
      }
    }

    cursor = page.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return null;
}

function toAuthenticatedUser(user: {
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
