import { describe, expect, it } from "vitest";

import {
  THANKS_MODAL_BLOCKS,
  buildThanksModalView,
  buildThanksSuccessModalView,
  encodeThanksModalMetadata,
  initialRecipientsFromMessageAction,
  parseThanksModalMetadata,
  parseThanksModalState,
} from "@/lib/slack/thanks-modal";

describe("buildThanksModalView", () => {
  it("builds a modal with thanks_modal callback id", () => {
    const view = buildThanksModalView();
    expect(view.callback_id).toBe("thanks_modal");
    expect(view.type).toBe("modal");
    expect(view.blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("prefills multi_users_select when initialRecipientIds are provided", () => {
    const view = buildThanksModalView({ initialRecipientIds: ["UAUTHOR"] });
    const recipientsBlock = view.blocks[0] as {
      element: { initial_users?: string[] };
    };
    expect(recipientsBlock.element.initial_users).toEqual(["UAUTHOR"]);
  });

  it("stores channelId in private_metadata for message shortcuts", () => {
    const view = buildThanksModalView({ channelId: "C123" });
    expect(view.private_metadata).toBe(JSON.stringify({ channelId: "C123" }));
  });

  it("builds a success confirmation modal", () => {
    const view = buildThanksSuccessModalView(
      "Sent 10 points each to @jon. Remaining giving balance: 90.",
    );
    expect(view.callback_id).toBe("thanks_modal_success");
    expect(view.title.text).toBe("Thanks sent");
    expect(view.blocks[0]).toMatchObject({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "Sent 10 points each to @jon. Remaining giving balance: 90.",
      },
    });
  });
});

describe("parseThanksModalMetadata", () => {
  it("round-trips channel metadata", () => {
    const encoded = encodeThanksModalMetadata({ channelId: "C999" });
    expect(parseThanksModalMetadata(encoded)).toEqual({ channelId: "C999" });
    expect(parseThanksModalMetadata(undefined)).toEqual({});
  });
});

describe("initialRecipientsFromMessageAction", () => {
  it("returns the message author for message_action payloads", () => {
    expect(
      initialRecipientsFromMessageAction({
        type: "message_action",
        user: { id: "UME" },
        message: { user: "UAUTHOR" },
      }),
    ).toEqual(["UAUTHOR"]);
  });

  it("skips prefill when thanking your own message", () => {
    expect(
      initialRecipientsFromMessageAction({
        type: "message_action",
        user: { id: "UME" },
        message: { user: "UME" },
      }),
    ).toEqual([]);
  });

  it("returns empty for global shortcuts", () => {
    expect(
      initialRecipientsFromMessageAction({
        type: "shortcut",
        user: { id: "UME" },
      }),
    ).toEqual([]);
  });
});

describe("parseThanksModalState", () => {
  it("maps modal state to a parsed thanks command", () => {
    const result = parseThanksModalState({
      [THANKS_MODAL_BLOCKS.recipients]: {
        recipients: { selected_users: ["U111", "U222"] },
      },
      [THANKS_MODAL_BLOCKS.points]: {
        points: { value: "+10" },
      },
      [THANKS_MODAL_BLOCKS.message]: {
        message: { value: "for being awesome people" },
      },
      [THANKS_MODAL_BLOCKS.hashtags]: {
        hashtags: { value: "teamwork #kudos" },
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        recipients: [
          { kind: "slack_id", value: "U111" },
          { kind: "slack_id", value: "U222" },
        ],
        pointsPerRecipient: 10,
        text: "for being awesome people",
        hashtags: ["teamwork", "kudos"],
      },
    });
  });

  it("returns field errors for missing required inputs", () => {
    const result = parseThanksModalState({
      [THANKS_MODAL_BLOCKS.recipients]: {
        recipients: { selected_users: [] },
      },
      [THANKS_MODAL_BLOCKS.points]: {
        points: { value: "" },
      },
      [THANKS_MODAL_BLOCKS.message]: {
        message: { value: "   " },
      },
      [THANKS_MODAL_BLOCKS.hashtags]: {
        hashtags: { value: null },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[THANKS_MODAL_BLOCKS.recipients]).toBeTruthy();
      expect(result.errors[THANKS_MODAL_BLOCKS.points]).toBeTruthy();
      expect(result.errors[THANKS_MODAL_BLOCKS.message]).toBeTruthy();
    }
  });
});
