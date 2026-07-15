"use server";

import { requestFirstAccessLink } from "@/lib/domain/auth/request-first-access";
import type { RequestFirstAccessData } from "@/lib/domain/auth/request-first-access";
import { setFirstPassword } from "@/lib/domain/auth/set-first-password";
import type { SetFirstPasswordData } from "@/lib/domain/auth/set-first-password";
import type { CommandResult } from "@/lib/domain/result";

export async function requestFirstAccessLinkAction(
  input: unknown,
): Promise<CommandResult<RequestFirstAccessData>> {
  return requestFirstAccessLink(input);
}

export async function setFirstPasswordAction(
  input: unknown,
): Promise<CommandResult<SetFirstPasswordData>> {
  return setFirstPassword(input);
}
