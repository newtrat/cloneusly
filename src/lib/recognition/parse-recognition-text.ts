export type ParsedRecognitionText = {
  handles: string[];
  points: number | null;
  hashtags: string[];
  messageText: string;
};

/** Same handle charset as Slack's PLAIN_HANDLE_MENTION_RE ([A-Za-z0-9._-]). */
const HANDLE_MENTION_RE = /@([A-Za-z0-9._-]+)/g;

export function parseRecognitionText(raw: string): ParsedRecognitionText {
  const handles = [...raw.matchAll(HANDLE_MENTION_RE)].map((m) => m[1]);
  const pointsMatch = raw.match(/\+(\d+)/);
  const hashtags = [...raw.matchAll(/#(\w+)/g)].map((m) => m[1]);
  const messageText = raw
    .replace(HANDLE_MENTION_RE, "")
    .replace(/\+\d+/g, "")
    .replace(/#\w+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    handles,
    points: pointsMatch ? parseInt(pointsMatch[1], 10) : null,
    hashtags,
    messageText,
  };
}
