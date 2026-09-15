"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, FolderOpen, Pause, Play, Scissors, Trash2, Undo2, Redo2, Upload, Download, Cpu, Gauge, FlaskConical } from "lucide-react";
import type { CompositionClip, CompositionRatio } from "./browser-compositor";
import { compositionDimensions } from "./browser-compositor";
import { exportNativeVideoComposition, inspectMediaFile, nativeEngineAvailable } from "./native-media-engine";
import { clamp, formatTime } from "./video-engine";

type Clip = CompositionClip & { file: File; start: number; lane: "video" | "overlay"; scale: number; rotation: number; opacity: number };
const ratioOptions: CompositionRatio[] = ["16:9", "9:16", "1:1"];
const colors = ["#2563eb", "#7c3aed", "#0d9488", "#d97706"];
const SAMPLE_URL = "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

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
  const timeline = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const active = clips.find((c) => c.id === selected) ?? null;
  const total = useMemo(() => clips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0), [clips]);
  const engineReady = nativeEngineAvailable();

  const commit = (next: Clip[]) => { setHistory((h) => [...h.slice(-49), clips]); setFuture([]); setClips(next); };
  const normalize = (items: Clip[]) => { let cursor = 0; return items.map((c) => { const n = { ...c, start: cursor }; cursor += Math.max(0, c.trimEnd - c.trimStart); return n; }); };
  const importFiles = async (files: File[]) => {
    const media = files.filter((f) => /^(video|image)\//.test(f.type));
    if (!media.length) return setStatus("Choose video or image files");
    let cursor = total; const made: Clip[] = [];
    for (let i = 0; i < media.length; i++) {
      const file = media[i];
      const meta = await inspectMediaFile(file).catch(() => ({ duration: 5, width: 0, height: 0, hasVideo: file.type.startsWith("video/"), hasAudio: false }));
      const duration = file.type.startsWith("image/") ? 5 : Math.max(.1, meta.duration || 5);
      made.push({ id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image", duration, trimStart: 0, trimEnd: duration, volume: 1, fadeIn: 0, fadeOut: 0, file, start: cursor, lane: i === 0 ? "video" : "overlay", scale: 1, rotation: 0, opacity: 1 });
      cursor += duration;
    }
    commit(normalize([...clips, ...made])); setSelected(made[0]?.id ?? null); setTime(made[0]?.start ?? total); setStatus(`${made.length} media imported · metadata inspected`);
  };
  const loadSample = async () => {
    setStatus("Downloading sample video for QA…");
    try { const response = await fetch(SAMPLE_URL); if (!response.ok) throw new Error(`Sample download failed (${response.status})`); const blob = await response.blob(); const file = new File([blob], "targetbud-sample-640x360.mp4", { type: "video/mp4" }); await importFiles([file]); setStatus("Sample video loaded · ready for playback, split and export QA"); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Sample download failed. Use Import instead."); }
  };
  const undo = () => { const p = history.at(-1); if (!p) return; setFuture((f) => [...f, clips]); setHistory((h) => h.slice(0, -1)); setClips(p); };
  const redo = () => { const n = future.at(-1); if (!n) return; setHistory((h) => [...h, clips]); setFuture((f) => f.slice(0, -1)); setClips(n); };
  const remove = () => { if (!active) return; URL.revokeObjectURL(active.url); const next = normalize(clips.filter((c) => c.id !== active.id)); commit(next); setSelected(next[0]?.id ?? null); setTime(clamp(time, 0, next.reduce((s,c)=>s+(c.trimEnd-c.trimStart),0))); setStatus("Clip removed and timeline reflowed"); };
  const split = () => {
    if (!active) return;
    const local = time - active.start;
    const length = active.trimEnd - active.trimStart;
    if (local <= .05 || local >= length - .05) return setStatus("Place the playhead inside the selected clip");
    const cut = active.trimStart + local;
    const a = { ...active, id: crypto.randomUUID(), name: `${active.name} 1`, trimEnd: cut };
    const b = { ...active, id: crypto.randomUUID(), name: `${active.name} 2`, trimStart: cut };
    const index = clips.findIndex((c) => c.id === active.id);
    const next = normalize([...clips.slice(0, index), a, b, ...clips.slice(index + 1)]);
    commit(next); setSelected(b.id); setTime(b.start); setStatus("Split performed · timeline reflowed");
  };
  const trim = (edge: "start" | "end", value: number) => {
    if (!active) return;
    const nextValue = edge === "start" ? clamp(value, 0, active.trimEnd - .05) : clamp(value, active.trimStart + .05, active.duration);
    const next = normalize(clips.map((c) => c.id === active.id ? { ...c, trimStart: edge === "start" ? nextValue : c.trimStart, trimEnd: edge === "end" ? nextValue : c.trimEnd } : c));
    commit(next); setTime(clamp(time, 0, next.reduce((s,c)=>s+(c.trimEnd-c.trimStart),0))); setStatus(`Trim ${edge} updated`);
  };
  const seekTimeline = (clientX: number) => { const el = timeline.current; if (!el || !total) return; const rect = el.getBoundingClientRect(); const x = clamp(clientX - rect.left + el.scrollLeft, 0, rect.width + el.scrollLeft); setTime(clamp(x / (zoom * 0.1), 0, total)); };
  const exportProject = async () => {
    if (!clips.length) return setStatus("Import media first");
    if (!engineReady) return setStatus("WebCodecs is unavailable in this browser");
    setExporting(true); setStatus("Native WebCodecs render starting…");
    try { const result = await exportNativeVideoComposition({ clips, ratio, onProgress: (p) => setStatus(`Native render ${Math.round(p * 100)}%`) }); const url = URL.createObjectURL(result.blob); const a = document.createElement("a"); a.href = url; a.download = "targetbud-native-edit.mp4"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("MP4 exported with Mediabunny + browser WebCodecs"); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Native export failed"); }
    finally { setExporting(false); }
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0; let last = performance.now();
    const tick = (now: number) => { const delta = (now - last) / 1000; last = now; setTime((t) => { const next = t + delta; if (next >= total) { setPlaying(false); return total; } return next; }); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  useEffect(() => {
    if (!preview.current || !active || active.type !== "video") return;
    const local = clamp(time - active.start, 0, active.trimEnd - active.trimStart);
    const target = active.trimStart + local;
    if (Math.abs(preview.current.currentTime - target) > .04) preview.current.currentTime = target;
    if (playing) preview.current.play().catch(() => undefined); else preview.current.pause();
  }, [time, active, playing]);

  const previewTime = active ? clamp(time - active.start + active.trimStart, active.trimStart, active.trimEnd) : 0;
  return <main className="h-screen overflow-hidden bg-[#0b0b0d] text-white">
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#151517] px-3">
      <div className="flex items-center gap-3"><div className="rounded bg-white p-1.5 text-black"><Film size={17}/></div><div><div className="text-sm font-bold">TargetBud Video Studio</div><div className="text-[10px] text-white/40">V12 · Native WebCodecs media engine</div></div></div>
      <div className="flex items-center gap-1"><button onClick={undo} disabled={!history.length} className="p-2 disabled:opacity-20"><Undo2 size={16}/></button><button onClick={redo} disabled={!future.length} className="p-2 disabled:opacity-20"><Redo2 size={16}/></button><button onClick={() => input.current?.click()} className="rounded bg-white/10 px-3 py-2 text-xs"><Upload size={14} className="mr-1 inline"/>Import</button><button onClick={loadSample} className="rounded bg-white/10 px-3 py-2 text-xs"><FlaskConical size={14} className="mr-1 inline"/>Sample QA</button><button onClick={exportProject} disabled={exporting} className="rounded bg-white px-4 py-2 text-xs font-bold text-black"><Download size={14} className="mr-1 inline"/>{exporting ? "Rendering…" : "Export MP4"}</button></div>
      <input ref={input} hidden type="file" multiple accept="video/*,image/*" onChange={(e) => { importFiles([...(e.target.files ?? [])]); e.currentTarget.value = ""; }}/>
    </header>
    <div className="grid h-[calc(100vh-56px)] grid-cols-[230px_minmax(0,1fr)_280px]">
      <aside className="border-r border-white/10 bg-[#151517] p-4"><div className="mb-4 flex items-center gap-2 text-xs font-semibold"><FolderOpen size={15}/> Media</div><button onClick={() => input.current?.click()} className="mb-2 w-full rounded-lg border border-dashed border-white/15 py-7 text-xs text-white/50 hover:bg-white/5">Drop videos/images here<br/><span className="text-white/25">or click to import</span></button><button onClick={loadSample} className="mb-4 w-full rounded bg-white/5 py-2 text-[10px] text-white/55">Load public sample for QA</button><div className="space-y-2">{clips.map((c) => <button key={c.id} onClick={() => { setSelected(c.id); setTime(c.start); }} className={`w-full rounded-lg p-2 text-left text-xs ${selected === c.id ? "bg-white/10" : "bg-white/[.03]"}`}><div className="truncate">{c.name}</div><div className="mt-1 text-[10px] text-white/35">{formatTime(c.trimEnd-c.trimStart)} · {c.type}</div></button>)}</div></aside>
      <section className="flex min-w-0 flex-col"><div className="flex min-h-0 flex-1 items-center justify-center p-8"><div className={`relative overflow-hidden rounded bg-black shadow-2xl ${ratio === "9:16" ? "aspect-[9/16] h-[75%]" : ratio === "1:1" ? "aspect-square h-[65%]" : "aspect-video w-[75%]"}`}>{active?.type === "video" ? <video ref={preview} src={active.url} className="h-full w-full object-contain" muted playsInline onLoadedMetadata={(e) => { e.currentTarget.currentTime = previewTime; }} /> : active?.type === "image" ? <img src={active.url} alt="" className="h-full w-full object-contain"/> : <div className="flex h-full items-center justify-center text-xs text-white/25">Import media to start</div>}<div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-[10px] text-white/60"><Cpu size={11} className="mr-1 inline"/> WebCodecs {engineReady ? "available" : "unavailable"}</div></div></div><div className="flex h-12 items-center justify-center gap-3 border-y border-white/10 bg-[#151517]"><button onClick={() => { if (time >= total) setTime(0); setPlaying((p) => !p); }} disabled={!clips.length} className="rounded-full bg-white p-2 text-black disabled:opacity-30">{playing ? <Pause size={14}/> : <Play size={14}/>}</button><button onClick={split} disabled={!active} className="p-2 disabled:opacity-30"><Scissors size={16}/></button><button onClick={remove} disabled={!active} className="p-2 disabled:opacity-30"><Trash2 size={16}/></button><span className="text-xs text-white/45">{formatTime(time)} / {formatTime(total)}</span><span className="max-w-[420px] truncate text-[10px] text-white/25">{status}</span></div></section>
      <aside className="border-l border-white/10 bg-[#151517] p-4"><div className="mb-4 flex items-center gap-2 text-xs font-semibold"><Gauge size={15}/> Engine / Project</div><div className="space-y-3 text-xs"><div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Rendering backend</div><div className="mt-1 font-semibold">Mediabunny → WebCodecs → MP4</div><div className="mt-1 text-[10px] text-white/30">Browser-native H.264 encoding when supported.</div></div><div><div className="mb-2 text-white/40">Canvas</div><div className="grid grid-cols-3 gap-1">{ratioOptions.map((r) => <button key={r} onClick={() => setRatio(r)} className={`rounded p-2 ${ratio === r ? "bg-white text-black" : "bg-white/5"}`}>{r}</button>)}</div></div>{active && <div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Selected clip</div><div className="mt-1 truncate">{active.name}</div><div className="mt-2 text-white/40">Trim start</div><input aria-label="Trim start" type="range" min="0" max={Math.max(.05, active.trimEnd-.05)} step="0.01" value={active.trimStart} onChange={(e) => trim("start", Number(e.target.value))} className="w-full"/><div className="mt-1 text-[10px]">{formatTime(active.trimStart)}</div><div className="mt-2 text-white/40">Trim end</div><input aria-label="Trim end" type="range" min={Math.min(active.duration,.05)} max={active.duration} step="0.01" value={active.trimEnd} onChange={(e) => trim("end", Number(e.target.value))} className="w-full"/><div className="mt-1 text-[10px]">{formatTime(active.trimEnd)}</div></div>}<div className="rounded-lg bg-white/[.04] p-3"><div className="text-white/40">Output</div><div className="mt-1">{compositionDimensions[ratio].width} × {compositionDimensions[ratio].height}</div><div className="text-white/30">30 FPS · H.264 MP4</div></div><div className="rounded-lg border border-amber-400/10 bg-amber-400/5 p-3 text-[10px] text-amber-100/55">V12 native export currently renders video/images. Separate audio tracks are not yet muxed into the native export.</div></div></aside>
    </div>
    <section className="absolute bottom-0 left-0 right-0 h-56 border-t border-white/10 bg-[#111113]"><div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[10px] text-white/40"><span>Timeline · click to seek · split/trim are real</span><div className="flex items-center gap-2"><button onClick={() => setZoom((z) => clamp(z - 10, 30, 160))}>−</button><span>{zoom}%</span><button onClick={() => setZoom((z) => clamp(z + 10, 30, 160))}>+</button></div></div><div ref={timeline} onClick={(e) => seekTimeline(e.clientX)} className="h-[calc(100%-36px)] overflow-auto p-3"><div className="relative min-w-[900px]" style={{ width: Math.max(900, total * zoom * .1) }}><div className="mb-2 h-4 text-[9px] text-white/20">00:00 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:05 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:10 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:15 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 00:20</div><div className="relative h-16 rounded bg-white/[.025]"><div className="absolute left-0 top-0 flex h-full items-center gap-1 p-1">{clips.map((c, i) => <button key={c.id} onClick={(e) => { e.stopPropagation(); setSelected(c.id); setTime(c.start); }} className={`h-14 rounded px-3 text-left text-[10px] ${selected === c.id ? "ring-2 ring-white" : ""}`} style={{ width: Math.max(90, (c.trimEnd - c.trimStart) * zoom), background: colors[i % colors.length] }}><div className="truncate font-semibold">{c.name}</div><div className="opacity-60">{formatTime(c.trimEnd-c.trimStart)}</div></button>)}</div><div className="pointer-events-none absolute top-0 h-full w-px bg-white" style={{ left: `${Math.min(100, total ? time / total * 100 : 0)}%` }} /></div></div></div></section>
  </main>;
}
