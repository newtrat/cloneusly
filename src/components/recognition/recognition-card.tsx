import Link from "next/link";

import { Comments } from "@/components/recognition/comments";
import { GifPreview } from "@/components/recognition/gif-preview";
import { ReactionBar } from "@/components/recognition/reaction-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <article aria-labelledby={`recognition-${id}-heading`}>
      <Card size="sm">
        <CardHeader className="border-b">
          <header>
            <time
              className="text-muted-foreground text-xs"
              dateTime={createdAt}
            >
              {formattedDate}
            </time>
            <p
              id={`recognition-${id}-heading`}
              className="mt-1 leading-relaxed"
            >
              <Link
                href={`/people/${sender.id}`}
                className="hover:text-primary font-semibold"
              >
                {sender.name}
              </Link>
              <span className="text-muted-foreground"> @{sender.handle}</span>{" "}
              sent <span className="font-semibold">{totalPoints}</span> points (
              {pointsPerRecipient} each) to{" "}
              {recipients.map((r, i) => (
                <span key={r.id}>
                  {i > 0 ? (i === recipients.length - 1 ? " and " : ", ") : ""}
                  <Link
                    href={`/people/${r.id}`}
                    className="hover:text-primary font-semibold"
                  >
                    {r.name}
                  </Link>
                </span>
              ))}
            </p>
          </header>
        </CardHeader>
        <CardContent>
          {text ? (
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
          ) : null}

          {gifUrl ? <GifPreview gifUrl={gifUrl} /> : null}

          {hashtags.length > 0 ? (
            <div
              className="mt-4 flex flex-wrap gap-x-3 gap-y-2"
              aria-label="Hashtags"
            >
              {hashtags.map((tag) => (
                <Badge
                  key={tag}
                  variant="link"
                  render={
                    <Link href={`/feed?hashtag=${encodeURIComponent(tag)}`} />
                  }
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <ReactionBar recognitionId={id} reactions={reactions} />
          <Comments recognitionId={id} initialComments={comments} />
        </CardContent>
      </Card>
    </article>
  );
}
