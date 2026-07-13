"use client";

import { useState } from "react";

import { addCommentAction } from "@/app/(app)/feed/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserSummary } from "@/lib/dal/current-user";

type CommentItem = {
  id: string;
  author: UserSummary;
  body: string;
  createdAt: string;
};

type CommentsProps = {
  recognitionId: string;
  initialComments: CommentItem[];
};

export function Comments({ recognitionId, initialComments }: CommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setPending(true);
    setError(null);

    const result = await addCommentAction({ recognitionId, body: body.trim() });
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setComments((prev) => [...prev, result.data.comment]);
    setBody("");
  }

  return (
    <section className="border-border mt-4 border-t pt-3" aria-label="Comments">
      {comments.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <span className="font-semibold">{comment.author.name}</span>
              <span className="text-muted-foreground">
                {" "}
                @{comment.author.handle}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {new Date(comment.createdAt).toLocaleString()}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mb-3 text-sm">No comments yet.</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <Label htmlFor={`comment-${recognitionId}`} className="sr-only">
          Add a comment
        </Label>
        <Textarea
          id={`comment-${recognitionId}`}
          rows={2}
          value={body}
          disabled={pending}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="min-h-20"
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </section>
  );
}
