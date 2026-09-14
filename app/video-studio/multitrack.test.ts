import { describe, expect, it } from "vitest";
import { clampMix, mixGainAt, moveTimelineClipToTrack, normalizeTrackPositions, type MixSettings } from "./multitrack";
import type { TimelineClip } from "./timeline";

const clips: TimelineClip[] = [
  { id: "v", track: "video", start: 0, duration: 4, sourceStart: 0 },
  { id: "a", track: "audio", start: 0, duration: 12, sourceStart: 0 },
  { id: "o", track: "overlay", start: 0, duration: 2, sourceStart: 0 },
];

describe("multitrack editing", () => {
  it("moves a clip between independent tracks without changing other clips", () => {
    const moved = moveTimelineClipToTrack(clips, "o", "video", 5);
    expect(moved.find((c) => c.id === "o")).toMatchObject({ track: "video", start: 5 });
    expect(moved.find((c) => c.id === "v")).toMatchObject({ track: "video", start: 0 });
    expect(moved.find((c) => c.id === "a")).toMatchObject({ track: "audio", start: 0 });
  });

  it("does not move an unknown clip", () => {
    expect(moveTimelineClipToTrack(clips, "missing", "audio")).toEqual(clips);
  });

  it("normalizes only the requested track", () => {
    const input = [
      { ...clips[0], start: 8 },
      { ...clips[1], start: 3 },
      { id: "v2", track: "video" as const, start: 20, duration: 2, sourceStart: 1 },
    ];
    const normalized = normalizeTrackPositions(input, "video");
    expect(normalized.find((c) => c.id === "v")).toMatchObject({ start: 0 });
    expect(normalized.find((c) => c.id === "v2")).toMatchObject({ start: 4 });
    expect(normalized.find((c) => c.id === "a")).toMatchObject({ start: 3 });
  });

  it("clamps volume and fades to safe duration bounds", () => {
    const settings: MixSettings = clampMix({ volume: 2, fadeIn: 9, fadeOut: -1 }, 10);
    expect(settings).toEqual({ volume: 1, fadeIn: 5, fadeOut: 0 });
  });

  it("ramps gain at fade boundaries", () => {
    const settings: MixSettings = { volume: 1, fadeIn: 2, fadeOut: 2 };
    expect(mixGainAt(settings, 0, 10)).toBe(0);
    expect(mixGainAt(settings, 1, 10)).toBeCloseTo(0.5);
    expect(mixGainAt(settings, 5, 10)).toBe(1);
    expect(mixGainAt(settings, 10, 10)).toBe(0);
  });
});
