import "server-only";

import type { ReactionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  type CursorPage,
} from "@/lib/dal/cursor";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";

const REACTION_TYPES: ReactionType[] = ["CLAP", "HEART", "CELEBRATE"];

export type RecognitionCardView = {
  id: string;
  sender: UserSummary;
  recipients: UserSummary[];
  pointsPerRecipient: number;
  text: string | null;
  gifUrl: string | null;
  hashtags: string[];
  createdAt: string;
  reactions: Array<{
    reactionType: ReactionType;
    count: number;
    reactedByCurrentUser: boolean;
  }>;
  comments: Array<{
    id: string;
    author: UserSummary;
    body: string;
    createdAt: string;
  }>;
};

export type GetFeedInput = {
  cursor?: string;
  limit?: number;
  userId?: string;
  hashtag?: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getFeed(
  input: GetFeedInput = {},
): Promise<CommandResult<CursorPage<RecognitionCardView>>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const currentUserId = authResult.data.id;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const where: Prisma.RecognitionWhereInput = {};

  if (input.userId) {
    where.OR = [
      { senderId: input.userId },
      { recipients: { some: { recipientId: input.userId } } },
    ];
  }

  if (input.hashtag) {
    const normalized = input.hashtag.trim().replace(/^#/, "").toLowerCase();
    where.hashtags = {
      some: {
        hashtag: { normalizedName: normalized },
      },
    };
  }

  if (input.cursor) {
    const decoded = decodeFeedCursor(input.cursor);
    if (!decoded) {
      return err("VALIDATION_ERROR", "Invalid feed cursor.");
    }
    where.AND = [
      {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { lt: decoded.id } },
        ],
      },
    ];
  }

  const recognitions = await prisma.recognition.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      sender: {
        select: { id: true, handle: true, name: true, image: true },
      },
      recipients: {
        include: {
          recipient: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
      hashtags: { include: { hashtag: true } },
      reactions: true,
      comments: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 50,
        include: {
          author: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
    },
  });

  const hasMore = recognitions.length > limit;
  const page = hasMore ? recognitions.slice(0, limit) : recognitions;

  const items = page.map((r) => toRecognitionCardView(r, currentUserId));

  const last = page.at(-1);
  const nextCursor =
    hasMore && last
      ? encodeFeedCursor(last.createdAt, last.id)
      : null;

  return ok({ items, nextCursor });
}

type RecognitionWithRelations = {
  id: string;
  pointsPerRecipient: number;
  text: string | null;
  gifUrl: string | null;
  createdAt: Date;
  sender: { id: string; handle: string; name: string; image: string | null };
  recipients: Array<{
    recipient: { id: string; handle: string; name: string; image: string | null };
  }>;
  hashtags: Array<{ hashtag: { displayName: string } }>;
  reactions: Array<{ userId: string; reactionType: ReactionType }>;
  comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    author: { id: string; handle: string; name: string; image: string | null };
  }>;
};

export function toRecognitionCardView(
  recognition: RecognitionWithRelations,
  currentUserId: string,
): RecognitionCardView {
  const reactions = REACTION_TYPES.map((reactionType) => ({
    reactionType,
    count: recognition.reactions.filter((r) => r.reactionType === reactionType)
      .length,
    reactedByCurrentUser: recognition.reactions.some(
      (r) => r.reactionType === reactionType && r.userId === currentUserId,
    ),
  }));

  return {
    id: recognition.id,
    sender: toUserSummary(recognition.sender),
    recipients: recognition.recipients.map((r) => toUserSummary(r.recipient)),
    pointsPerRecipient: recognition.pointsPerRecipient,
    text: recognition.text,
    gifUrl: recognition.gifUrl,
    hashtags: recognition.hashtags.map((h) => h.hashtag.displayName),
    createdAt: recognition.createdAt.toISOString(),
    reactions,
    comments: recognition.comments.map((c) => ({
      id: c.id,
      author: toUserSummary(c.author),
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function getRecognitionCardById(
  recognitionId: string,
): Promise<CommandResult<RecognitionCardView>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const recognition = await prisma.recognition.findUnique({
    where: { id: recognitionId },
    include: {
      sender: {
        select: { id: true, handle: true, name: true, image: true },
      },
      recipients: {
        include: {
          recipient: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
      hashtags: { include: { hashtag: true } },
      reactions: true,
      comments: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 50,
        include: {
          author: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!recognition) {
    return err("RECOGNITION_NOT_FOUND", "Recognition not found.");
  }

  return ok(toRecognitionCardView(recognition, authResult.data.id));
}
