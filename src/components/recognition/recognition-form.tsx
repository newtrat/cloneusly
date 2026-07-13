"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { sendRecognitionAction } from "@/app/(app)/feed/actions";
import { RecipientPicker } from "@/components/recognition/recipient-picker";
import type { UserSummary } from "@/lib/dal/current-user";

type RecognitionFormProps = {
  onSuccess?: () => void;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

export function RecognitionForm({ onSuccess }: RecognitionFormProps) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<UserSummary[]>([]);
  const [pointsPerRecipient, setPointsPerRecipient] = useState("10");
  const [text, setText] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const points = Number(pointsPerRecipient);
  const totalCost = useMemo(() => {
    if (!Number.isFinite(points) || points <= 0 || recipients.length === 0) {
      return null;
    }
    return points * recipients.length;
  }, [points, recipients.length]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const hashtags = hashtagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await sendRecognitionAction({
      requestId: createRequestId(),
      recipientIds: recipients.map((r) => r.id),
      pointsPerRecipient: points,
      text: text.trim() || undefined,
      gifUrl: gifUrl.trim() || undefined,
      hashtags,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.fieldErrors) {
        setFieldErrors(result.error.fieldErrors);
      }
      return;
    }

    router.refresh();
    onSuccess?.();

    setRecipients([]);
    setText("");
    setGifUrl("");
    setHashtagsInput("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-white p-5">
        <h2 className="text-lg font-semibold">Send recognition</h2>

        <RecipientPicker
          selected={recipients}
          onChange={setRecipients}
          disabled={pending}
        />

        <div>
          <label htmlFor="points" className="mb-1 block text-sm font-medium">
            Points per recipient
          </label>
          <input
            id="points"
            type="number"
            min={1}
            required
            value={pointsPerRecipient}
            disabled={pending}
            onChange={(e) => setPointsPerRecipient(e.target.value)}
            className="w-full max-w-xs rounded-md border border-border px-3 py-2"
          />
          {totalCost !== null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Total cost: {totalCost} giving points
            </p>
          ) : null}
          {fieldErrors.pointsPerRecipient?.map((msg) => (
            <p key={msg} className="text-sm text-destructive">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="text" className="mb-1 block text-sm font-medium">
            Message
          </label>
          <textarea
            id="text"
            rows={3}
            value={text}
            disabled={pending}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2"
            placeholder="Thank you for…"
          />
          {fieldErrors.text?.map((msg) => (
            <p key={msg} className="text-sm text-destructive">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="gifUrl" className="mb-1 block text-sm font-medium">
            GIF URL (optional)
          </label>
          <input
            id="gifUrl"
            type="url"
            value={gifUrl}
            disabled={pending}
            onChange={(e) => setGifUrl(e.target.value)}
            placeholder="https://media.giphy.com/..."
            className="w-full rounded-md border border-border px-3 py-2"
          />
          {fieldErrors.gifUrl?.map((msg) => (
            <p key={msg} className="text-sm text-destructive">
              {msg}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="hashtags" className="mb-1 block text-sm font-medium">
            Hashtags
          </label>
          <input
            id="hashtags"
            type="text"
            value={hashtagsInput}
            disabled={pending}
            onChange={(e) => setHashtagsInput(e.target.value)}
            placeholder="#teamwork #kudos"
            className="w-full rounded-md border border-border px-3 py-2"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || recipients.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send recognition"}
        </button>
      </form>
    </div>
  );
}
