import { z } from "zod";

import { trimmedNonEmptyString } from "@/lib/validation/common";

export const reactionTypes = ["CLAP", "HEART", "CELEBRATE"] as const;
export type ReactionTypeInput = (typeof reactionTypes)[number];

export const addCommentInputSchema = z.object({
  recognitionId: z.string().trim().min(1),
  body: trimmedNonEmptyString(1000, "Comment"),
});

export type AddCommentInput = z.infer<typeof addCommentInputSchema>;

export const toggleReactionInputSchema = z.object({
  recognitionId: z.string().trim().min(1),
  reactionType: z.enum(reactionTypes),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionInputSchema>;

export const markNotificationsReadInputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("selected"),
    notificationIds: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    mode: z.literal("all"),
  }),
]);

export type MarkNotificationsReadInput = z.infer<
  typeof markNotificationsReadInputSchema
>;

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    fieldErrors[path] = fieldErrors[path] ?? [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

export function parseAddCommentInput(
  input: unknown,
):
  | { ok: true; data: AddCommentInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = addCommentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  return { ok: true, data: parsed.data };
}

export function parseToggleReactionInput(
  input: unknown,
):
  | { ok: true; data: ToggleReactionInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = toggleReactionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  return { ok: true, data: parsed.data };
}

export function parseMarkNotificationsReadInput(
  input: unknown,
):
  | { ok: true; data: MarkNotificationsReadInput }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = markNotificationsReadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  return { ok: true, data: parsed.data };
}
