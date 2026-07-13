import { z } from "zod";

import {
  positiveSafeIntegerFromInput,
  requestIdSchema,
} from "@/lib/validation/common";

export const createTestTopUpInputSchema = z.object({
  requestId: requestIdSchema,
  amount: positiveSafeIntegerFromInput,
});

export type CreateTestTopUpInput = z.infer<typeof createTestTopUpInputSchema>;

export function parseCreateTestTopUpInput(
  input: unknown,
  maxAmount: number,
):
  | { ok: true; data: CreateTestTopUpInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = createTestTopUpInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_form";
      fieldErrors[path] = fieldErrors[path] ?? [];
      fieldErrors[path].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  if (parsed.data.amount > maxAmount) {
    return {
      ok: false,
      fieldErrors: {
        amount: [`Amount must be at most ${maxAmount}`],
      },
    };
  }

  return { ok: true, data: parsed.data };
}
