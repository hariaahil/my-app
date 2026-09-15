export type EngineCapabilities = {
  webCodecs: boolean;
  videoDecoder: boolean;
  videoEncoder: boolean;
  audioDecoder: boolean;
  audioEncoder: boolean;
  offscreenCanvas: boolean;
  mediaRecorder: boolean;
};

export function getVideoEngineCapabilities(): EngineCapabilities {
  if (typeof window === "undefined") {
    return { webCodecs: false, videoDecoder: false, videoEncoder: false, audioDecoder: false, audioEncoder: false, offscreenCanvas: false, mediaRecorder: false };
  }
  const w = window as typeof window & { VideoDecoder?: unknown; VideoEncoder?: unknown; AudioDecoder?: unknown; AudioEncoder?: unknown; OffscreenCanvas?: unknown };
  return {
    webCodecs: Boolean(w.VideoDecoder && w.VideoEncoder),
    videoDecoder: Boolean(w.VideoDecoder),
    videoEncoder: Boolean(w.VideoEncoder),
    audioDecoder: Boolean(w.AudioDecoder),
    audioEncoder: Boolean(w.AudioEncoder),
    offscreenCanvas: Boolean(w.OffscreenCanvas),
    mediaRecorder: Boolean(window.MediaRecorder),
  };
}

export function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = Math.floor(safe % 60).toString().padStart(2, "0");
  const f = Math.floor((safe % 1) * 10);
  return `${m}:${s}.${f}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
