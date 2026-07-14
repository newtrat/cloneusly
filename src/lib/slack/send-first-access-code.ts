import "server-only";

import { logOperation } from "@/lib/domain/logger";
import { getEnv } from "@/lib/env";
import { getSlackClient } from "@/lib/slack/client";

type SendFirstAccessCodeParams = {
  email: string;
  code: string;
  slackUserId?: string | null;
  correlationId?: string;
};

function message(code: string): string {
  return [
    `Your Cloneusly verification code is *${code}*.`,
    "Enter it on the first-access page to set your password.",
    "It expires in 15 minutes. If you didn't request it, you can ignore this message.",
  ].join("\n");
}

/**
 * Delivers the first-access verification code over Slack DM. When Slack is not
 * configured or the recipient's Slack user is unknown, the code is logged to the
 * server console so the flow stays usable in local/demo environments.
 */
export async function sendFirstAccessCode({
  email,
  code,
  slackUserId,
  correlationId,
}: SendFirstAccessCodeParams): Promise<void> {
  const slackConfigured = Boolean(getEnv().SLACK_BOT_TOKEN);

  if (!slackConfigured || !slackUserId) {
    logOperation(
      "info",
      "First-access verification code (Slack delivery unavailable)",
      { operation: "sendFirstAccessCode", correlationId, email, code },
    );
    return;
  }

  try {
    await getSlackClient().chat.postMessage({
      channel: slackUserId,
      text: message(code),
    });
  } catch (error) {
    logOperation("error", "Failed to send first-access code via Slack", {
      operation: "sendFirstAccessCode",
      correlationId,
      email,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
