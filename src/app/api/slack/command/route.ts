import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import {
  buildSlashIdempotencyKey,
  parseThanksCommand,
} from "@/lib/slack/parse-thanks";
import { processThanks } from "@/lib/slack/process-thanks";
import { verifySlackRequest } from "@/lib/slack/verify-request";

export const runtime = "nodejs";

function ephemeral(text: string): NextResponse {
  return NextResponse.json({
    response_type: "ephemeral",
    text,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  let env;
  try {
    env = getEnv();
  } catch {
    return NextResponse.json(
      { response_type: "ephemeral", text: "Server configuration is invalid." },
      { status: 503 },
    );
  }

  if (!env.SLACK_SIGNING_SECRET || !env.SLACK_BOT_TOKEN) {
    return NextResponse.json(
      {
        response_type: "ephemeral",
        text: "Slack is not configured on this server.",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const valid = verifySlackRequest({
    signingSecret: env.SLACK_SIGNING_SECRET,
    rawBody,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
  });

  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const form = new URLSearchParams(rawBody);
  const command = form.get("command") ?? "";
  if (command !== "/thanks") {
    return ephemeral(`Unsupported command: ${command || "(empty)"}`);
  }

  const text = form.get("text") ?? "";
  const parsed = parseThanksCommand(text);
  if (!parsed.ok) {
    return ephemeral(parsed.message);
  }

  const teamId = form.get("team_id") ?? "";
  const userId = form.get("user_id") ?? "";
  const channelId = form.get("channel_id") ?? "";
  if (!userId) {
    return ephemeral("Could not determine who sent this command.");
  }

  const requestId = buildSlashIdempotencyKey({
    teamId,
    userId,
    channelId,
    command,
    text,
  });

  const result = await processThanks({
    senderSlackId: userId,
    parsed: parsed.data,
    requestId,
  });

  if (!result.ok) {
    return ephemeral(result.message);
  }

  return ephemeral(result.message);
}
