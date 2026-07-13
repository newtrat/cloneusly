import { createHash } from "node:crypto";

export type RecipientRef =
  | { kind: "slack_id"; value: string }
  | { kind: "handle"; value: string };

export type ParsedThanksCommand = {
  recipients: RecipientRef[];
  pointsPerRecipient: number;
  text: string;
  hashtags: string[];
};

export type ParseThanksResult =
  | { ok: true; data: ParsedThanksCommand }
  | { ok: false; message: string };

const SLACK_ID_MENTION_RE = /<@([UW][A-Z0-9]+)(?:\|[^>]+)?>/gi;
/** Plain @token when Slack did not expand the mention (common in slash commands). */
const PLAIN_HANDLE_MENTION_RE = /(?:^|[\s])@([A-Za-z0-9._-]+)/g;
const POINTS_RE = /\+(\d+)|(?<![#\w])(\d+)(?!\w)/;
const HASHTAG_RE = /#([A-Za-z0-9_]{1,50})/g;

/**
 * Parse `/thanks` text like:
 * `<@U1> <@U2> +10 for being awesome people #teamwork`
 * or plain `@jon-eric.cook +10 for the new PR` when Slack didn't encode the mention.
 */
export function parseThanksCommand(rawText: string): ParseThanksResult {
  const text = rawText.trim();
  if (!text) {
    return {
      ok: false,
      message:
        "Usage: `/thanks @user1 @user2 +10 for being awesome #teamwork`",
    };
  }

  const recipients = extractRecipients(text);
  if (recipients.length === 0) {
    return {
      ok: false,
      message:
        "Mention at least one recipient with `@user` (use Slack’s @ autocomplete, or `@handle`).",
    };
  }

  const withoutMentions = stripMentions(text).replace(/\s+/g, " ").trim();
  const pointsMatch = withoutMentions.match(POINTS_RE);
  if (!pointsMatch) {
    return {
      ok: false,
      message: "Include points as `+10` (or a positive number).",
    };
  }

  const pointsRaw = pointsMatch[1] ?? pointsMatch[2];
  const pointsPerRecipient = Number(pointsRaw);
  if (!Number.isSafeInteger(pointsPerRecipient) || pointsPerRecipient < 1) {
    return {
      ok: false,
      message: "Points must be a positive whole number.",
    };
  }

  const pointsToken = pointsMatch[0];
  const pointsIndex = withoutMentions.indexOf(pointsToken);
  const afterPoints = withoutMentions
    .slice(pointsIndex + pointsToken.length)
    .trim();

  const hashtags: string[] = [];
  for (const match of afterPoints.matchAll(HASHTAG_RE)) {
    hashtags.push(match[1]);
  }

  const messageText = afterPoints
    .replace(HASHTAG_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!messageText) {
    return {
      ok: false,
      message: "Add a short message after the points (and optional #hashtags).",
    };
  }

  return {
    ok: true,
    data: {
      recipients,
      pointsPerRecipient,
      text: messageText,
      hashtags,
    },
  };
}

function extractRecipients(text: string): RecipientRef[] {
  const recipients: RecipientRef[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(SLACK_ID_MENTION_RE)) {
    const key = `slack_id:${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      recipients.push({ kind: "slack_id", value: match[1] });
    }
  }

  const withoutSlackIds = text.replace(SLACK_ID_MENTION_RE, " ");
  for (const match of withoutSlackIds.matchAll(PLAIN_HANDLE_MENTION_RE)) {
    const handle = match[1];
    const key = `handle:${handle.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      recipients.push({ kind: "handle", value: handle });
    }
  }

  return recipients;
}

function stripMentions(text: string): string {
  return text
    .replace(SLACK_ID_MENTION_RE, " ")
    .replace(PLAIN_HANDLE_MENTION_RE, " ");
}

export function buildSlashIdempotencyKey(parts: {
  teamId: string;
  userId: string;
  channelId: string;
  command: string;
  text: string;
}): string {
  const payload = [
    parts.teamId,
    parts.userId,
    parts.channelId,
    parts.command,
    parts.text,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}
