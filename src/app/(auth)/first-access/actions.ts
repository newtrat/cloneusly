"use server";

import { setFirstPassword } from "@/lib/domain/auth/set-first-password";
import type { SetFirstPasswordData } from "@/lib/domain/auth/set-first-password";
import type { CommandResult } from "@/lib/domain/result";

export async function setFirstPasswordAction(
  input: unknown,
): Promise<CommandResult<SetFirstPasswordData>> {
  return setFirstPassword(input);
}
