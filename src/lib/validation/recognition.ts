import { z } from "zod";

import { getEnv } from "@/lib/env";
import {
  computeTotalCost,
  hasDuplicateStrings,
  positiveSafeIntegerFromInput,
  requestIdSchema,
} from "@/lib/validation/common";

export const sendRecognitionInputSchema = z
  .object({
    requestId: requestIdSchema,
    recipientIds: z
      .array(z.string().trim().min(1))
      .min(1, "Select at least one recipient"),
    pointsPerRecipient: positiveSafeIntegerFromInput,
    text: z
      .string()
      .trim()
      .max(2000, "Text must be at most 2000 characters")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    gifUrl: z
      .string()
      .trim()
      .url("GIF URL must be a valid URL")
      .max(2048, "GIF URL must be at most 2048 characters")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    hashtags: z.array(z.string()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (hasDuplicateStrings(data.recipientIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate recipients are not allowed",
        path: ["recipientIds"],
      });
    }

    const totalCost = computeTotalCost(
      data.pointsPerRecipient,
      data.recipientIds.length,
    );
    if (totalCost === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total cost exceeds safe integer limit",
        path: ["pointsPerRecipient"],
      });
    }

    if (!data.text && !data.gifUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide recognition text or a GIF URL",
        path: ["text"],
      });
    }
  });

export type SendRecognitionInput = z.infer<typeof sendRecognitionInputSchema>;

export function validateGifHost(gifUrl: string): boolean {
  try {
    const url = new URL(gifUrl);
    if (url.protocol !== "https:") return false;
    const env = getEnv();
    return env.ALLOWED_GIF_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

export function parseSendRecognitionInput(
  input: unknown,
):
  | { ok: true; data: SendRecognitionInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = sendRecognitionInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_form";
      fieldErrors[path] = fieldErrors[path] ?? [];
      fieldErrors[path].push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  if (parsed.data.gifUrl && !validateGifHost(parsed.data.gifUrl)) {
    return {
      ok: false,
      fieldErrors: {
        gifUrl: ["GIF host is not on the allowlist"],
      },
    };
  }

  return { ok: true, data: parsed.data };
}
