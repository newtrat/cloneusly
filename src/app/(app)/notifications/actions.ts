"use server";

import { revalidatePath } from "next/cache";

import { markNotificationsRead } from "@/lib/domain/notifications/mark-read";
import { getNotifications } from "@/lib/dal/notifications";
import type { MarkNotificationsReadData } from "@/lib/domain/notifications/mark-read";
import type { CommandResult } from "@/lib/domain/result";

export async function markNotificationsReadAction(
  input: unknown,
): Promise<CommandResult<MarkNotificationsReadData>> {
  const result = await markNotificationsRead(input);
  if (result.ok) {
    revalidatePath("/notifications");
    revalidatePath("/feed");
  }
  return result;
}

export async function getNotificationsAction(
  cursor?: string,
  unreadOnly?: boolean,
) {
  return getNotifications({ cursor, unreadOnly });
}
