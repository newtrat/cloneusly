import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { err, type CommandResult } from "@/lib/domain/result";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  handle: string;
  status: "ACTIVE" | "INACTIVE";
  role: "MEMBER" | "TESTER";
};

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  const user = session.user as typeof session.user & {
    handle?: string;
    status?: "ACTIVE" | "INACTIVE";
    role?: "MEMBER" | "TESTER";
  };

  if (!user.handle || !user.status || !user.role) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    handle: user.handle,
    status: user.status,
    role: user.role,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireActiveUser(): Promise<
  CommandResult<AuthenticatedUser>
> {
  const user = await getSessionUser();
  if (!user) {
    return err("UNAUTHENTICATED", "Sign in to continue.");
  }
  if (user.status !== "ACTIVE") {
    return err("USER_INACTIVE", "This account is inactive.");
  }
  return { ok: true, data: user };
}

export async function requireActiveUserOrRedirect(): Promise<AuthenticatedUser> {
  const result = await requireActiveUser();
  if (!result.ok) {
    redirect("/login");
  }
  return result.data;
}
