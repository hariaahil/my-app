"use client";

import { useMemo, useRef, useState } from "react";
import { Film, FolderOpen, Pause, Play, Scissors, Trash2, Undo2, Redo2, Upload, Download, Cpu, Gauge } from "lucide-react";
import type { CompositionClip, CompositionRatio } from "./browser-compositor";
import { compositionDimensions } from "./browser-compositor";
import { exportNativeVideoComposition, inspectMediaFile, nativeEngineAvailable } from "./native-media-engine";
import { clamp, formatTime } from "./video-engine";

type Clip = CompositionClip & { file: File; start: number; lane: "video" | "overlay"; scale: number; rotation: number; opacity: number };

const ratioOptions: CompositionRatio[] = ["16:9", "9:16", "1:1"];
const colors = ["#2563eb", "#7c3aed", "#0d9488", "#d97706"];

export default function VideoStudioV12() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ratio, setRatio] = useState<CompositionRatio>("16:9");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(70);
  const [status, setStatus] = useState("Native engine ready");
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [future, setFuture] = useState<Clip[][]>([]);
  const input = useRef<HTMLInputElement>(null);
  const canvasPreview = useRef<HTMLVideoElement>(null);
  const active = clips.find((c) => c.id === selected) ?? null;
  const total = useMemo(() => clips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0), [clips]);
  const engineReady = nativeEngineAvailable();

  const commit = (next: Clip[]) => { setHistory((h) => [...h.slice(-49), clips]); setFuture([]); setClips(next); };
  const importFiles = async (files: File[]) => {
    const media = files.filter((f) => /^(video|image)\//.test(f.type));
    if (!media.length) return setStatus("Choose video or image files");
    let cursor = total;
    const made: Clip[] = [];
    for (let i = 0; i < media.length; i++) {
      const file = media[i];
      const meta = await inspectMediaFile(file).catch(() => ({ duration: 5, width: 0, height: 0, hasVideo: file.type.startsWith("video/"), hasAudio: false }));
      const duration = file.type.startsWith("image/") ? 5 : Math.max(.1, meta.duration || 5);
      const clip: Clip = { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image", duration, trimStart: 0, trimEnd: duration, volume: 1, fadeIn: 0, fadeOut: 0, file, start: cursor, lane: i === 0 ? "video" : "overlay", scale: 1, rotation: 0, opacity: 1 };
      made.push(clip); cursor += duration;
    }
    commit([...clips, ...made]);
    setSelected(made[0]?.id ?? null);
    setStatus(`${made.length} media imported · decoded by native media pipeline`);
  };
  const undo = () => { const p = history.at(-1); if (!p) return; setFuture((f) => [...f, clips]); setHistory((h) => h.slice(0, -1)); setClips(p); };
  const redo = () => { const n = future.at(-1); if (!n) return; setHistory((h) => [...h, clips]); setFuture((f) => f.slice(0, -1)); setClips(n); };
  const remove = () => { if (!active) return; URL.revokeObjectURL(active.url); commit(clips.filter((c) => c.id !== active.id)); setSelected(null); setStatus("Clip removed"); };
  const split = () => {
    if (!active) return;
    const local = time - active.start;
    if (local <= .05 || local >= active.trimEnd - active.trimStart - .05) return setStatus("Place the playhead inside the selected clip");
    const cut = active.trimStart + local;
    const a = { ...active, id: crypto.randomUUID(), name: `${active.name} 1`, trimEnd: cut };
    const b = { ...active, id: crypto.randomUUID(), name: `${active.name} 2`, trimStart: cut, start: active.start + local };
    const index = clips.findIndex((c) => c.id === active.id);
    const next = [...clips.slice(0, index), a, b, ...clips.slice(index + 1)];
    commit(next); setSelected(b.id); setStatus("Split performed in timeline model");
  };
  const exportProject = async () => {
    if (!clips.length) return setStatus("Import media first");
    if (!engineReady) return setStatus("WebCodecs is unavailable in this browser");
    setExporting(true); setStatus("Native WebCodecs render starting…");
    try {
      const result = await exportNativeVideoComposition({ clips, ratio, onProgress: (p) => setStatus(`Native render ${Math.round(p * 100)}%`) });
      const url = URL.createObjectURL(result.blob); const a = document.createElement("a"); a.href = url; a.download = "targetbud-native-edit.mp4"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("MP4 exported with Mediabunny + browser WebCodecs");
    } catch (e) { setStatus(e instanceof Error ? e.message : "Native export failed"); }
    finally { setExporting(false); }
  };
  const previewTime = active ? clamp(time - active.start + active.trimStart, active.trimStart, active.trimEnd) : 0;

  return <main className="h-screen overflow-hidden bg-[#0b0b0d] text-white">
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#151517] px-3">
      <div className="flex items-center gap-3"><div className="rounded bg-white p-1.5 text-black"><Film size={17}/></div><div><div className="text-sm font-bold">TargetBud Video Studio</div><div className="text-[10px] text-white/40">V12 · Native WebCodecs media engine</div></div></div>
      <div className="flex items-center gap-1"><button onClick={undo} disabled={!history.length} className="p-2 disabled:opacity-20"><Undo2 size={16}/></button><button onClick={redo} disabled={!future.length} className="p-2 disabled:opacity-20"><Redo2 size={16}/></button><button onClick={() => input.current?.click()} className="rounded bg-white/10 px-3 py-2 text-xs"><Upload size={14} className="mr-1 inline"/>Import</button><button onClick={exportProject} disabled={exporting} className="rounded bg-white px-4 py-2 text-xs font-bold text-black"><Download size={14} className="mr-1 inline"/>{exporting ? "Rendering…" : "Export MP4"}</button></div>
      <input ref={input} hidden type="file" multiple accept="video/*,image/*" onChange={(e) => importFiles([...(e.target.files ?? [])])}/>
    </header>
    <div className="grid h-[calc(100vh-56px)] grid-cols-[230px_minmax(0,1fr)_280px]">
      <aside className="border-r border-white/10 bg-[#151517] p-4"><div className="mb-4 flex items-center gap-2 text-xs font-semibold"><FolderOpen size={15}/> Media</div><button onClick={() => input.current?.click()} className="mb-4 w-full rounded-lg border border-dashed border-white/15 py-8 text-xs text-white/50 hover:bg-white/5">Drop videos/images here<br/><span className="text-white/25">or click to import</span></button><div className="space-y-2">{clips.map((c) => <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full rounded-lg p-2 text-left text-xs ${selected === c.id ? "bg-white/10" : "bg-white/[.03]"}`}><div className="truncate">{c.name}</div><div className="mt-1 text-[10px] text-white/35">{formatTime(c.duration)} · {c.type}</div></button>)}</div></aside>
      <section className="flex min-w-0 flex-col"><div className="flex min-h-0 flex-1 items-center justify-center p-8"><div className={`relative overflow-hidden rounded bg-black shadow-2xl ${ratio === "9:16" ? "aspect-[9/16] h-[75%]" : ratio === "1:1" ? "aspect-square h-[65%]" : "aspect-video w-[75%]"}`}>{active?.type === "video" ? <video ref={canvasPreview} src={active.url} className="h-full w-full object-contain" muted playsInline controls={false} onLoadedMetadata={(e) => { e.currentTarget.currentTime = previewTime; }} /> : active?.type === "image" ? <img src={active.url} alt="" className="h-full w-full object-contain"/> : <div className="flex h-full items-center justify-center text-xs text-white/25">Import media to start</div>}<div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-[10px] text-white/60"><Cpu size={11} className="mr-1 inline"/> WebCodecs {engineReady ? "available" : "unavailable"}</div></div></div><div className="flex h-12 items-center justify-center gap-3 border-y border-white/10 bg-[#151517]"><button onClick={() => setPlaying((p) => !p)} className="rounded-full bg-white p-2 text-black">{playing ? <Pause size={14}/> : <Play size={14}/>}</button><button onClick={split} className="p-2"><Scissors size={16}/></button><button onClick={remove} className="p-2"><Trash2 size={16}/></button><span className="text-xs text-white/45">{formatTime(time)} / {formatTime(total)}</span><span className="text-[10px] text-white/25">{status}</span></div></section>
      <aside className="border-l border-white/10 bg-[#151517] p-4"><div className="mb-4 flex items-center gap-2 text-xs font-semibold"><Gauge size={15}/> Engine / Project</div><div className="space-y-3 text-xs"><div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Rendering backend</div><div className="mt-1 font-semibold">Mediabunny → WebCodecs → MP4</div><div className="mt-1 text-[10px] text-white/30">Hardware acceleration is delegated to the browser's WebCodecs implementation.</div></div><div><div className="mb-2 text-white/40">Canvas</div><div className="grid grid-cols-3 gap-1">{ratioOptions.map((r) => <button key={r} onClick={() => setRatio(r)} className={`rounded p-2 ${ratio === r ? "bg-white text-black" : "bg-white/5"}`}>{r}</button>)}</div></div>{active && <div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Selected clip</div><div className="mt-1 truncate">{active.name}</div><div className="mt-2 text-white/40">Duration</div><div>{formatTime(active.duration)}</div></div>}<div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Output</div><div className="mt-1">{compositionDimensions[ratio].width} × {compositionDimensions[ratio].height}</div><div className="text-white/30">30 FPS · H.264 MP4 when supported</div></div></div></aside>
    </div>
    <section className="absolute bottom-0 left-0 right-0 h-56 border-t border-white/10 bg-[#111113]"><div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[10px] text-white/40"><span>Timeline · native render model</span><div className="flex items-center gap-2"><button onClick={() => setZoom((z) => clamp(z - 10, 30, 160))}>−</button><span>{zoom}%</span><button onClick={() => setZoom((z) => clamp(z + 10, 30, 160))}>+</button></div></div><div className="h-[calc(100%-36px)] overflow-auto p-3"><div className="relative min-w-[900px]"><div className="mb-2 h-4 text-[9px] text-white/20">00:00 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:05 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:10 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:15 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:20</div><div className="relative h-16 rounded bg-white/[.025]"><div className="absolute left-0 top-0 flex h-full items-center gap-1 p-1">{clips.map((c, i) => <button key={c.id} onClick={() => setSelected(c.id)} className={`h-14 rounded px-3 text-left text-[10px] ${selected === c.id ? "ring-2 ring-white" : ""}`} style={{ width: Math.max(90, (c.trimEnd - c.trimStart) * zoom), background: colors[i % colors.length] }}><div className="truncate font-semibold">{c.name}</div><div className="opacity-60">{formatTime(c.duration)}</div></button>)}</div></div></div></div></section>
  </main>;
}
