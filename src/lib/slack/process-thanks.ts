import "server-only";

import type { AuthenticatedUser } from "@/lib/auth/require-user";
import {
  sendRecognitionForUser,
  type SendRecognitionData,
} from "@/lib/domain/recognition/send-recognition";
import type { CommandResult } from "@/lib/domain/result";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { ParsedThanksCommand } from "@/lib/slack/parse-thanks";
import {
  resolveRecipientRefs,
  resolveSlackUserById,
} from "@/lib/slack/resolve-user";

export type ProcessThanksResult =
  | {
      ok: true;
      data: SendRecognitionData;
      sender: AuthenticatedUser;
      recipients: AuthenticatedUser[];
      message: string;
    }
  | { ok: false; message: string };

export async function processThanks(params: {
  senderSlackId: string;
  parsed: ParsedThanksCommand;
  requestId: string;
}): Promise<ProcessThanksResult> {
  const senderResult = await resolveSlackUserById(params.senderSlackId);
  if (!senderResult.ok) {
    return { ok: false, message: senderResult.reason };
  }

  const senderHasActivatedAccount = await prisma.account.findFirst({
    where: { userId: senderResult.user.id, providerId: "credential" },
    select: { id: true },
  });
  if (!senderHasActivatedAccount) {
    const appUrl = getEnv().BETTER_AUTH_URL ?? "https://cloneusly.vercel.app";
    const setPasswordUrl = `${appUrl}/first-access?email=${encodeURIComponent(senderResult.user.email)}`;
    return {
      ok: false,
      message: `You need to activate your Cloneusly account before giving points. Set your password here: ${setPasswordUrl}`,
    };
  }

  const { resolved, failures } = await resolveRecipientRefs(
    params.parsed.recipients,
  );

  if (failures.length > 0) {
    return {
      ok: false,
      message: failures.map((f) => f.reason).join("\n"),
    };
  }

  if (resolved.length === 0) {
    return { ok: false, message: "No valid recipients found." };
  }

  const recipientIds = resolved.map((r) => r.user.id);
  const result: CommandResult<SendRecognitionData> =
    await sendRecognitionForUser(senderResult.user, {
      requestId: params.requestId,
      recipientIds,
      pointsPerRecipient: params.parsed.pointsPerRecipient,
      text: params.parsed.text,
      hashtags: params.parsed.hashtags,
    });

  if (!result.ok) {
    return {
      ok: false,
      message: formatDomainError(result.error.message, result.error.fieldErrors),
    };
  }

  const recipientHandles = resolved
    .map((r) => `@${r.user.handle}`)
    .join(", ");
  const points = params.parsed.pointsPerRecipient;
  const message = `Sent ${points} point${points === 1 ? "" : "s"} each to ${recipientHandles}. Remaining giving balance: ${result.data.givingBalance}.`;

  return {
    ok: true,
    data: result.data,
    sender: senderResult.user,
    recipients: resolved.map((r) => r.user),
    message,
  };
}

function formatDomainError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): string {
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return message;
  }
  const details = Object.entries(fieldErrors)
    .flatMap(([field, errors]) => errors.map((e) => `${field}: ${e}`))
    .join("; ");
  return `${message} ${details}`.trim();
}
