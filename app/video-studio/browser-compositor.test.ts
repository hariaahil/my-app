import { describe, expect, it } from "vitest";
import { compositionDimensions, compositionDuration, compositionTimeAt, clipLength, type CompositionClip } from "./browser-compositor";

const clips: CompositionClip[] = [
  { id: "a", name: "a.mp4", url: "blob:a", type: "video", duration: 10, trimStart: 2, trimEnd: 7 },
  { id: "b", name: "b.jpg", url: "blob:b", type: "image", duration: 5, trimStart: 0, trimEnd: 5 },
];

describe("browser composition model", () => {
  it("uses non-destructive trimmed durations", () => {
    expect(clipLength(clips[0])).toBe(5);
    expect(compositionDuration(clips)).toBe(10);
  });

  it("maps project time to the correct clip and local time", () => {
    expect(compositionTimeAt(clips, 0)).toEqual({ clip: clips[0], localTime: 0 });
    expect(compositionTimeAt(clips, 4.5)).toEqual({ clip: clips[0], localTime: 4.5 });
    expect(compositionTimeAt(clips, 5)).toEqual({ clip: clips[1], localTime: 0 });
    expect(compositionTimeAt(clips, 9.9)).toEqual({ clip: clips[1], localTime: 4.9 });
  });

  it("provides stable export dimensions for all presets", () => {
    expect(compositionDimensions["9:16"]).toEqual({ width: 720, height: 1280 });
    expect(compositionDimensions["16:9"]).toEqual({ width: 1280, height: 720 });
    expect(compositionDimensions["1:1"]).toEqual({ width: 1080, height: 1080 });
  });
});
