import Link from "next/link";

import { Comments } from "@/components/recognition/comments";
import { GifPreview } from "@/components/recognition/gif-preview";
import { ReactionBar } from "@/components/recognition/reaction-bar";
import type { RecognitionCardView } from "@/lib/dal/recognition-feed";

export type RecognitionCardProps = RecognitionCardView;

export function RecognitionCard({
  id,
  sender,
  recipients,
  pointsPerRecipient,
  text,
  gifUrl,
  hashtags,
  createdAt,
  reactions,
  comments,
}: RecognitionCardProps) {
  const totalPoints = pointsPerRecipient * recipients.length;
  const formattedDate = new Date(createdAt).toLocaleString();

  return (
    <article
      className="rounded-lg border border-border bg-white p-5 shadow-sm"
      aria-labelledby={`recognition-${id}-heading`}
    >
      <header className="mb-3">
        <time className="text-sm text-muted-foreground" dateTime={createdAt}>
          {formattedDate}
        </time>
        <p id={`recognition-${id}-heading`} className="mt-1">
          <Link
            href={`/people/${sender.id}`}
            className="font-semibold hover:text-primary"
          >
            {sender.name}
          </Link>
          <span className="text-muted-foreground"> @{sender.handle}</span> sent{" "}
          <span className="font-semibold">{totalPoints}</span> points (
          {pointsPerRecipient} each) to{" "}
          {recipients.map((r, i) => (
            <span key={r.id}>
              {i > 0 ? (i === recipients.length - 1 ? " and " : ", ") : ""}
              <Link
                href={`/people/${r.id}`}
                className="font-semibold hover:text-primary"
              >
                {r.name}
              </Link>
            </span>
          ))}
        </p>
      </header>

      {text ? <p className="whitespace-pre-wrap">{text}</p> : null}

      {gifUrl ? <GifPreview gifUrl={gifUrl} /> : null}

      {hashtags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Hashtags">
          {hashtags.map((tag) => (
            <Link
              key={tag}
              href={`/feed?hashtag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-muted px-2 py-0.5 text-sm text-primary hover:bg-muted/80"
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      <ReactionBar recognitionId={id} reactions={reactions} />
      <Comments recognitionId={id} initialComments={comments} />
    </article>
  );
}
