"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAccount } from "@/lib/dal/point-accounts";
import type { CursorPage } from "@/lib/dal/cursor";
import type { UserSummary, CurrentAccountView } from "@/lib/dal/current-user";
import {
  getFeed,
  getRecognitionCardById,
  type GetFeedInput,
  type RecognitionCardView,
} from "@/lib/dal/recognition-feed";
import { searchUsers } from "@/lib/dal/users";
import { searchGifs } from "@/lib/gif/search";
import type { GifResult } from "@/lib/gif/curated";
import { requireActiveUser } from "@/lib/auth/require-user";
import { addComment } from "@/lib/domain/recognition/add-comment";
import { sendRecognition } from "@/lib/domain/recognition/send-recognition";
import type { SendRecognitionData } from "@/lib/domain/recognition/send-recognition";
import { toggleReaction } from "@/lib/domain/recognition/toggle-reaction";
import type { CommandResult } from "@/lib/domain/result";

export type RecognitionDisplay = RecognitionCardView;

export async function sendRecognitionAction(
  input: unknown,
): Promise<CommandResult<SendRecognitionData>> {
  const result = await sendRecognition(input);
  if (result.ok) {
    revalidatePath("/feed");
    revalidatePath("/notifications");
    revalidatePath("/leaderboard");
  }
  return result;
}

export async function searchUsersAction(
  query: string,
  limit?: number,
): Promise<CommandResult<UserSummary[]>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const users = await searchUsers(authResult.data.id, query, limit);
  return { ok: true, data: users };
}

export async function searchGifsAction(
  query: string,
): Promise<CommandResult<GifResult[]>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const gifs = await searchGifs(query);
  return { ok: true, data: gifs };
}

export async function getCurrentAccountAction(): Promise<
  CommandResult<CurrentAccountView>
> {
  return getCurrentAccount();
}

export async function getFeedAction(
  input: GetFeedInput = {},
): Promise<CommandResult<CursorPage<RecognitionCardView>>> {
  return getFeed(input);
}

export async function addCommentAction(input: unknown) {
  const result = await addComment(input);
  if (result.ok) {
    revalidatePath("/feed");
    revalidatePath("/notifications");
  }
  return result;
}

export async function toggleReactionAction(input: unknown) {
  const result = await toggleReaction(input);
  if (result.ok) {
    revalidatePath("/feed");
    revalidatePath("/notifications");
  }
  return result;
}

export async function getRecognitionForDisplay(
  recognitionId: string,
): Promise<CommandResult<RecognitionDisplay>> {
  return getRecognitionCardById(recognitionId);
}

export async function getRecognitionCardAction(recognitionId: string) {
  return getRecognitionCardById(recognitionId);
}
