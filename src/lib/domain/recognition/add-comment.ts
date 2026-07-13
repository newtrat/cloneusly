import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary } from "@/lib/dal/current-user";
import { createNotification } from "@/lib/domain/notifications/create-notification";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";
import { parseAddCommentInput } from "@/lib/validation/social";

export type AddCommentData = {
  comment: {
    id: string;
    recognitionId: string;
    author: ReturnType<typeof toUserSummary>;
    body: string;
    createdAt: string;
  };
};

export async function addComment(
  input: unknown,
): Promise<CommandResult<AddCommentData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const parsed = parseAddCommentInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid comment input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const data = parsed.data;

  const recognition = await prisma.recognition.findUnique({
    where: { id: data.recognitionId },
    select: { id: true, senderId: true },
  });

  if (!recognition) {
    return err("RECOGNITION_NOT_FOUND", "Recognition not found.", {
      correlationId,
    });
  }

  const comment = await prisma.comment.create({
    data: {
      recognitionId: data.recognitionId,
      authorId: user.id,
      body: data.body,
    },
    include: {
      author: {
        select: { id: true, handle: true, name: true, image: true },
      },
    },
  });

  await createNotification({
    userId: recognition.senderId,
    type: "RECOGNITION_COMMENT",
    recognitionId: recognition.id,
    actorUserId: user.id,
    eventKey: `${recognition.id}:comment:${comment.id}`,
  });

  logOperation("info", "Comment added", {
    operation: "addComment",
    correlationId,
    userId: user.id,
    recognitionId: recognition.id,
  });

  return ok({
    comment: {
      id: comment.id,
      recognitionId: comment.recognitionId,
      author: toUserSummary(comment.author),
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
