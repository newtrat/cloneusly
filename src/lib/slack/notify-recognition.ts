import "server-only";

import type { KnownBlock } from "@slack/web-api";

import { logOperation } from "@/lib/domain/logger";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSlackClient } from "@/lib/slack/client";
import { formatRecognitionDM } from "@/lib/slack/format-recognition-message";

export type NotifyRecognitionRecipientsInput = {
  senderName: string;
  pointsPerRecipient: number;
  recognitionText: string | null | undefined;
  gifUrl?: string | null;
  recognitionId: string;
  recipientIds: string[];
  correlationId?: string;
};

// Slack platform error shape emitted by @slack/web-api for `ok: false` responses.
// We only need to read `.data.error`; everything else is opaque.
function slackPlatformError(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const inner = (data as { error?: unknown }).error;
      if (typeof inner === "string") return inner;
    }
  }
  return null;
}

function feedUrl(): string | null {
  const base = getEnv().BETTER_AUTH_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/feed`;
}

/**
 * DM every recipient of a recognition on Slack. Awaited by the caller but
 * fully error-swallowing: a Slack outage, a missing token, a recipient whose
 * email is not on Slack, or an individual `postMessage` failure never affect
 * the recognition result or one another. Runs recipients concurrently so a
 * slow lookup does not block the rest.
 *
 * Awaiting (instead of true fire-and-forget) is intentional: on Vercel's Node
 * runtime a promise not awaited before the response is returned may be
 * cancelled. The extra ~200-500ms is an acceptable trade for reliable
 * delivery.
 */
export async function notifyRecognitionRecipients(
  input: NotifyRecognitionRecipientsInput,
): Promise<void> {
  const token = getEnv().SLACK_BOT_TOKEN;
  if (!token) {
    // Feature is optional. Stay quiet on the happy path (no token configured).
    return;
  }

  if (input.recipientIds.length === 0) return;

  let recipients: Array<{ id: string; email: string; name: string }>;
  try {
    recipients = await prisma.user.findMany({
      where: { id: { in: input.recipientIds } },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    logOperation("error", "Failed to load recipients for Slack DM", {
      operation: "notifyRecognitionRecipients",
      correlationId: input.correlationId,
      recognitionId: input.recognitionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const client = getSlackClient();
  const payload = formatRecognitionDM({
    senderName: input.senderName,
    pointsPerRecipient: input.pointsPerRecipient,
    recognitionText: input.recognitionText,
    gifUrl: input.gifUrl,
    feedUrl: feedUrl(),
  });

  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      // Look up the Slack user by email. Slack returns `users_not_found` when
      // the recipient's Cloneusly email is not on the workspace \u2014 that is a
      // benign case (log at info and skip), not an error.
      let slackUserId: string;
      try {
        const lookup = await client.users.lookupByEmail({
          email: recipient.email,
        });
        if (!lookup.ok || !lookup.user?.id) {
          logOperation("info", "Recipient not on Slack; skipping DM", {
            operation: "notifyRecognitionRecipients",
            correlationId: input.correlationId,
            recognitionId: input.recognitionId,
            recipientId: recipient.id,
          });
          return;
        }
        slackUserId = lookup.user.id;
      } catch (error) {
        const platformError = slackPlatformError(error);
        if (platformError === "users_not_found") {
          logOperation("info", "Recipient not on Slack; skipping DM", {
            operation: "notifyRecognitionRecipients",
            correlationId: input.correlationId,
            recognitionId: input.recognitionId,
            recipientId: recipient.id,
          });
          return;
        }
        logOperation("warn", "Slack users.lookupByEmail failed", {
          operation: "notifyRecognitionRecipients",
          correlationId: input.correlationId,
          recognitionId: input.recognitionId,
          recipientId: recipient.id,
          slackError: platformError,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      try {
        await client.chat.postMessage({
          channel: slackUserId,
          text: payload.text,
          // `formatRecognitionDM` is intentionally decoupled from `@slack/web-api`
          // types so it stays trivially unit-testable. Cast at this boundary.
          blocks: payload.blocks as unknown as KnownBlock[],
        });
      } catch (error) {
        logOperation("warn", "Slack chat.postMessage failed", {
          operation: "notifyRecognitionRecipients",
          correlationId: input.correlationId,
          recognitionId: input.recognitionId,
          recipientId: recipient.id,
          slackError: slackPlatformError(error),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    // Individual failures are already logged above; this is a safety net for
    // any exception that escaped the per-recipient try/catch (should be zero).
    logOperation("error", "Slack recognition fanout had unhandled failures", {
      operation: "notifyRecognitionRecipients",
      correlationId: input.correlationId,
      recognitionId: input.recognitionId,
      failed,
      total: recipients.length,
    });
  }
}
