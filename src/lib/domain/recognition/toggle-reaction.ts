import "server-only";

import { Prisma } from "@prisma/client";

import { requireActiveUser } from "@/lib/auth/require-user";
import { createNotification } from "@/lib/domain/notifications/create-notification";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";
import { parseToggleReactionInput } from "@/lib/validation/social";

export type ToggleReactionData = {
  recognitionId: string;
  reactionType: "CLAP" | "HEART" | "CELEBRATE";
  active: boolean;
  count: number;
};

export async function toggleReaction(
  input: unknown,
): Promise<CommandResult<ToggleReactionData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const parsed = parseToggleReactionInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid reaction input.", {
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

  const existing = await prisma.reaction.findUnique({
    where: {
      recognitionId_userId_reactionType: {
        recognitionId: data.recognitionId,
        userId: user.id,
        reactionType: data.reactionType,
      },
    },
  });

  let active: boolean;

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    active = false;
  } else {
    try {
      await prisma.reaction.create({
        data: {
          recognitionId: data.recognitionId,
          userId: user.id,
          reactionType: data.reactionType,
        },
      });
      active = true;

      await createNotification({
        userId: recognition.senderId,
        type: "RECOGNITION_REACTION",
        recognitionId: recognition.id,
        actorUserId: user.id,
        eventKey: `${recognition.id}:reaction:${user.id}:${data.reactionType}`,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        active = true;
      } else {
        throw error;
      }
    }
  }

  const count = await prisma.reaction.count({
    where: {
      recognitionId: data.recognitionId,
      reactionType: data.reactionType,
    },
  });

  logOperation("info", "Reaction toggled", {
    operation: "toggleReaction",
    correlationId,
    userId: user.id,
    recognitionId: data.recognitionId,
    active,
  });

  return ok({
    recognitionId: data.recognitionId,
    reactionType: data.reactionType,
    active,
    count,
  });
}
