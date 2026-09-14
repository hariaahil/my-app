export type BrowserExportFormat = { mimeType: string; extension: "mp4" | "webm" };

/** Prefer MP4 when the browser's MediaRecorder implementation can actually encode it. */
export function getBrowserExportFormat(): BrowserExportFormat | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates: BrowserExportFormat[] = [
    { mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  return candidates.find(candidate => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? null;
}
