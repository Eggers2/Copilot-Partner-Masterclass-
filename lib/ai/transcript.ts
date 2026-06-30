/** Entfernt VTT-Metadaten (Header, Cue-Nummern, Timestamps, NOTE) → reiner Text. */
export function vttToPlainText(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      if (line === "WEBVTT") return false;
      if (/^NOTE\b/.test(line)) return false;
      if (/^\d+$/.test(line)) return false; // Cue-Nummer
      if (/-->/.test(line)) return false; // Timestamp-Zeile
      return true;
    })
    .join("\n");
}
