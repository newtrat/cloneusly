// Kept free of `server-only` so pure unit tests can import it directly.

export type FormatRecognitionDMInput = {
  senderName: string;
  pointsPerRecipient: number;
  // Message body attached to the recognition. Trimmed, may be null/empty.
  recognitionText: string | null | undefined;
  // Optional GIF attached to the recognition (allowlisted https URL).
  gifUrl?: string | null;
  // Absolute URL to the recognition feed in the web app, or null when unknown.
  feedUrl?: string | null;
};

export type FormatRecognitionDMOutput = {
  text: string;
  blocks: Array<Record<string, unknown>>;
};

// Slack mrkdwn treats &, <, > specially and does not honor other HTML escapes.
// https://api.slack.com/reference/surfaces/formatting#escaping
function escapeMrkdwn(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pluralPoints(points: number): string {
  return points === 1 ? "point" : "points";
}

/**
 * Build the DM payload sent to a recipient who just received points. Pure and
 * side-effect free so it can be unit-tested without touching Slack.
 */
export function formatRecognitionDM(
  input: FormatRecognitionDMInput,
): FormatRecognitionDMOutput {
  const senderName = input.senderName.trim() || "A teammate";
  const points = input.pointsPerRecipient;
  const trimmedText = input.recognitionText?.trim() ?? "";

  const summary =
    `:tada: *${escapeMrkdwn(senderName)}* just recognized you with ` +
    `*+${points} ${pluralPoints(points)}*!`;

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "section",
      text: { type: "mrkdwn", text: summary },
    },
  ];

  if (trimmedText.length > 0) {
    const quoted = trimmedText
      .split("\n")
      .map((line) => `> ${escapeMrkdwn(line)}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: quoted },
    });
  }

  const gifUrl = input.gifUrl?.trim();
  if (gifUrl) {
    blocks.push({
      type: "image",
      image_url: gifUrl,
      alt_text: "recognition GIF",
    });
  }

  if (input.feedUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${input.feedUrl}|Open Cloneusly> to react or reply.`,
        },
      ],
    });
  }

  // Plain-text fallback used by Slack for push notifications and clients that
  // do not render blocks. Kept short and mention-free.
  const textFallback = trimmedText
    ? `${senderName} recognized you with +${points} ${pluralPoints(points)}: ${trimmedText}`
    : `${senderName} recognized you with +${points} ${pluralPoints(points)}.`;

  return { text: textFallback, blocks };
}
