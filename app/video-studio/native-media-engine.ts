"use client";

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";
import type { CompositionClip, CompositionRatio } from "./browser-compositor";
import { compositionDimensions, compositionTimeAt, clipLength } from "./browser-compositor";

export type NativeEngineResult = { blob: Blob; extension: "mp4"; engine: "mediabunny-webcodecs" };

export function nativeEngineAvailable() {
  return typeof window !== "undefined" && "VideoDecoder" in window && "VideoEncoder" in window;
}

export async function inspectMediaFile(file: File) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const video = await input.getPrimaryVideoTrack();
  const audio = await input.getPrimaryAudioTrack();
  return {
    duration: video ? await video.computeDuration() : audio ? await audio.computeDuration() : 0,
    width: video?.displayWidth ?? 0,
    height: video?.displayHeight ?? 0,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
  };
}

const loadMedia = (clip: CompositionClip) => new Promise<HTMLVideoElement | HTMLImageElement>((resolve, reject) => {
  if (clip.type === "image") {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${clip.name}.`));
    image.src = clip.url;
    return;
  }
  const video = document.createElement("video");
  video.preload = "auto";
  video.playsInline = true;
  video.muted = true;
  video.onloadeddata = () => resolve(video);
  video.onerror = () => reject(new Error(`Could not decode ${clip.name}.`));
  video.src = clip.url;
  video.load();
});

function drawFit(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

/**
 * V1 native browser render path.
 * The timeline is rendered to a canvas, then Mediabunny drives the browser's
 * WebCodecs encoder and MP4 muxer. This replaces MediaRecorder for projects
 * that contain no separate audio track. Audio projects continue to use the
 * existing compatibility exporter until the audio graph is migrated too.
 */
export async function exportNativeVideoComposition({
  clips,
  ratio,
  text,
  maxDuration = 300,
  onProgress,
}: {
  clips: CompositionClip[];
  ratio: CompositionRatio;
  text?: string;
  maxDuration?: number;
  onProgress?: (progress: number) => void;
}): Promise<NativeEngineResult> {
  if (!nativeEngineAvailable()) throw new Error("WebCodecs is unavailable in this browser.");
  if (typeof document === "undefined") throw new Error("Native browser rendering is unavailable during server rendering.");

  const usable = clips.filter((clip) => clipLength(clip) > 0);
  const duration = usable.reduce((sum, clip) => sum + clipLength(clip), 0);
  if (!usable.length || duration <= 0) throw new Error("Add media with a usable duration before exporting.");
  if (duration > maxDuration) throw new Error(`This browser export is limited to ${maxDuration} seconds.`);
  if (usable.some((clip) => clip.type === "audio")) throw new Error("Native video engine V1 is video/image only; use the compatibility exporter for projects with separate audio tracks.");

  const { width, height } = compositionDimensions[ratio];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");

  const media = await Promise.all(usable.map(loadMedia));
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec: "avc",
    quality: new Quality("high"),
  });
  output.addVideoTrack(source, { frameRate: 30 });
  await output.start();

  const frameDuration = 1 / 30;
  const frames = Math.ceil(duration / frameDuration);
  for (let frame = 0; frame < frames; frame += 1) {
    const timelineTime = Math.min(duration - 0.0001, frame * frameDuration);
    const position = compositionTimeAt(usable, timelineTime);
    if (!position) break;
    const index = usable.findIndex((clip) => clip.id === position.clip.id);
    const item = media[index];

    if (item instanceof HTMLVideoElement) {
      const local = Math.min(clipLength(position.clip), position.localTime);
      const sourceTime = Math.min(Math.max(0, item.duration - 0.001), position.clip.trimStart + local);
      if (Math.abs(item.currentTime - sourceTime) > 0.001) {
        item.currentTime = sourceTime;
        await new Promise<void>((resolve) => {
          const done = () => { item.removeEventListener("seeked", done); resolve(); };
          item.addEventListener("seeked", done, { once: true });
        });
      }
      drawFit(ctx, item, item.videoWidth || width, item.videoHeight || height, width, height);
    } else {
      drawFit(ctx, item, item.naturalWidth || width, item.naturalHeight || height, width, height);
    }

    if (text) {
      ctx.textAlign = "center";
      ctx.font = "900 56px system-ui, sans-serif";
      ctx.fillStyle = "white";
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(text, width / 2, height * 0.38, width - 80);
      ctx.shadowBlur = 0;
    }

    await source.add(frame * frameDuration, frameDuration, { keyFrame: frame % 60 === 0 });
    onProgress?.((frame + 1) / frames);
  }

  source.close();
  await output.finalize();
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Native engine produced no output.");
  return { blob: new Blob([buffer], { type: "video/mp4" }), extension: "mp4", engine: "mediabunny-webcodecs" };
}
