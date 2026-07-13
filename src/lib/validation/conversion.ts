import { z } from "zod";

import {
  positiveSafeIntegerFromInput,
  requestIdSchema,
} from "@/lib/validation/common";

export const convertReceivedPointsInputSchema = z.object({
  requestId: requestIdSchema,
  amount: positiveSafeIntegerFromInput,
});

export type ConvertReceivedPointsInput = z.infer<
  typeof convertReceivedPointsInputSchema
>;

export function parseConvertReceivedPointsInput(
  input: unknown,
):
  | { ok: true; data: ConvertReceivedPointsInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = convertReceivedPointsInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_form";
      fieldErrors[path] = fieldErrors[path] ?? [];
      fieldErrors[path].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }
  return { ok: true, data: parsed.data };
}
