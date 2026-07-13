"use client";

import { useState } from "react";

import { createTestTopUpAction } from "@/app/(app)/settings/points/actions";

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
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-5"
      aria-labelledby="test-topup-heading"
    >
      <h2 id="test-topup-heading" className="text-lg font-semibold text-amber-900">
        Test top-up (testers only)
      </h2>
      <p className="mt-1 text-sm text-amber-800">
        Non-production test points for QA. Maximum {maxAmount} points per request.
      </p>

      <div className="mt-4">
        <label htmlFor="topup-amount" className="mb-1 block text-sm font-medium">
          Amount
        </label>
        <input
          id="topup-amount"
          type="number"
          min={1}
          max={maxAmount}
          required
          value={amount}
          disabled={pending}
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
        disabled={pending}
        className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add test points"}
      </button>
    </form>
  );
}
