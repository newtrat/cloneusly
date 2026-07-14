import "server-only";

import { logOperation } from "@/lib/domain/logger";
import { getSlackClient } from "@/lib/slack/client";

/**
 * Confirm a thanks send to the actor only.
 * Prefers channel ephemeral when we know the channel; falls back to a DM.
 */
export async function notifyThanksSuccess(params: {
  userId: string;
  text: string;
  channelId?: string;
}): Promise<void> {
  const client = getSlackClient();

  if (params.channelId) {
    try {
      await client.chat.postEphemeral({
        channel: params.channelId,
        user: params.userId,
        text: params.text,
      });
      return;
    } catch (error) {
      logOperation("warn", "Slack ephemeral confirmation failed; falling back to DM", {
        operation: "notifyThanksSuccess",
        channelId: params.channelId,
        userId: params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await client.chat.postMessage({
    channel: params.userId,
    text: params.text,
  });
}
