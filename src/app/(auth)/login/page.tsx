import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getSessionUser } from "@/lib/auth/require-user";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user?.status === "ACTIVE") {
    redirect("/feed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to Cloneusly</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Use your provisioned company account.
        </p>
        {user?.status === "INACTIVE" ? (
          <p role="alert" className="mb-4 text-sm text-destructive">
            This account is inactive. Contact an administrator.
          </p>
        ) : null}
        <LoginForm />
      </div>
    </div>
  );
}
