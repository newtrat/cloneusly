import "server-only";

import {
  generateVerificationCode,
  storeVerificationCode,
} from "@/lib/domain/auth/first-access-code";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import {
  fetchSlackProfileByEmail,
  findUserByEmailAnyStatus,
} from "@/lib/domain/users/provision-slack-user";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendFirstAccessCode } from "@/lib/slack/send-first-access-code";
import { isAllowedCompanyEmail } from "@/lib/validation/email-domain";
import { parseRequestFirstAccessInput } from "@/lib/validation/auth";

export type RequestFirstAccessData = {
  // Generic, non-enumerating acknowledgement.
  requested: true;
};

/**
 * Starts the verified first-access flow: validates the email domain and, only
 * for an eligible email, sends a one-time verification code over Slack DM.
 * Always returns a generic success so the endpoint does not reveal which emails
 * have accounts.
 */
export async function requestFirstAccessLink(
  input: unknown,
): Promise<CommandResult<RequestFirstAccessData>> {
  const correlationId = createCorrelationId();

  const parsed = parseRequestFirstAccessInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isAllowedCompanyEmail(email)) {
    return err(
      "EMAIL_DOMAIN_NOT_ALLOWED",
      `Use your @${getEnv().ALLOWED_SIGNUP_EMAIL_DOMAIN} email address.`,
      { correlationId },
    );
  }

  const slackProfile = await fetchSlackProfileByEmail(email);
  const eligible = await isEligibleForFirstAccess(email, slackProfile !== null);

  if (eligible) {
    const code = generateVerificationCode();
    await storeVerificationCode(email, code);
    await sendFirstAccessCode({
      email,
      code,
      slackUserId: slackProfile?.id ?? null,
      correlationId,
    });
  }

  logOperation("info", "First-access code requested", {
    operation: "requestFirstAccessLink",
    correlationId,
    eligible,
  });

  // Do not leak whether the email was eligible.
  return ok({ requested: true });
}

/**
 * An email is eligible when it belongs to an existing account that has not set
 * a password yet, or when it can be provisioned from a matching Slack profile.
 */
async function isEligibleForFirstAccess(
  email: string,
  hasSlackProfile: boolean,
): Promise<boolean> {
  const existing = await findUserByEmailAnyStatus(email);
  if (existing) {
    if (existing.status !== "ACTIVE") return false;
    const account = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
      select: { id: true },
    });
    return account === null;
  }

  return hasSlackProfile;
}
