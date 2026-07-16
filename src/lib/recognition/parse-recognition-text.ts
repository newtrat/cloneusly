export type ParsedRecognitionText = {
  handles: string[];
  points: number | null;
  hashtags: string[];
  messageText: string;
};

export function parseRecognitionText(raw: string): ParsedRecognitionText {
  // Handles may include hyphens, dots, etc. — stop only on whitespace.
  const handles = [...raw.matchAll(/@(\S+)/g)].map((m) => m[1]);
  const pointsMatch = raw.match(/\+(\d+)/);
  const hashtags = [...raw.matchAll(/#(\w+)/g)].map((m) => m[1]);
  const messageText = raw
    .replace(/@\S+/g, "")
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
