import type { ParsedThanksCommand } from "@/lib/slack/parse-thanks";

export const THANKS_MODAL_CALLBACK_ID = "thanks_modal";
export const SHORTCUT_CALLBACK_ID = "interactive_shortcut";

export const THANKS_MODAL_BLOCKS = {
  recipients: "recipients_block",
  points: "points_block",
  message: "message_block",
  hashtags: "hashtags_block",
} as const;

export const THANKS_MODAL_ACTIONS = {
  recipients: "recipients",
  points: "points",
  message: "message",
  hashtags: "hashtags",
} as const;

export function buildThanksModalView(options?: {
  initialRecipientIds?: string[];
  channelId?: string;
}) {
  const initialUsers = (options?.initialRecipientIds ?? []).filter(Boolean);
  const privateMetadata = encodeThanksModalMetadata({
    channelId: options?.channelId,
  });

  return {
    type: "modal" as const,
    callback_id: THANKS_MODAL_CALLBACK_ID,
    title: { type: "plain_text" as const, text: "Send Thanks" },
    submit: { type: "plain_text" as const, text: "Send" },
    close: { type: "plain_text" as const, text: "Cancel" },
    ...(privateMetadata ? { private_metadata: privateMetadata } : {}),
    blocks: [
      {
        type: "input",
        block_id: THANKS_MODAL_BLOCKS.recipients,
        label: { type: "plain_text" as const, text: "Recipients" },
        element: {
          type: "multi_users_select",
          action_id: THANKS_MODAL_ACTIONS.recipients,
          placeholder: {
            type: "plain_text" as const,
            text: "Select teammates",
          },
          ...(initialUsers.length > 0 ? { initial_users: initialUsers } : {}),
        },
      },
      {
        type: "input",
        block_id: THANKS_MODAL_BLOCKS.points,
        label: { type: "plain_text" as const, text: "Points per person" },
        element: {
          type: "plain_text_input",
          action_id: THANKS_MODAL_ACTIONS.points,
          placeholder: { type: "plain_text" as const, text: "10" },
        },
      },
      {
        type: "input",
        block_id: THANKS_MODAL_BLOCKS.message,
        label: { type: "plain_text" as const, text: "Message" },
        element: {
          type: "plain_text_input",
          action_id: THANKS_MODAL_ACTIONS.message,
          multiline: true,
          placeholder: {
            type: "plain_text" as const,
            text: "for being awesome people",
          },
        },
      },
      {
        type: "input",
        block_id: THANKS_MODAL_BLOCKS.hashtags,
        optional: true,
        label: { type: "plain_text" as const, text: "Hashtags" },
        hint: {
          type: "plain_text" as const,
          text: "Space-separated, e.g. teamwork collaboration",
        },
        element: {
          type: "plain_text_input",
          action_id: THANKS_MODAL_ACTIONS.hashtags,
          placeholder: {
            type: "plain_text" as const,
            text: "teamwork",
          },
        },
      },
    ],
  };
}

export function buildThanksSuccessModalView(message: string) {
  const text =
    message.length > 2900 ? `${message.slice(0, 2900)}…` : message;

  return {
    type: "modal" as const,
    callback_id: "thanks_modal_success",
    title: { type: "plain_text" as const, text: "Thanks sent" },
    close: { type: "plain_text" as const, text: "Done" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn" as const,
          text,
        },
      },
    ],
  };
}

export function buildThanksProcessingModalView() {
  return {
    type: "modal" as const,
    callback_id: "thanks_modal_processing",
    title: { type: "plain_text" as const, text: "Send Thanks" },
    close: { type: "plain_text" as const, text: "Close" },
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn" as const, text: "Sending your thanks…" },
      },
    ],
  };
}

export function buildThanksErrorModalView(message: string) {
  const text =
    message.length > 2900 ? `${message.slice(0, 2900)}…` : message;

  return {
    type: "modal" as const,
    callback_id: "thanks_modal_error",
    title: { type: "plain_text" as const, text: "Couldn't send thanks" },
    close: { type: "plain_text" as const, text: "Close" },
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn" as const, text },
      },
    ],
  };
}

export type ThanksModalMetadata = {
  channelId?: string;
};

export function encodeThanksModalMetadata(
  metadata: ThanksModalMetadata,
): string | undefined {
  if (!metadata.channelId) return undefined;
  return JSON.stringify({ channelId: metadata.channelId });
}

export function parseThanksModalMetadata(
  raw: string | undefined | null,
): ThanksModalMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ThanksModalMetadata;
    return {
      channelId:
        typeof parsed.channelId === "string" && parsed.channelId.length > 0
          ? parsed.channelId
          : undefined,
    };
  } catch {
    return {};
  }
}

/** Prefill recipients from a message shortcut, excluding the actor (self). */
export function initialRecipientsFromMessageAction(payload: {
  type?: string;
  user?: { id?: string };
  message?: { user?: string };
}): string[] {
  if (payload.type !== "message_action") return [];
  const authorId = payload.message?.user;
  if (!authorId) return [];
  if (authorId === payload.user?.id) return [];
  return [authorId];
}

export function channelIdFromShortcutPayload(payload: {
  type?: string;
  channel?: { id?: string } | string;
}): string | undefined {
  if (payload.type !== "message_action") return undefined;
  if (typeof payload.channel === "string") return payload.channel;
  return payload.channel?.id;
}


type SlackViewStateValues = Record<
  string,
  Record<
    string,
    {
      type?: string;
      value?: string | null;
      selected_users?: string[];
    }
  >
>;

export type ParseModalResult =
  | { ok: true; data: ParsedThanksCommand }
  | { ok: false; errors: Record<string, string> };

export function parseThanksModalState(
  values: SlackViewStateValues,
): ParseModalResult {
  const errors: Record<string, string> = {};

  const selectedUsers =
    values[THANKS_MODAL_BLOCKS.recipients]?.[THANKS_MODAL_ACTIONS.recipients]
      ?.selected_users ?? [];
  if (selectedUsers.length === 0) {
    errors[THANKS_MODAL_BLOCKS.recipients] = "Select at least one recipient.";
  }

  const pointsRaw =
    values[THANKS_MODAL_BLOCKS.points]?.[
      THANKS_MODAL_ACTIONS.points
    ]?.value?.trim() ?? "";
  const pointsPerRecipient = Number(pointsRaw.replace(/^\+/, ""));
  if (
    !pointsRaw ||
    !Number.isSafeInteger(pointsPerRecipient) ||
    pointsPerRecipient < 1
  ) {
    errors[THANKS_MODAL_BLOCKS.points] =
      "Enter a positive whole number of points.";
  }

  const message =
    values[THANKS_MODAL_BLOCKS.message]?.[
      THANKS_MODAL_ACTIONS.message
    ]?.value?.trim() ?? "";
  if (!message) {
    errors[THANKS_MODAL_BLOCKS.message] = "Add a recognition message.";
  }

  const hashtagsRaw =
    values[THANKS_MODAL_BLOCKS.hashtags]?.[
      THANKS_MODAL_ACTIONS.hashtags
    ]?.value?.trim() ?? "";
  const hashtags = hashtagsRaw
    ? hashtagsRaw
        .split(/[\s,]+/)
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean)
    : [];

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      recipients: selectedUsers.map((value) => ({
        kind: "slack_id" as const,
        value,
      })),
      pointsPerRecipient,
      text: message,
      hashtags,
    },
  };
}
