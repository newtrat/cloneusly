"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { sendRecognitionAction } from "@/app/(app)/feed/actions";
import { GifPicker } from "@/components/recognition/gif-picker";
import { GifPreview } from "@/components/recognition/gif-preview";
import { RecipientPicker } from "@/components/recognition/recipient-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserSummary } from "@/lib/dal/current-user";
import { resolveGifUrl } from "@/lib/gif/curated";
import { cn } from "@/lib/utils";

type RecognitionFormProps = {
  onSuccess?: () => void;
};

function createRequestId(): string {
  return crypto.randomUUID();
}

function extractGifUrlFromDrop(dataTransfer: DataTransfer): string | null {
  const candidates: string[] = [];

  const uriList = dataTransfer.getData("text/uri-list");
  if (uriList) {
    for (const line of uriList.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) candidates.push(trimmed);
    }
  }

  const plain = dataTransfer.getData("text/plain");
  if (plain) candidates.push(plain.trim());

  const html = dataTransfer.getData("text/html");
  if (html) {
    const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img) candidates.push(img[1].trim());
    const href = html.match(/<a[^>]+href=["']([^"']+)["']/i);
    if (href) candidates.push(href[1].trim());
  }

  for (const candidate of candidates) {
    const resolved = resolveGifUrl(candidate);
    if (resolved) return resolved;
  }
  return null;
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
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      setDropHint(
        "Uploading local files isn’t supported. Use “Choose a GIF”, or drag a GIF from a website like Giphy.",
      );
    } else {
      setDropHint(
        "Couldn’t read a GIF from that. Drag the GIF image itself from a site like Giphy, or paste its URL below.",
      );
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

    const trimmedGifUrl = gifUrl.trim();
    const gifUrlToSend = trimmedGifUrl
      ? (resolveGifUrl(trimmedGifUrl) ?? trimmedGifUrl)
      : undefined;

    const result = await sendRecognitionAction({
      requestId: createRequestId(),
      recipientIds: recipients.map((r) => r.id),
      pointsPerRecipient: points,
      text: text.trim() || undefined,
      gifUrl: gifUrlToSend,
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
    <Card size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <CardHeader>
          <CardTitle>
            <h2>Send recognition</h2>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <RecipientPicker
            selected={recipients}
            onChange={setRecipients}
            disabled={pending}
          />

          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="points">Points per recipient</Label>
            <Input
              id="points"
              type="number"
              min={1}
              required
              value={pointsPerRecipient}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.pointsPerRecipient)}
              onChange={(e) => setPointsPerRecipient(e.target.value)}
            />
            <p className="text-muted-foreground text-sm">
              Total cost:{" "}
              {totalCost === null
                ? "add a recipient to calculate"
                : `${totalCost} giving points`}
            </p>
            {fieldErrors.pointsPerRecipient?.map((msg) => (
              <p key={msg} className="text-destructive text-sm">
                {msg}
              </p>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="text">Message</Label>
            <Textarea
              id="text"
              rows={3}
              value={text}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.text)}
              onChange={(e) => setText(e.target.value)}
              placeholder="Thank you for…"
            />
            {fieldErrors.text?.map((msg) => (
              <p key={msg} className="text-destructive text-sm">
                {msg}
              </p>
            ))}
          </div>

          <div
            className="space-y-1.5"
            onDragOver={(e) => {
              e.preventDefault();
              if (!pending) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleGifDrop}
          >
            <Label htmlFor="gifUrl">GIF (optional)</Label>
            <div
              className={cn(
                "rounded-md border border-dashed p-3 transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              {gifUrl ? (
                <div className="space-y-2">
                  <GifPreview gifUrl={gifUrl} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGifUrl("");
                      setDropHint(null);
                    }}
                    disabled={pending}
                  >
                    Remove GIF
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-muted-foreground text-sm">
                    Drag a GIF here, choose one, or paste a URL.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGifPicker((open) => !open)}
                    disabled={pending}
                    aria-expanded={showGifPicker}
                  >
                    {showGifPicker ? "Hide GIF picker" : "Choose a GIF"}
                  </Button>
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

            <Input
              id="gifUrl"
              type="url"
              value={gifUrl}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.gifUrl)}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="https://media.giphy.com/..."
              aria-label="GIF URL"
            />

            {dropHint ? (
              <p className="text-muted-foreground text-sm">{dropHint}</p>
            ) : null}
            {fieldErrors.gifUrl?.map((msg) => (
              <p key={msg} className="text-destructive text-sm">
                {msg}
              </p>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              type="text"
              value={hashtagsInput}
              disabled={pending}
              onChange={(e) => setHashtagsInput(e.target.value)}
              placeholder="#teamwork #kudos"
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={pending || recipients.length === 0}
            className="w-full sm:w-auto"
          >
            {pending ? "Sending…" : "Send recognition"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
