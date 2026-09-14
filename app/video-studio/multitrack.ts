import type { TimelineClip, TimelineTrack } from "./timeline";

export type MixSettings = {
  volume: number;
  fadeIn: number;
  fadeOut: number;
};

export const DEFAULT_MIX: MixSettings = { volume: 1, fadeIn: 0, fadeOut: 0 };

export function moveTimelineClipToTrack(
  clips: TimelineClip[],
  clipId: string,
  targetTrack: TimelineTrack,
  targetStart?: number,
): TimelineClip[] {
  const source = clips.find((clip) => clip.id === clipId);
  if (!source || source.track === targetTrack) return clips;
  const start = Number.isFinite(targetStart) ? Math.max(0, targetStart as number) : source.start;
  return clips.map((clip) =>
    clip.id === clipId ? { ...clip, track: targetTrack, start } : clip,
  );
}

export function normalizeTrackPositions(clips: TimelineClip[], track: TimelineTrack): TimelineClip[] {
  let cursor = 0;
  return clips.map((clip) => {
    if (clip.track !== track) return clip;
    const next = { ...clip, start: cursor };
    cursor += Math.max(0, clip.duration);
    return next;
  });
}

export function clampMix(settings: MixSettings, duration: number): MixSettings {
  const safeDuration = Math.max(0, duration);
  const volume = Math.min(1, Math.max(0, Number.isFinite(settings.volume) ? settings.volume : 1));
  const fadeIn = Math.min(safeDuration / 2, Math.max(0, Number.isFinite(settings.fadeIn) ? settings.fadeIn : 0));
  const fadeOut = Math.min(safeDuration / 2, Math.max(0, Number.isFinite(settings.fadeOut) ? settings.fadeOut : 0));
  return { volume, fadeIn, fadeOut };
}

export function mixGainAt(settings: MixSettings, time: number, duration: number): number {
  const safe = clampMix(settings, duration);
  const t = Math.min(Math.max(0, time), Math.max(0, duration));
  let gain = safe.volume;
  if (safe.fadeIn > 0 && t < safe.fadeIn) gain *= t / safe.fadeIn;
  if (safe.fadeOut > 0 && t > duration - safe.fadeOut) gain *= Math.max(0, (duration - t) / safe.fadeOut);
  return gain;
}
