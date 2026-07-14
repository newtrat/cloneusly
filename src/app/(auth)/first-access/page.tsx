import { redirect } from "next/navigation";

import { FirstAccessForm } from "./first-access-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/require-user";

export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user?.status === "ACTIVE") {
    redirect("/feed");
  }

  const params = await searchParams;
  const emailParam = params.email;
  const defaultEmail = typeof emailParam === "string" ? emailParam : "";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md" aria-labelledby="first-access-heading">
        <CardHeader>
          <CardTitle>
            <h1 id="first-access-heading">Set up your Cloneusly account</h1>
          </CardTitle>
          <CardDescription>
            If you were added via Slack but haven&apos;t signed in before,
            enter your email to set a password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FirstAccessForm defaultEmail={defaultEmail} />
        </CardContent>
      </Card>
    </main>
  );
}
