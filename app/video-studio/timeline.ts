export type TimelineTrack = "video" | "overlay" | "audio";

export type TimelineClip = {
  id: string;
  track: TimelineTrack;
  start: number;
  duration: number;
  sourceStart: number;
};

export function reorderTimelineClip(clips: TimelineClip[], clipId: string, targetId: string): TimelineClip[] {
  if (clipId === targetId) return clips;
  const source = clips.find(c => c.id === clipId);
  const target = clips.find(c => c.id === targetId);
  if (!source || !target || source.track !== target.track) return clips;
  const track = clips.filter(c => c.track === source.track);
  const from = track.findIndex(c => c.id === clipId);
  const to = track.findIndex(c => c.id === targetId);
  if (from < 0 || to < 0) return clips;
  const reordered = [...track];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  let cursor = 0;
  const positioned = reordered.map(c => {
    const next = { ...c, start: cursor };
    cursor += Math.max(0, c.duration);
    return next;
  });
  const byId = new Map(positioned.map(c => [c.id, c]));
  return clips.map(c => byId.get(c.id) ?? c);
}

export function splitTimelineClip(clip: TimelineClip, localTime: number): [TimelineClip, TimelineClip] | null {
  if (!Number.isFinite(localTime) || localTime <= 0 || localTime >= clip.duration) return null;
  const leftDuration = localTime;
  const rightDuration = clip.duration - localTime;
  return [
    { ...clip, id: `${clip.id}-1`, duration: leftDuration },
    { ...clip, id: `${clip.id}-2`, start: clip.start + leftDuration, duration: rightDuration, sourceStart: clip.sourceStart + leftDuration },
  ];
}

export function timelineDuration(clips: TimelineClip[], track: TimelineTrack = "video"): number {
  return clips.filter(c => c.track === track).reduce((max, c) => Math.max(max, c.start + c.duration), 0);
}
