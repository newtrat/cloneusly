import "server-only";

import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import { consumeVerificationCode } from "@/lib/domain/auth/first-access-code";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import {
  fetchSlackProfileByEmail,
  findUserByEmailAnyStatus,
  provisionUserFromSlackProfile,
} from "@/lib/domain/users/provision-slack-user";
import { prisma } from "@/lib/prisma";
import { isAllowedCompanyEmail } from "@/lib/validation/email-domain";
import { parseSetFirstPasswordInput } from "@/lib/validation/auth";

export type SetFirstPasswordData = {
  email: string;
};

export async function setFirstPassword(
  input: unknown,
): Promise<CommandResult<SetFirstPasswordData>> {
  const correlationId = createCorrelationId();

  const parsed = parseSetFirstPasswordInput(input);
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
      "This email domain is not allowed.",
      { correlationId },
    );
  }

  // Email ownership is proven by consuming the one-time code sent over Slack DM.
  const codeValid = await consumeVerificationCode(email, parsed.data.code);
  if (!codeValid) {
    return err(
      "INVALID_OR_EXPIRED_CODE",
      "That code is invalid or has expired. Request a new one.",
      { correlationId },
    );
  }

  const existing = await findUserByEmailAnyStatus(email);

  if (existing && existing.status !== "ACTIVE") {
    return err(
      "ACCOUNT_NOT_FOUND",
      "No Cloneusly account found for that email.",
      { correlationId },
    );
  }

  let userId: string;
  let userEmail: string;
  if (existing) {
    userId = existing.id;
    userEmail = existing.email;
  } else {
    const slackProfile = await fetchSlackProfileByEmail(email);
    if (!slackProfile) {
      return err(
        "ACCOUNT_NOT_FOUND",
        "No Cloneusly account found for that email.",
        { correlationId },
      );
    }
    const provisioned = await provisionUserFromSlackProfile(slackProfile, email);
    userId = provisioned.id;
    userEmail = provisioned.email;
  }

  // The verified Slack code proves ownership, so this flow both sets a first
  // password and resets an existing one: update the credential if present,
  // otherwise create it.
  const hashedPassword = await hashPassword(parsed.data.password);

  try {
    const existingAccount = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
        },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // A concurrent request created the credential first; reset it instead.
      const raced = await prisma.account.findFirst({
        where: { userId, providerId: "credential" },
        select: { id: true },
      });
      if (raced) {
        await prisma.account.update({
          where: { id: raced.id },
          data: { password: hashedPassword },
        });
        return ok({ email: userEmail });
      }
    }

    logOperation("error", "Failed to set first password", {
      operation: "setFirstPassword",
      correlationId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return err("INTERNAL_ERROR", "Unable to set password.", {
      correlationId,
    });
  }

  logOperation("info", "First password set", {
    operation: "setFirstPassword",
    correlationId,
    userId,
  });

  return ok({ email: userEmail });
}
