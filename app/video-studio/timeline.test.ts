import { describe, expect, it } from "vitest";
import { reorderTimelineClip, splitTimelineClip, timelineDuration, type TimelineClip } from "./timeline";

const clips: TimelineClip[] = [
  { id: "a", track: "video", start: 0, duration: 4, sourceStart: 0 },
  { id: "b", track: "video", start: 4, duration: 3, sourceStart: 2 },
  { id: "music", track: "audio", start: 0, duration: 20, sourceStart: 0 },
];

describe("Video Studio timeline primitives", () => {
  it("reorders only within the same track and recalculates positions", () => {
    const result = reorderTimelineClip(clips, "b", "a");
    expect(result.find(c => c.id === "b")?.start).toBe(0);
    expect(result.find(c => c.id === "a")?.start).toBe(3);
    expect(result.find(c => c.id === "music")?.start).toBe(0);
  });

  it("preserves trim/source offset when splitting", () => {
    const result = splitTimelineClip(clips[1], 1);
    expect(result?.[0]).toMatchObject({ duration: 1, sourceStart: 2 });
    expect(result?.[1]).toMatchObject({ duration: 2, sourceStart: 3, start: 5 });
  });

  it("rejects invalid split positions", () => {
    expect(splitTimelineClip(clips[0], 0)).toBeNull();
    expect(splitTimelineClip(clips[0], 4)).toBeNull();
  });

  it("calculates duration independently per track", () => {
    expect(timelineDuration(clips, "video")).toBe(7);
    expect(timelineDuration(clips, "audio")).toBe(20);
  });
});
