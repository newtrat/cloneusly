// Kept free of `server-only` so pure unit tests can import it directly.

export type FormatRecognitionChannelInput = {
  senderName: string;
  recipientNames: string[];
  pointsPerRecipient: number;
  recognitionText: string | null | undefined;
  hashtags?: string[];
  gifUrl?: string | null;
  feedUrl?: string | null;
};

export type FormatRecognitionChannelOutput = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

// Slack mrkdwn treats &, <, > specially.
// https://api.slack.com/reference/surfaces/formatting#escaping
function escapeMrkdwn(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pluralPoints(points: number): string {
  return points === 1 ? "point" : "points";
}

/** Join names as "A", "A and B", or "A, B and C". */
function joinNames(names: string[]): string {
  const safe = names.map(escapeMrkdwn);
  if (safe.length <= 1) return safe[0] ?? "";
  if (safe.length === 2) return `${safe[0]} and ${safe[1]}`;
  return `${safe.slice(0, -1).join(", ")} and ${safe[safe.length - 1]}`;
}

/**
 * Build the channel broadcast payload for a recognition. Pure and side-effect
 * free so it can be unit-tested without touching Slack.
 */
export function formatRecognitionChannelMessage(
  input: FormatRecognitionChannelInput,
): FormatRecognitionChannelOutput {
  const senderName = input.senderName.trim() || "A teammate";
  const points = input.pointsPerRecipient;
  const recipients = joinNames(
    input.recipientNames.map((n) => n.trim()).filter(Boolean),
  );
  const trimmedText = input.recognitionText?.trim() ?? "";
  const hashtags = (input.hashtags ?? [])
    .map((h) => h.trim().replace(/^#/, ""))
    .filter(Boolean);

  const headline =
    `:tada: *${escapeMrkdwn(senderName)}* recognized ` +
    `*${recipients}* with *+${points} ${pluralPoints(points)}*` +
    (recipients ? "" : "");

  const blocks: Array<Record<string, unknown>> = [
    { type: "section", text: { type: "mrkdwn", text: headline } },
  ];

  if (trimmedText.length > 0) {
    const quoted = trimmedText
      .split("\n")
      .map((line) => `> ${escapeMrkdwn(line)}`)
      .join("\n");
    blocks.push({ type: "section", text: { type: "mrkdwn", text: quoted } });
  }

  const gifUrl = input.gifUrl?.trim();
  if (gifUrl) {
    blocks.push({
      type: "image",
      image_url: gifUrl,
      alt_text: "recognition GIF",
    });
  }

  const contextParts: string[] = [];
  if (hashtags.length > 0) {
    contextParts.push(hashtags.map((h) => `#${escapeMrkdwn(h)}`).join(" "));
  }
  if (input.feedUrl) {
    contextParts.push(`<${input.feedUrl}|Open Cloneusly>`);
  }
  if (contextParts.length > 0) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: contextParts.join("  •  ") }],
    });
  }

  const textFallback = trimmedText
    ? `${senderName} recognized ${recipients} with +${points} ${pluralPoints(points)}: ${trimmedText}`
    : `${senderName} recognized ${recipients} with +${points} ${pluralPoints(points)}.`;

  return { text: textFallback, blocks };
}
