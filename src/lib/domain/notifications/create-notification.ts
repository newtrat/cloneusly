import "server-only";

import type { NotificationType } from "@prisma/client";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  recognitionId: string;
  actorUserId: string;
  eventKey: string;
}): Promise<void> {
  if (input.userId === input.actorUserId) return;

  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        recognitionId: input.recognitionId,
        actorUserId: input.actorUserId,
        eventKey: input.eventKey,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}
