import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";
import { parseMarkNotificationsReadInput } from "@/lib/validation/social";

export type MarkNotificationsReadData = {
  updatedCount: number;
  readAt: string;
};

export async function markNotificationsRead(
  input: unknown,
): Promise<CommandResult<MarkNotificationsReadData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const parsed = parseMarkNotificationsReadInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid notification read input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const readAt = new Date();

  let updatedCount = 0;
  if (parsed.data.mode === "all") {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt },
    });
    updatedCount = result.count;
  } else {
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        id: { in: parsed.data.notificationIds },
        readAt: null,
      },
      data: { readAt },
    });
    updatedCount = result.count;
  }

  logOperation("info", "Notifications marked read", {
    operation: "markNotificationsRead",
    correlationId,
    userId: user.id,
    updatedCount,
  });

  return ok({
    updatedCount,
    readAt: readAt.toISOString(),
  });
}
