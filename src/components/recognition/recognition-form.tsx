"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { searchUsersAction, sendRecognitionAction } from "@/app/(app)/feed/actions";
import { GifPicker } from "@/components/recognition/gif-picker";
import { GifPreview } from "@/components/recognition/gif-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { UserSummary } from "@/lib/dal/current-user";
import { resolveGifUrl } from "@/lib/gif/curated";
import { parseRecognitionText } from "@/lib/recognition/parse-recognition-text";
import { cn } from "@/lib/utils";

type RecognitionFormProps = {
  onSuccess?: () => void;
};

type MentionState = {
  query: string;
  triggerIndex: number;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [rawText, setRawText] = useState("");
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionResults, setMentionResults] = useState<UserSummary[]>([]);
  const [resolvedHandles, setResolvedHandles] = useState<Map<string, UserSummary>>(new Map());
  const [gifUrl, setGifUrl] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const latestSearchId = useRef(0);

  const search = useCallback(async (query: string) => {
    if (query.length < 1) {
      setMentionResults([]);
      return;
    }
    const id = ++latestSearchId.current;
    const response = await searchUsersAction(query, 8);
    if (id !== latestSearchId.current) return;
    setMentionResults(response.ok ? response.data : []);
  }, []);

  useEffect(() => {
    if (mentionState === null) {
      setMentionResults([]);
      return;
    }
    const timer = setTimeout(() => void search(mentionState.query), 200);
    return () => clearTimeout(timer);
  }, [mentionState, search]);

  const parsed = useMemo(() => parseRecognitionText(rawText), [rawText]);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setRawText(value);
    setError(null);

    const textBeforeCursor = value.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([\w.]*)$/);
    if (atMatch) {
      setMentionState({
        query: atMatch[1],
        triggerIndex: cursor - atMatch[0].length,
      });
    } else {
      setMentionState(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && mentionState !== null) {
      e.preventDefault();
      setMentionState(null);
      setMentionResults([]);
    }
  }

  function selectMention(user: UserSummary) {
    if (!mentionState) return;
    const { triggerIndex, query } = mentionState;
    const before = rawText.slice(0, triggerIndex);
    const after = rawText.slice(triggerIndex + 1 + query.length);
    const newText = `${before}@${user.handle} ${after}`;
    setRawText(newText);
    setResolvedHandles((prev) => new Map(prev).set(user.handle, user));
    setMentionState(null);
    setMentionResults([]);
    textareaRef.current?.focus();
  }

  function handleGifDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (pending) return;
    const url = extractGifUrlFromDrop(e.dataTransfer);
    if (url) {
      setGifUrl(url);
      setShowGifPicker(false);
      setDropHint(null);
    } else if (e.dataTransfer.files.length > 0) {
      setDropHint(
        "Uploading local files isn’t supported. Use the GIF button, or drag a GIF from a website like Giphy.",
      );
    } else {
      setDropHint(
        "Couldn’t read a GIF from that. Drag the GIF image itself, or use the GIF button.",
      );
    }
  }

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? rawText.length;
    const end = el.selectionEnd ?? rawText.length;
    const newText = rawText.slice(0, start) + text + rawText.slice(end);
    setRawText(newText);
    if (text === "@") {
      setMentionState({ query: "", triggerIndex: start });
    }
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.handles.length === 0 || !parsed.points) return;
    setPending(true);
    setError(null);
    setFieldErrors({});

    // Resolve any handles that weren't selected from the dropdown
    const resolved = new Map(resolvedHandles);
    const unresolved = parsed.handles.filter((h) => !resolved.has(h));
    for (const handle of unresolved) {
      const response = await searchUsersAction(handle, 5);
      if (response.ok) {
        const match = response.data.find((u) => u.handle === handle);
        if (match) resolved.set(handle, match);
      }
    }

    const finalRecipients = parsed.handles
      .map((h) => resolved.get(h))
      .filter((u): u is UserSummary => u !== undefined);

    if (finalRecipients.length === 0) {
      setError("No valid recipients found. Check the @handles and try again.");
      setPending(false);
      return;
    }

    const unknownHandles = parsed.handles.filter((h) => !resolved.has(h));
    if (unknownHandles.length > 0) {
      setError(`Could not find: ${unknownHandles.map((h) => `@${h}`).join(", ")}`);
      setPending(false);
      return;
    }

    const trimmedGifUrl = gifUrl.trim();
    const gifUrlToSend = trimmedGifUrl
      ? (resolveGifUrl(trimmedGifUrl) ?? trimmedGifUrl)
      : undefined;

    const result = await sendRecognitionAction({
      requestId: createRequestId(),
      recipientIds: finalRecipients.map((r) => r.id),
      pointsPerRecipient: parsed.points,
      text: parsed.messageText || undefined,
      gifUrl: gifUrlToSend,
      hashtags: parsed.hashtags,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }

    router.refresh();
    onSuccess?.();
    setRawText("");
    setGifUrl("");
    setShowGifPicker(false);
    setDropHint(null);
    setResolvedHandles(new Map());
    setMentionState(null);
  }

  const showMentionDropdown = mentionState !== null && mentionResults.length > 0;
  const allFieldErrors = Object.values(fieldErrors).flat();

  return (
    <Card size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <CardHeader>
          <CardTitle>
            <h2>Send recognition</h2>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Combined input area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!pending) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleGifDrop}
            className={cn(
              "relative rounded-sm border transition-colors focus-within:border-ring",
              dragActive
                ? "border-primary bg-primary/5"
                : allFieldErrors.length > 0
                  ? "border-destructive"
                  : "border-input",
            )}
          >
            <Textarea
              ref={textareaRef}
              value={rawText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={pending}
              placeholder="Type @ for a recipient, + for points, # for a hashtag"
              className="min-h-28 border-transparent px-3 py-3 focus-visible:border-transparent"
              aria-label="Recognition message"
              aria-invalid={allFieldErrors.length > 0}
            />

            {/* @ mention dropdown */}
            {showMentionDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-sm border border-border bg-popover shadow-md">
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandGroup>
                      {mentionResults.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => selectMention(user)}
                        >
                          {user.name}{" "}
                          <span className="text-muted-foreground">
                            @{user.handle}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}

            <Separator />

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => insertAtCursor("@")}
              >
                @ recipient
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => insertAtCursor("+")}
              >
                + amount
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => insertAtCursor("#")}
              >
                # hashtag
              </Button>
              <div className="ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={pending}
                  onClick={() => setShowGifPicker((v) => !v)}
                  aria-expanded={showGifPicker}
                >
                  GIF
                </Button>
              </div>
            </div>
          </div>

          {/* Live parse preview */}
          {(parsed.handles.length > 0 ||
            parsed.points !== null ||
            parsed.hashtags.length > 0) && (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {parsed.handles.length > 0 && (
                <p>
                  To:{" "}
                  {parsed.handles
                    .map((h) => resolvedHandles.get(h)?.name ?? `@${h}`)
                    .join(", ")}
                </p>
              )}
              {parsed.points !== null && (
                <p>
                  Points: {parsed.points} per recipient
                  {parsed.handles.length > 0 &&
                    ` · ${parsed.points * parsed.handles.length} total`}
                </p>
              )}
              {parsed.hashtags.length > 0 && (
                <p>{parsed.hashtags.map((h) => `#${h}`).join(" ")}</p>
              )}
            </div>
          )}

          {/* GIF picker and preview */}
          {showGifPicker && !gifUrl && (
            <GifPicker
              onSelect={(url) => {
                setGifUrl(url);
                setShowGifPicker(false);
              }}
              onClose={() => setShowGifPicker(false)}
            />
          )}
          {gifUrl && (
            <div className="space-y-2">
              <GifPreview gifUrl={gifUrl} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGifUrl("")}
                disabled={pending}
              >
                Remove GIF
              </Button>
            </div>
          )}
          {dropHint && !gifUrl && (
            <p className="text-sm text-muted-foreground">{dropHint}</p>
          )}

          {/* Errors */}
          {allFieldErrors.map((msg) => (
            <p key={msg} className="text-sm text-destructive">
              {msg}
            </p>
          ))}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={pending || parsed.handles.length === 0 || !parsed.points}
            className="w-full"
          >
            {pending ? "Sending…" : "Give recognition"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
