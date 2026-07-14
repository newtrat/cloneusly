"use client";

import { useState } from "react";

import { convertReceivedPointsAction } from "@/app/(app)/settings/points/actions";
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

type ConversionFormProps = {
  receivedBalance: number;
  onSuccess?: () => void;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

export function ConversionForm({
  receivedBalance,
  onSuccess,
}: ConversionFormProps) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await convertReceivedPointsAction({
      requestId: createRequestId(),
      amount: Number(amount),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess(
      `Converted ${result.data.amount} points. Giving: ${result.data.givingBalance}, Received: ${result.data.receivedBalance}`,
    );
    setAmount("");
    onSuccess?.();
  }

  return (
    <Card size="sm">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6"
        aria-labelledby="conversion-heading"
      >
        <CardHeader>
          <CardTitle>
            <h2 id="conversion-heading">Convert received points</h2>
          </CardTitle>
          <CardDescription>
            Move points one-to-one from received to giving. You have{" "}
            <strong>{receivedBalance}</strong> received points available.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="convert-amount">Amount to convert</Label>
            <Input
              id="convert-amount"
              type="number"
              min={1}
              max={receivedBalance}
              required
              value={amount}
              disabled={pending || receivedBalance === 0}
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
            disabled={pending || receivedBalance === 0}
            className="w-full sm:w-auto"
          >
            {pending ? "Converting…" : "Convert points"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
