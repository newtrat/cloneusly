import "server-only";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  toUserSummary,
  type CurrentAccountView,
} from "@/lib/dal/current-user";
import { requireActiveUser } from "@/lib/auth/require-user";
import { err, ok, type CommandResult } from "@/lib/domain/result";

export async function getCurrentAccount(): Promise<
  CommandResult<CurrentAccountView>
> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const env = getEnv();

  const [pointAccount, unreadNotificationCount] = await Promise.all([
    prisma.pointAccount.findUnique({ where: { userId: user.id } }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  if (!pointAccount) {
    return err("INTERNAL_ERROR", "Point account not found.");
  }

  return ok({
    user: toUserSummary(user),
    role: user.role,
    givingBalance: pointAccount.givingBalance,
    receivedBalance: pointAccount.receivedBalance,
    unreadNotificationCount,
    testTopUpsEnabled: env.ENABLE_TEST_TOPUPS,
  });
}
