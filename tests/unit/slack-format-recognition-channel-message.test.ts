import { describe, expect, it } from "vitest";

import { formatRecognitionChannelMessage } from "@/lib/slack/format-recognition-channel-message";

describe("formatRecognitionChannelMessage", () => {
  it("names a single recipient with the sender and points", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "Alice",
      recipientNames: ["Bob"],
      pointsPerRecipient: 10,
      recognitionText: null,
    });
    expect(out.text).toBe("Alice recognized Bob with +10 points.");
    expect(JSON.stringify(out.blocks)).toContain("*Alice*");
    expect(JSON.stringify(out.blocks)).toContain("*Bob*");
    expect(JSON.stringify(out.blocks)).toContain("+10 points");
  });

  it("uses the singular 'point' for a value of one", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "Alice",
      recipientNames: ["Bob"],
      pointsPerRecipient: 1,
      recognitionText: null,
    });
    expect(out.text).toContain("+1 point.");
  });

  it("joins multiple recipients with commas and 'and'", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "Alice",
      recipientNames: ["Bob", "Carol", "Dave"],
      pointsPerRecipient: 5,
      recognitionText: null,
    });
    expect(out.text).toContain("Bob, Carol and Dave");
  });

  it("includes the message body and hashtags", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "Alice",
      recipientNames: ["Bob"],
      pointsPerRecipient: 5,
      recognitionText: "great work",
      hashtags: ["teamwork", "#kudos"],
      feedUrl: "https://cloneusly.vercel.app/feed",
    });
    const serialized = JSON.stringify(out.blocks);
    expect(serialized).toContain("great work");
    expect(serialized).toContain("#teamwork");
    expect(serialized).toContain("#kudos");
    expect(serialized).toContain("https://cloneusly.vercel.app/feed");
    expect(out.text).toContain("great work");
  });

  it("escapes Slack mrkdwn special characters", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "A & B <team>",
      recipientNames: ["Bob"],
      pointsPerRecipient: 5,
      recognitionText: null,
    });
    const serialized = JSON.stringify(out.blocks);
    expect(serialized).toContain("A &amp; B &lt;team&gt;");
  });

  it("falls back to 'A teammate' for an empty sender name", () => {
    const out = formatRecognitionChannelMessage({
      senderName: "   ",
      recipientNames: ["Bob"],
      pointsPerRecipient: 5,
      recognitionText: null,
    });
    expect(out.text).toContain("A teammate");
  });
});
