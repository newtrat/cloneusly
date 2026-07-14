"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestFirstAccessLinkAction, setFirstPasswordAction } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RequestLinkForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await requestFirstAccessLinkAction({ email: email.trim() });
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert>
        <AlertDescription>
          If that email belongs to a Cloneusly account, we sent a verification
          link. Check your inbox and follow the link to set your password.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send verification link"}
      </Button>
    </form>
  );
}

function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await setFirstPasswordAction({ token, password });
    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.push("/login?firstAccess=success");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting password…" : "Set password"}
      </Button>
    </form>
  );
}

export function FirstAccessForm({
  defaultEmail = "",
  token,
}: {
  defaultEmail?: string;
  token?: string;
}) {
  if (token) {
    return <SetPasswordForm token={token} />;
  }
  return <RequestLinkForm defaultEmail={defaultEmail} />;
}
