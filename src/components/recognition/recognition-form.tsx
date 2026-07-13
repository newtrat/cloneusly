"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { sendRecognitionAction } from "@/app/(app)/feed/actions";
import { GifPicker } from "@/components/recognition/gif-picker";
import { GifPreview } from "@/components/recognition/gif-preview";
import { RecipientPicker } from "@/components/recognition/recipient-picker";
import type { UserSummary } from "@/lib/dal/current-user";
import { normalizeGifHost } from "@/lib/gif/curated";

type RecognitionFormProps = {
  onSuccess?: () => void;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

function extractGifUrlFromDrop(dataTransfer: DataTransfer): string | null {
  const uriList = dataTransfer.getData("text/uri-list");
  const plain = dataTransfer.getData("text/plain");
  const html = dataTransfer.getData("text/html");

  let candidate = (uriList || plain || "").trim();
  if (!candidate && html) {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) candidate = match[1].trim();
  }
  if (!candidate) return null;

  return normalizeGifHost(candidate);
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
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);

  function handleGifDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    if (pending) return;
    const url = extractGifUrlFromDrop(event.dataTransfer);
    if (url) {
      setGifUrl(url);
      setDropHint(null);
      setShowGifPicker(false);
    } else {
      setDropHint("Drop a GIF image or paste its URL below.");
    }
  }

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
    setShowGifPicker(false);
    setDropHint(null);
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
          <span className="mb-1 block text-sm font-medium">GIF (optional)</span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!pending) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleGifDrop}
            className={`rounded-md border border-dashed p-3 transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {gifUrl ? (
              <div className="space-y-2">
                <GifPreview gifUrl={gifUrl} />
                <button
                  type="button"
                  onClick={() => {
                    setGifUrl("");
                    setDropHint(null);
                  }}
                  disabled={pending}
                  className="text-sm text-destructive underline"
                >
                  Remove GIF
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  Drag a GIF here, choose one, or paste a URL.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGifPicker((open) => !open)}
                  disabled={pending}
                  aria-expanded={showGifPicker}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {showGifPicker ? "Hide GIF picker" : "Choose a GIF"}
                </button>
              </div>
            )}
          </div>

          {showGifPicker && !gifUrl ? (
            <GifPicker
              onSelect={(url) => {
                setGifUrl(url);
                setShowGifPicker(false);
                setDropHint(null);
              }}
              onClose={() => setShowGifPicker(false)}
            />
          ) : null}

          <input
            type="url"
            value={gifUrl}
            disabled={pending}
            onChange={(e) => setGifUrl(e.target.value)}
            placeholder="https://media.giphy.com/..."
            aria-label="GIF URL"
            className="mt-2 w-full rounded-md border border-border px-3 py-2"
          />

          {dropHint ? (
            <p className="text-sm text-muted-foreground">{dropHint}</p>
          ) : null}
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
