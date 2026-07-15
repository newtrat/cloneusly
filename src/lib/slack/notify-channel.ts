import "server-only";

import type { KnownBlock } from "@slack/web-api";

import { logOperation } from "@/lib/domain/logger";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSlackClient } from "@/lib/slack/client";
import { formatRecognitionChannelMessage } from "@/lib/slack/format-recognition-channel-message";

export type PostRecognitionToChannelInput = {
  senderName: string;
  pointsPerRecipient: number;
  recognitionText: string | null | undefined;
  hashtags?: string[];
  gifUrl?: string | null;
  recognitionId: string;
  recipientIds: string[];
  correlationId?: string;
};

function feedUrl(): string | null {
  const base = getEnv().BETTER_AUTH_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/feed`;
}

/**
 * Broadcast a recognition to the configured Slack channel (e.g. #givethanks).
 * No-op when Slack or the channel is not configured. Fully error-swallowing:
 * a Slack outage never affects the recognition result.
 */
export async function postRecognitionToChannel(
  input: PostRecognitionToChannelInput,
): Promise<void> {
  const env = getEnv();
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_RECOGNITION_CHANNEL) {
    return;
  }

  let recipientNames: string[];
  try {
    const recipients = await prisma.user.findMany({
      where: { id: { in: input.recipientIds } },
      select: { id: true, name: true },
    });
    // Preserve the original recipient order.
    const byId = new Map(recipients.map((r) => [r.id, r.name]));
    recipientNames = input.recipientIds
      .map((id) => byId.get(id))
      .filter((name): name is string => Boolean(name));
  } catch (error) {
    logOperation("error", "Failed to load recipients for Slack channel post", {
      operation: "postRecognitionToChannel",
      correlationId: input.correlationId,
      recognitionId: input.recognitionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const payload = formatRecognitionChannelMessage({
    senderName: input.senderName,
    recipientNames,
    pointsPerRecipient: input.pointsPerRecipient,
    recognitionText: input.recognitionText,
    hashtags: input.hashtags,
    gifUrl: input.gifUrl,
    feedUrl: feedUrl(),
  });

  try {
    await getSlackClient().chat.postMessage({
      channel: env.SLACK_RECOGNITION_CHANNEL,
      text: payload.text,
      blocks: payload.blocks as unknown as KnownBlock[],
    });
  } catch (error) {
    logOperation("warn", "Slack channel recognition post failed", {
      operation: "postRecognitionToChannel",
      correlationId: input.correlationId,
      recognitionId: input.recognitionId,
      channel: env.SLACK_RECOGNITION_CHANNEL,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
