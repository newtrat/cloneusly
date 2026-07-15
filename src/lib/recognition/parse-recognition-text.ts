export type ParsedRecognitionText = {
  handles: string[];
  points: number | null;
  hashtags: string[];
  messageText: string;
};

export function parseRecognitionText(raw: string): ParsedRecognitionText {
  const handles = [...raw.matchAll(/@([\w.]+)/g)].map((m) => m[1]);
  const pointsMatch = raw.match(/\+(\d+)/);
  const hashtags = [...raw.matchAll(/#(\w+)/g)].map((m) => m[1]);
  const messageText = raw
    .replace(/@[\w.]+/g, "")
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
