import "server-only";

import { prisma } from "@/lib/prisma";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export async function searchUsers(
  callerId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<UserSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: callerId },
      OR: [
        { handle: { contains: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    take: safeLimit,
    orderBy: [{ name: "asc" }, { handle: "asc" }],
    select: {
      id: true,
      handle: true,
      name: true,
      image: true,
    },
  });

  return users.map(toUserSummary);
}
