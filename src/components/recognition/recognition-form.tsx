"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { sendRecognitionAction } from "@/app/(app)/feed/actions";
import { RecipientPicker } from "@/components/recognition/recipient-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

          <div className="space-y-1.5">
            <Label htmlFor="gifUrl">GIF URL (optional)</Label>
            <Input
              id="gifUrl"
              type="url"
              value={gifUrl}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.gifUrl)}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="https://media.giphy.com/..."
            />
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
