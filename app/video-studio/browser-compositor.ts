export type CompositionMediaType = "video" | "image" | "audio";

export type CompositionClip = {
  id: string;
  name: string;
  url: string;
  type: CompositionMediaType;
  duration: number;
  trimStart: number;
  trimEnd: number;
};

export type CompositionRatio = "9:16" | "16:9" | "1:1";

export const compositionDimensions: Record<CompositionRatio, { width: number; height: number }> = {
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "1:1": { width: 1080, height: 1080 },
};

export const clipLength = (clip: CompositionClip) => Math.max(0, clip.trimEnd - clip.trimStart);

export const compositionDuration = (clips: CompositionClip[]) =>
  clips.reduce((sum, clip) => sum + clipLength(clip), 0);

export const compositionTimeAt = (clips: CompositionClip[], time: number) => {
  let cursor = 0;
  for (const clip of clips) {
    const duration = clipLength(clip);
    if (time < cursor + duration || clip === clips.at(-1)) {
      return { clip, localTime: Math.max(0, Math.min(duration, time - cursor)) };
    }
    cursor += duration;
  }
  return null;
};

const loadMedia = (clip: CompositionClip) =>
  new Promise<HTMLVideoElement | HTMLImageElement>((resolve, reject) => {
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
    video.onerror = () => reject(new Error(`Could not load ${clip.name}.`));
    video.src = clip.url;
    video.load();
  });

export async function exportBrowserComposition({
  clips,
  ratio,
  text,
  mimeType,
  extension,
  maxDuration = 300,
}: {
  clips: CompositionClip[];
  ratio: CompositionRatio;
  text?: string;
  mimeType: string;
  extension: string;
  maxDuration?: number;
}) {
  if (typeof document === "undefined") throw new Error("Browser export is unavailable during server rendering.");
  if (!window.MediaRecorder) throw new Error("This browser does not support project video export.");
  if (!HTMLCanvasElement.prototype.captureStream) throw new Error("This browser cannot capture a project video.");

  const usable = clips.filter((clip) => clipLength(clip) > 0);
  const duration = compositionDuration(usable);
  if (!usable.length || !duration) throw new Error("Add media with a usable duration before exporting.");
  if (duration > maxDuration) throw new Error(`This browser export is limited to ${maxDuration} seconds. Trim the project and try again.`);
  if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error("This browser cannot encode the selected export format.");

  const { width, height } = compositionDimensions[ratio];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable in this browser.");

  const media = await Promise.all(usable.map(loadMedia));
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Project recording failed."));
  });

  const fit = (source: CanvasImageSource, sourceWidth: number, sourceHeight: number) => {
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  };

  const startedAt = performance.now();
  recorder.start(250);
  await Promise.all(media.filter((item): item is HTMLVideoElement => item instanceof HTMLVideoElement).map((video) => video.play().catch(() => undefined)));

  await new Promise<void>((resolve) => {
    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const position = compositionTimeAt(usable, elapsed);
      if (!position) {
        resolve();
        return;
      }
      const index = usable.findIndex((clip) => clip.id === position.clip.id);
      const source = media[index];
      if (source instanceof HTMLVideoElement) {
        source.currentTime = source.duration ? Math.min(source.duration, source.currentTime) : source.currentTime;
        fit(source, source.videoWidth || width, source.videoHeight || height);
      } else if (source instanceof HTMLImageElement) {
        fit(source, source.naturalWidth || width, source.naturalHeight || height);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
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
      if (elapsed >= duration) resolve();
      else requestAnimationFrame(render);
    };
    render();
  });

  media.forEach((item) => item instanceof HTMLVideoElement && item.pause());
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  return { blob: new Blob(chunks, { type: mimeType }), extension };
}
