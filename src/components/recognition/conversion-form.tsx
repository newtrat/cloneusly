"use client";

import { useState } from "react";

import { convertReceivedPointsAction } from "@/app/(app)/settings/points/actions";

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
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-lg border border-border bg-white p-5"
      aria-labelledby="conversion-heading"
    >
      <h2 id="conversion-heading" className="text-lg font-semibold">
        Convert received points
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Move points one-to-one from received to giving. You have{" "}
        <strong>{receivedBalance}</strong> received points available.
      </p>

      <div className="mt-4">
        <label htmlFor="convert-amount" className="mb-1 block text-sm font-medium">
          Amount to convert
        </label>
        <input
          id="convert-amount"
          type="number"
          min={1}
          max={receivedBalance}
          required
          value={amount}
          disabled={pending || receivedBalance === 0}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full max-w-xs rounded-md border border-border px-3 py-2"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="mt-2 text-sm text-green-700">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || receivedBalance === 0}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Converting…" : "Convert points"}
      </button>
    </form>
  );
}
