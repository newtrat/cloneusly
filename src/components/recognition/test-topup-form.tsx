"use client";

import { useState } from "react";

import { createTestTopUpAction } from "@/app/(app)/settings/points/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TestTopUpFormProps = {
  maxAmount: number;
  onSuccess?: () => void;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

export function TestTopUpForm({ maxAmount, onSuccess }: TestTopUpFormProps) {
  const [amount, setAmount] = useState("100");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await createTestTopUpAction({
      requestId: createRequestId(),
      amount: Number(amount),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess(
      `Added ${result.data.amount} test giving points. New balance: ${result.data.givingBalance}`,
    );
    onSuccess?.();
  }

  return (
    <Card
      size="sm"
      className="border-2 border-dashed border-amber-400 bg-amber-50 ring-0"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6"
        aria-labelledby="test-topup-heading"
      >
        <CardHeader>
          <CardTitle className="text-amber-900">
            <h2 id="test-topup-heading">Test top-up (testers only)</h2>
          </CardTitle>
          <CardDescription className="text-amber-800">
            Non-production test points for QA. Maximum {maxAmount} points per
            request.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="topup-amount">Amount</Label>
            <Input
              id="topup-amount"
              type="number"
              min={1}
              max={maxAmount}
              required
              value={amount}
              disabled={pending}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert role="status">
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
          >
            {pending ? "Adding…" : "Add test points"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
