"use client";

import { useState } from "react";

/**
 * Bild mit Fallback: zeigt `fallback`, solange die Bilddatei fehlt oder nicht
 * lädt. So können Speaker-Fotos / Logos später einfach nach /public
 * hochgeladen werden, ohne dass vorher ein Platzhalter kaputt aussieht.
 */
export function ImgFallback({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
