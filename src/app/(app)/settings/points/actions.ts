"use server";

import { revalidatePath } from "next/cache";

import { getPointHistory } from "@/lib/dal/point-history";
import { convertReceivedPoints } from "@/lib/domain/points/convert-points";
import { createTestTopUp } from "@/lib/domain/points/create-test-topup";
import type { ConvertReceivedPointsData } from "@/lib/domain/points/convert-points";
import type { CreateTestTopUpData } from "@/lib/domain/points/create-test-topup";
import type { CommandResult } from "@/lib/domain/result";

export async function convertReceivedPointsAction(
  input: unknown,
): Promise<CommandResult<ConvertReceivedPointsData>> {
  const result = await convertReceivedPoints(input);
  if (result.ok) {
    revalidatePath("/settings/points");
    revalidatePath("/feed");
  }
  return result;
}

export async function createTestTopUpAction(
  input: unknown,
): Promise<CommandResult<CreateTestTopUpData>> {
  const result = await createTestTopUp(input);
  if (result.ok) {
    revalidatePath("/settings/points");
    revalidatePath("/feed");
  }
  return result;
}

export async function getPointHistoryAction(
  cursor?: string,
  limit?: number,
) {
  return getPointHistory({ cursor, limit });
}
