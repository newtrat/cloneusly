"use client";

import { useOptimistic, useState, useTransition } from "react";

import { toggleReactionAction } from "@/app/(app)/feed/actions";

type ReactionBarProps = {
  recognitionId: string;
  reactions: Array<{
    reactionType: "CLAP" | "HEART" | "CELEBRATE";
    count: number;
    reactedByCurrentUser: boolean;
  }>;
};

const REACTION_LABELS: Record<string, string> = {
  CLAP: "Clap",
  HEART: "Heart",
  CELEBRATE: "Celebrate",
};

const REACTION_EMOJI: Record<string, string> = {
  CLAP: "👏",
  HEART: "❤️",
  CELEBRATE: "🎉",
};

export function ReactionBar({ recognitionId, reactions }: ReactionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticReactions, setOptimisticReactions] = useOptimistic(
    reactions,
    (
      state,
      update: {
        reactionType: "CLAP" | "HEART" | "CELEBRATE";
        active: boolean;
        count: number;
      },
    ) =>
      state.map((r) =>
        r.reactionType === update.reactionType
          ? {
              ...r,
              count: update.count,
              reactedByCurrentUser: update.active,
            }
          : r,
      ),
  );

  function handleToggle(reactionType: "CLAP" | "HEART" | "CELEBRATE") {
    const current = optimisticReactions.find(
      (r) => r.reactionType === reactionType,
    );
    if (!current) return;

    const nextActive = !current.reactedByCurrentUser;
    const nextCount = nextActive
      ? current.count + 1
      : Math.max(0, current.count - 1);

    startTransition(async () => {
      setOptimisticReactions({ reactionType, active: nextActive, count: nextCount });
      setError(null);
      const result = await toggleReactionAction({ recognitionId, reactionType });
      if (!result.ok) {
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reactions">
        {optimisticReactions.map((reaction) => (
          <button
            key={reaction.reactionType}
            type="button"
            disabled={isPending}
            aria-pressed={reaction.reactedByCurrentUser}
            aria-label={`${REACTION_LABELS[reaction.reactionType]} (${reaction.count})`}
            onClick={() => handleToggle(reaction.reactionType)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
              reaction.reactedByCurrentUser
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <span aria-hidden="true">{REACTION_EMOJI[reaction.reactionType]}</span>
            <span>{reaction.count}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
