"use client";

import Image from "next/image";
import { useState } from "react";

type GifPreviewProps = {
  gifUrl: string;
  alt?: string;
};

export function GifPreview({ gifUrl, alt = "Recognition GIF" }: GifPreviewProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        GIF preview unavailable. Recognition text is still shown.
      </p>
    );
  }

  return (
    <div className="relative mt-2 overflow-hidden rounded-md border border-border">
      <Image
        src={gifUrl}
        alt={alt}
        width={480}
        height={270}
        className="h-auto w-full max-w-md object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  );
}
