import { describe, expect, it } from "vitest";

import { formatRecognitionDM } from "@/lib/slack/format-recognition-message";

describe("formatRecognitionDM", () => {
  it("builds a summary block and fallback text with a recognition message", () => {
    const result = formatRecognitionDM({
      senderName: "Alice Member",
      pointsPerRecipient: 10,
      recognitionText: "Thanks for reviewing my PR so quickly.",
    });

    expect(result.text).toBe(
      "Alice Member recognized you with +10 points: Thanks for reviewing my PR so quickly.",
    );
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]).toEqual({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":tada: *Alice Member* just recognized you with *+10 points*!",
      },
    });
    expect(result.blocks[1]).toEqual({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "> Thanks for reviewing my PR so quickly.",
      },
    });
  });

  it("omits the quote block when no message body is provided", () => {
    const result = formatRecognitionDM({
      senderName: "Bob",
      pointsPerRecipient: 5,
      recognitionText: null,
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.text).toBe("Bob recognized you with +5 points.");
  });

  it("treats whitespace-only messages as empty", () => {
    const result = formatRecognitionDM({
      senderName: "Bob",
      pointsPerRecipient: 5,
      recognitionText: "   \n  ",
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.text).toBe("Bob recognized you with +5 points.");
  });

  it("uses singular 'point' for a single-point recognition", () => {
    const result = formatRecognitionDM({
      senderName: "Carol",
      pointsPerRecipient: 1,
      recognitionText: "You crushed it.",
    });

    expect(result.blocks[0]).toMatchObject({
      text: {
        text: ":tada: *Carol* just recognized you with *+1 point*!",
      },
    });
    expect(result.text).toBe(
      "Carol recognized you with +1 point: You crushed it.",
    );
  });

  it("escapes mrkdwn-sensitive characters in the sender name and body", () => {
    const result = formatRecognitionDM({
      senderName: "<Dev> & Ops",
      pointsPerRecipient: 3,
      recognitionText: "for <fixing> the & pipeline",
    });

    expect(result.blocks[0]).toMatchObject({
      text: {
        text:
          ":tada: *&lt;Dev&gt; &amp; Ops* just recognized you with *+3 points*!",
      },
    });
    expect(result.blocks[1]).toMatchObject({
      text: { text: "> for &lt;fixing&gt; the &amp; pipeline" },
    });
  });

  it("quotes multi-line messages line-by-line", () => {
    const result = formatRecognitionDM({
      senderName: "Dana",
      pointsPerRecipient: 2,
      recognitionText: "line one\nline two",
    });

    expect(result.blocks[1]).toMatchObject({
      text: { text: "> line one\n> line two" },
    });
  });

  it("appends a feed-link context block when a feed URL is provided", () => {
    const result = formatRecognitionDM({
      senderName: "Eve",
      pointsPerRecipient: 4,
      recognitionText: null,
      feedUrl: "https://cloneusly.example.com/feed",
    });

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[1]).toEqual({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "<https://cloneusly.example.com/feed|Open Cloneusly> to react or reply.",
        },
      ],
    });
  });

  it("falls back to a generic sender label when the name is blank", () => {
    const result = formatRecognitionDM({
      senderName: "   ",
      pointsPerRecipient: 7,
      recognitionText: null,
    });

    expect(result.blocks[0]).toMatchObject({
      text: {
        text: ":tada: *A teammate* just recognized you with *+7 points*!",
      },
    });
    expect(result.text).toBe("A teammate recognized you with +7 points.");
  });
});
