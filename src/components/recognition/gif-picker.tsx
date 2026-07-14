"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { searchGifsAction } from "@/app/(app)/feed/actions";
import type { GifResult } from "@/lib/gif/curated";

type GifPickerProps = {
  onSelect: (url: string) => void;
  onClose: () => void;
};

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestIdRef.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        const result = await searchGifsAction(query);
        if (currentRequest !== requestIdRef.current) return;
        if (result.ok) {
          setGifs(result.data);
        } else {
          setError(result.error.message);
          setGifs([]);
        }
        setLoading(false);
      },
      query.trim().length > 0 ? 350 : 0,
    );

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mt-2 rounded-md border border-border bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          aria-label="Search GIFs"
          className="w-full rounded-md border border-border px-3 py-2"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close GIF picker"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Close
        </button>
      </div>

      {error ? (
        <p role="alert" className="py-6 text-center text-sm text-destructive">
          {error}
        </p>
      ) : loading ? (
        <p
          role="status"
          className="py-6 text-center text-sm text-muted-foreground"
        >
          Loading GIFs…
        </p>
      ) : gifs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No GIFs found. Try another search.
        </p>
      ) : (
        <ul className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {gifs.map((gif) => (
            <li key={gif.id}>
              <button
                type="button"
                onClick={() => onSelect(gif.url)}
                title={gif.title}
                className="group relative block w-full overflow-hidden rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Image
                  src={gif.previewUrl}
                  alt={gif.title}
                  width={200}
                  height={150}
                  unoptimized
                  className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
