"use client";

import { useState } from "react";

import { addCommentAction } from "@/app/(app)/feed/actions";
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
    <section className="mt-4 border-t border-border pt-3" aria-label="Comments">
      {comments.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <span className="font-semibold">{comment.author.name}</span>
              <span className="text-muted-foreground"> @{comment.author.handle}</span>
              <span className="text-muted-foreground">
                {" "}
                · {new Date(comment.createdAt).toLocaleString()}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">No comments yet.</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
        <label htmlFor={`comment-${recognitionId}`} className="sr-only">
          Add a comment
        </label>
        <textarea
          id={`comment-${recognitionId}`}
          rows={2}
          value={body}
          disabled={pending}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post comment"}
        </button>
      </form>
    </section>
  );
}
