"use client";

import Image from "next/image";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

type GifPreviewProps = {
  gifUrl: string;
  alt?: string;
};

export function GifPreview({
  gifUrl,
  alt = "Recognition GIF",
}: GifPreviewProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Alert role="status" className="mt-3">
        <AlertDescription>
          GIF preview unavailable. Recognition text is still shown.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="relative mt-3 w-fit max-w-full p-0">
      <Image
        src={gifUrl}
        alt={alt}
        width={480}
        height={270}
        className="h-auto w-full max-w-md object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </Card>
  );
}
