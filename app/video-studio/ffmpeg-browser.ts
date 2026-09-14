"use client";

export type BrowserFfmpeg = import("@ffmpeg/ffmpeg").FFmpeg;

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let instancePromise: Promise<BrowserFfmpeg> | null = null;

/**
 * Load FFmpeg only when a user actually requests a rendered export.
 * The editor route therefore keeps the WASM runtime out of its initial bundle.
 */
export function loadBrowserFfmpeg(): Promise<BrowserFfmpeg> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("FFmpeg is available only in the browser."));
  }
  if (!instancePromise) {
    instancePromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((error) => {
      instancePromise = null;
      throw error;
    });
  }
  return instancePromise;
}
