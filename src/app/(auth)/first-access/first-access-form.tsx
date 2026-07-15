"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestFirstAccessLinkAction, setFirstPasswordAction } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/client";
import {
  AUTO_SIGN_IN_FAILED_MESSAGE,
  signInAfterFirstAccess,
} from "@/lib/auth/sign-in-after-first-access";

type Step = "request" | "verify";
type Status = "idle" | "requesting" | "setting" | "signing-in";

export function FirstAccessForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const pending = status !== "idle";

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("requesting");
    try {
      const result = await requestFirstAccessLinkAction({ email: email.trim() });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setStep("verify");
    } finally {
      setStatus("idle");
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("setting");
    try {
      const result = await setFirstPasswordAction({
        email: email.trim(),
        code: code.trim(),
        password,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setStatus("signing-in");
      const outcome = await signInAfterFirstAccess(signIn.email, {
        email: email.trim(),
        password,
      });

      if (outcome === "sign-in-failed") {
        setError(AUTO_SIGN_IN_FAILED_MESSAGE);
        return;
      }

      router.push("/feed");
      router.refresh();
    } finally {
      setStatus("idle");
    }
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleVerify} className="space-y-5">
        <Alert>
          <AlertDescription>
            If <strong>{email}</strong> has a Cloneusly account, we sent a
            6-digit code to that person on Slack. Enter it below to set your
            password.
          </AlertDescription>
        </Alert>
        <div className="space-y-1.5">
          <Label htmlFor="code">Slack verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
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
            <AlertDescription>
              {error}
              {error === AUTO_SIGN_IN_FAILED_MESSAGE ? (
                <>
                  {" "}
                  <Link
                    href="/login?firstAccess=success"
                    className="underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {status === "setting"
            ? "Setting password…"
            : status === "signing-in"
              ? "Signing in…"
              : "Set password"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={pending}
          onClick={() => {
            setStep("request");
            setError(null);
            setCode("");
          }}
        >
          Use a different email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequest} className="space-y-5">
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
        {status === "requesting" ? "Sending…" : "Send Slack code"}
      </Button>
    </form>
  );
}
