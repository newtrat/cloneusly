import { after, NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { getSlackClient } from "@/lib/slack/client";
import { notifyThanksSuccess } from "@/lib/slack/notify";
import { processThanks } from "@/lib/slack/process-thanks";
import {
  SHORTCUT_CALLBACK_ID,
  THANKS_MODAL_CALLBACK_ID,
  buildThanksErrorModalView,
  buildThanksModalView,
  buildThanksProcessingModalView,
  buildThanksSuccessModalView,
  channelIdFromShortcutPayload,
  initialRecipientsFromMessageAction,
  parseThanksModalMetadata,
  parseThanksModalState,
} from "@/lib/slack/thanks-modal";
import { verifySlackRequest } from "@/lib/slack/verify-request";
import { logOperation } from "@/lib/domain/logger";

export const runtime = "nodejs";

type SlackInteractivePayload = {
  type?: string;
  callback_id?: string;
  trigger_id?: string;
  user?: { id?: string };
  message?: { user?: string };
  channel?: { id?: string } | string;
  view?: {
    id?: string;
    callback_id?: string;
    private_metadata?: string;
    state?: { values?: Record<string, Record<string, unknown>> };
  };
};

export async function POST(request: Request): Promise<NextResponse> {
  let env;
  try {
    env = getEnv();
  } catch {
    return NextResponse.json(
      { error: "CONFIGURATION_ERROR" },
      { status: 503 },
    );
  }

  if (!env.SLACK_SIGNING_SECRET || !env.SLACK_BOT_TOKEN) {
    return NextResponse.json(
      { error: "CONFIGURATION_ERROR" },
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
  const payloadRaw = form.get("payload");
  if (!payloadRaw) {
    return new NextResponse(null, { status: 200 });
  }

  let payload: SlackInteractivePayload;
  try {
    payload = JSON.parse(payloadRaw) as SlackInteractivePayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const isThanksShortcut =
    payload.callback_id === SHORTCUT_CALLBACK_ID &&
    (payload.type === "shortcut" || payload.type === "message_action");

  if (isThanksShortcut) {
    if (!payload.trigger_id) {
      return NextResponse.json({ error: "missing_trigger_id" }, { status: 400 });
    }

    try {
      const client = getSlackClient();
      await client.views.open({
        trigger_id: payload.trigger_id,
        view: buildThanksModalView({
          initialRecipientIds: initialRecipientsFromMessageAction(payload),
          channelId: channelIdFromShortcutPayload(payload),
        }),
      });
    } catch {
      return NextResponse.json({ error: "views_open_failed" }, { status: 500 });
    }

    return new NextResponse(null, { status: 200 });
  }

  if (
    payload.type === "view_submission" &&
    payload.view?.callback_id === THANKS_MODAL_CALLBACK_ID
  ) {
    const senderSlackId = payload.user?.id;
    if (!senderSlackId) {
      return NextResponse.json({
        response_action: "errors",
        errors: {
          message_block: "Could not determine who submitted this form.",
        },
      });
    }

    const values = (payload.view.state?.values ?? {}) as Parameters<
      typeof parseThanksModalState
    >[0];
    const parsed = parseThanksModalState(values);
    if (!parsed.ok) {
      return NextResponse.json({
        response_action: "errors",
        errors: parsed.errors,
      });
    }

    const viewId = payload.view.id;
    if (!viewId) {
      return NextResponse.json({
        response_action: "errors",
        errors: {
          message_block: "Missing Slack view id for idempotency.",
        },
      });
    }

    const requestId = `slack-modal-${viewId}`.slice(0, 128);
    const metadata = parseThanksModalMetadata(payload.view.private_metadata);

    after(async () => {
      const client = getSlackClient();
      const result = await processThanks({
        senderSlackId,
        parsed: parsed.data,
        requestId,
      });

      try {
        await client.views.update({
          view_id: viewId,
          view: result.ok
            ? buildThanksSuccessModalView(result.message)
            : buildThanksErrorModalView(result.message),
        });
      } catch (error) {
        logOperation("warn", "Slack views.update follow-up failed", {
          operation: "slackInteractiveThanks",
          userId: senderSlackId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (!result.ok) return;

      try {
        await notifyThanksSuccess({
          userId: senderSlackId,
          text: result.message,
          channelId: metadata.channelId,
        });
      } catch (error) {
        logOperation("warn", "Slack success notification failed", {
          operation: "slackInteractiveThanks",
          userId: senderSlackId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    return NextResponse.json({
      response_action: "update",
      view: buildThanksProcessingModalView(),
    });
  }

  return new NextResponse(null, { status: 200 });
}
