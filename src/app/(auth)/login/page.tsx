import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/require-user";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user?.status === "ACTIVE") {
    redirect("/feed");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md" aria-labelledby="login-heading">
        <CardHeader>
          <CardTitle>
            <h1 id="login-heading">Sign in to Cloneusly</h1>
          </CardTitle>
          <CardDescription>
            Use your provisioned company account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {user?.status === "INACTIVE" ? (
            <Alert variant="destructive">
              <AlertDescription>
                This account is inactive. Contact an administrator.
              </AlertDescription>
            </Alert>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
