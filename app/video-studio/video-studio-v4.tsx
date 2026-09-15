"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Film, GripVertical, Image as ImageIcon, Music2, Pause, Play, Plus, Scissors, Trash2, Undo2, Upload, Volume2 } from "lucide-react";
import { getBrowserExportFormat } from "./export-support";
import { exportBrowserComposition, type CompositionClip } from "./browser-compositor";

type MediaType = "video" | "image" | "audio";
type Lane = "video" | "overlay" | "audio";
type Clip = CompositionClip & { file: File; lane: Lane };
type Ratio = "9:16" | "16:9" | "1:1";
const ratios: Ratio[] = ["9:16", "16:9", "1:1"];
const ratioClass: Record<Ratio, string> = { "9:16": "aspect-[9/16]", "16:9": "aspect-video", "1:1": "aspect-square" };
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const len = (c?: Clip) => c ? Math.max(0, c.trimEnd - c.trimStart) : 0;
const laneFor = (type: MediaType): Lane => type === "audio" ? "audio" : type === "image" ? "overlay" : "video";
const laneLabel: Record<Lane, string> = { video: "Video", overlay: "Overlay", audio: "Audio" };

export default function VideoStudioV4() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = clips.find(c => c.id === selected) ?? clips[0];
  const total = useMemo(() => clips.filter(c => c.lane !== "audio").reduce((n, c) => n + len(c), 0), [clips]);
  const remember = () => setHistory(h => [...h.slice(-19), clips]);
  const select = (id: string) => { setSelected(id); setCurrent(0); setPlaying(false); };

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => /^(video|image|audio)\//.test(f.type));
    if (!files.length) return;
    const next = files.map(file => {
      const type: MediaType = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const d = type === "image" ? 5 : 0;
      return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type, lane: laneFor(type), duration: d, trimStart: 0, trimEnd: d, volume: type === "audio" || type === "video" ? 1 : 0, fadeIn: 0, fadeOut: 0, file };
    });
    setClips(old => [...old, ...next]);
    setSelected(next[0]?.id ?? selected);
    e.target.value = "";
    setMessage(null);
  };

  useEffect(() => {
    if (!active || active.duration || active.type === "image") return;
    const media = document.createElement(active.type === "audio" ? "audio" : "video");
    media.preload = "metadata"; media.src = active.url;
    const onMeta = () => { if (Number.isFinite(media.duration) && media.duration > 0) setClips(cs => cs.map(c => c.id === active.id ? { ...c, duration: media.duration, trimEnd: media.duration } : c)); };
    media.addEventListener("loadedmetadata", onMeta);
    return () => { media.removeEventListener("loadedmetadata", onMeta); media.src = ""; };
  }, [active?.id, active?.duration, active?.type, active?.url]);

  useEffect(() => { const v = videoRef.current; if (v) v.playbackRate = speed; }, [speed]);
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => { if (!active || active.type !== "video") return; const local = v.currentTime - active.trimStart; if (local >= len(active)) { v.pause(); setPlaying(false); setCurrent(len(active)); } else if (local >= 0) setCurrent(local); };
    v.addEventListener("timeupdate", onTime); return () => v.removeEventListener("timeupdate", onTime);
  }, [active?.id, active?.trimStart, active?.trimEnd]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") { e.preventDefault(); inputRef.current?.click(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); });

  const reorder = (fromId: string, toId: string) => { if (fromId === toId) return; const a = clips.findIndex(c => c.id === fromId), b = clips.findIndex(c => c.id === toId); if (a < 0 || b < 0 || clips[a].lane !== clips[b].lane) return; remember(); const n = [...clips]; const [item] = n.splice(a, 1); n.splice(b, 0, item); setClips(n); };
  const moveLane = (lane: Lane) => { if (!active || active.lane === lane) return; remember(); setClips(cs => cs.map(c => c.id === active.id ? { ...c, lane } : c)); };
  const remove = () => { if (!active) return; remember(); URL.revokeObjectURL(active.url); const n = clips.filter(c => c.id !== active.id); setClips(n); setSelected(n[0]?.id ?? null); setPlaying(false); setCurrent(0); };
  const split = () => { if (!active || active.type !== "video" || len(active) < 1) return; const local = clamp(current, .5, len(active) - .5), cut = active.trimStart + local; remember(); const a = { ...active, id: crypto.randomUUID(), name: `${active.name} · 1`, trimEnd: cut }, b = { ...active, id: crypto.randomUUID(), name: `${active.name} · 2`, trimStart: cut }; const i = clips.findIndex(c => c.id === active.id); setClips([...clips.slice(0, i), a, b, ...clips.slice(i + 1)]); setSelected(a.id); setCurrent(0); };
  const trim = (key: "trimStart" | "trimEnd", value: number) => { if (!active || !active.duration) return; const min = key === "trimStart" ? 0 : active.trimStart + .1, max = key === "trimEnd" ? active.duration : active.trimEnd - .1; remember(); setClips(cs => cs.map(c => c.id === active.id ? { ...c, [key]: clamp(value, min, max) } : c)); };
  const updateMix = (key: "volume" | "fadeIn" | "fadeOut", value: number) => { if (!active || (active.type !== "video" && active.type !== "audio")) return; remember(); setClips(cs => cs.map(c => c.id === active.id ? { ...c, [key]: clamp(value, 0, Math.max(0, len(c))) } : c)); };
  const updateVolume = (value: number) => { if (!active || (active.type !== "video" && active.type !== "audio")) return; remember(); setClips(cs => cs.map(c => c.id === active.id ? { ...c, volume: clamp(value, 0, 1) } : c)); };
  const undo = () => { const p = history.at(-1); if (!p) return; setHistory(h => h.slice(0, -1)); setClips(p); setSelected(p[0]?.id ?? null); setCurrent(0); setPlaying(false); };
  const sync = (local: number) => { if (videoRef.current && active?.type === "video") videoRef.current.currentTime = active.trimStart + clamp(local, 0, len(active)); };

  const exportProject = async () => {
    setExporting(true); setMessage(null);
    try {
      const format = getBrowserExportFormat(); if (!format) throw new Error("This browser cannot encode a downloadable video. Try a current Chrome, Edge or Safari browser.");
      const result = await exportBrowserComposition({ clips, ratio, text, mimeType: format.mimeType, extension: format.extension });
      const url = URL.createObjectURL(result.blob); const a = document.createElement("a"); a.href = url; a.download = `targetbud-project.${result.extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(result.extension === "mp4" ? "Project MP4 export complete." : "Project exported as WebM; this browser does not provide MP4 encoding.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Project export could not start."); } finally { setExporting(false); }
  };
  const icon = (t: MediaType) => t === "audio" ? <Music2 size={14} /> : t === "image" ? <ImageIcon size={14} /> : <Film size={14} />;

  return <main className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] text-black">
    <header className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-black/45">TargetBud Create</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Video Studio</h1><p className="mt-1 text-xs text-black/45">Private browser editing. Files stay on this device until you export.</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={undo} disabled={!history.length} className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Undo2 size={14}/> Undo</button><button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white"><Upload size={15}/> Import</button><button onClick={exportProject} disabled={!clips.length || exporting} className="rounded-xl border border-black px-4 py-2.5 text-xs font-bold disabled:opacity-35">{exporting ? "Exporting…" : "Export project"}</button></div></div></header>
    <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden" onChange={addFiles}/>
    {message && <div role="status" className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-xs">{message}</div></div>}
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_270px] lg:px-8">
      <aside className="rounded-2xl border border-black/10 bg-white p-3"><div className="flex items-center justify-between px-2 py-2"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Media</p><span className="text-[10px] text-black/35">{clips.length}</span></div><button onClick={() => inputRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-3 py-5 text-xs font-bold"><Plus size={16}/> Add media</button><div className="space-y-2">{clips.map(c => <button key={c.id} onClick={() => select(c.id)} className={`w-full rounded-xl border p-2 text-left ${selected === c.id ? "border-black bg-black/[.04]" : "border-black/10"}`}><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-black text-white">{icon(c.type)}</span><span className="min-w-0 truncate text-xs font-bold">{c.name}</span></div><span className="mt-1 block text-[10px] text-black/40">{c.duration ? `${len(c).toFixed(1)}s · ${laneLabel[c.lane]}` : "Reading duration…"}</span></button>)}{!clips.length && <p className="px-2 py-8 text-center text-xs leading-5 text-black/40">Add video, photo or audio to start.</p>}</div></aside>
      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-black/10 p-1">{ratios.map(r => <button key={r} onClick={() => setRatio(r)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${ratio === r ? "bg-black text-white" : "text-black/55"}`}>{r}</button>)}</div><div className="text-xs text-black/45">{clips.length} assets · {total.toFixed(1)}s</div></div><div className="flex min-h-[420px] items-center justify-center rounded-xl bg-black/[.035] p-5"><div className={`relative w-full max-w-[680px] overflow-hidden rounded-xl bg-black ${ratioClass[ratio]}`}><div className="absolute inset-0 flex items-center justify-center">{active?.type === "video" ? <video ref={videoRef} src={active.url} className="h-full w-full object-contain" playsInline /> : active?.type === "image" ? <img src={active.url} alt="Selected media" className="h-full w-full object-contain" /> : active ? <div className="text-center text-white/50"><Music2 className="mx-auto mb-2"/>Audio track selected</div> : <div className="px-6 text-center text-sm text-white/50">Your preview will appear here</div>}{text && <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center text-2xl font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]">{text}</div>}</div></div></div><div className="mt-4 flex items-center justify-center gap-2"><button onClick={() => { setCurrent(0); sync(0); }} className="grid size-9 place-items-center rounded-full border border-black/10" aria-label="Go to clip start">|&lt;</button><button onClick={() => { const v = videoRef.current; if (!v) return; if (v.paused) { sync(current); v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } }} disabled={active?.type !== "video"} className="grid size-11 place-items-center rounded-full bg-black text-white disabled:opacity-30" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button><button onClick={() => { const n = clamp(current + 5, 0, len(active)); setCurrent(n); sync(n); }} disabled={!active} className="grid size-9 place-items-center rounded-full border border-black/10" aria-label="Skip forward">&gt;|</button></div></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Timeline</p><p className="mt-1 text-xs text-black/45">Independent lanes · drag within a lane · select an asset to edit</p></div><div className="flex gap-2"><button onClick={split} disabled={!active || active.type !== "video"} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Scissors size={13}/> Split</button><button onClick={remove} disabled={!active} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Trash2 size={13}/> Remove</button></div></div>
          <div className="space-y-3">{(["video", "overlay", "audio"] as Lane[]).map(lane => <div key={lane} className="rounded-xl border border-black/10 bg-black/[.02] p-2"><div className="mb-2 flex items-center justify-between px-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-black/45">{laneLabel[lane]} lane</span><span className="text-[10px] text-black/30">{clips.filter(c => c.lane === lane).length} clips</span></div><div className="flex min-h-14 gap-2 overflow-x-auto pb-1">{clips.filter(c => c.lane === lane).map(c => <button key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragOver={e => e.preventDefault()} onDrop={(e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); if (dragId) reorder(dragId, c.id); setDragId(null); }} onClick={() => select(c.id)} className={`flex min-w-[150px] items-center gap-2 rounded-lg border px-3 py-2 text-left ${selected === c.id ? "border-black bg-white" : "border-black/10 bg-white/70"}`} aria-label={`Select ${c.name} on ${laneLabel[lane]} lane`}><GripVertical size={13} className="shrink-0 text-black/25"/><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-black text-white">{icon(c.type)}</span><span className="min-w-0"><span className="block truncate text-xs font-bold">{c.name}</span><span className="block text-[10px] text-black/40">{c.duration ? `${len(c).toFixed(1)}s` : "Loading"}</span></span></button>)}{!clips.some(c => c.lane === lane) && <span className="px-2 py-3 text-[10px] text-black/30">Drop or move media here</span>}</div></div>)}</div>
        </div>
      </section>
      <aside className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Inspector</p>{active ? <div className="mt-4 space-y-5"><div><p className="text-xs font-bold">{active.name}</p><p className="mt-1 text-[10px] text-black/40">{active.type} · {laneLabel[active.lane]}</p></div><div><label className="mb-2 block text-[11px] font-bold">Lane</label><div className="grid grid-cols-3 gap-1">{(["video", "overlay", "audio"] as Lane[]).map(l => <button key={l} onClick={() => moveLane(l)} className={`rounded-lg border px-2 py-2 text-[10px] font-bold ${active.lane === l ? "border-black bg-black text-white" : "border-black/10"}`}>{laneLabel[l]}</button>)}</div></div>{(active.type === "video" || active.type === "audio") && <div className="space-y-4"><label className="block"><span className="mb-2 flex items-center justify-between text-[11px] font-bold"><span className="inline-flex items-center gap-1"><Volume2 size={13}/> Volume</span><span>{Math.round((active.volume ?? 1) * 100)}%</span></span><input type="range" min="0" max="1" step="0.01" value={active.volume ?? 1} onChange={e => updateVolume(Number(e.target.value))} className="w-full" /></label><label className="block"><span className="mb-2 flex items-center justify-between text-[11px] font-bold"><span>Fade in</span><span>{(active.fadeIn ?? 0).toFixed(1)}s</span></span><input type="range" min="0" max={Math.max(0.1, len(active) / 2)} step="0.1" value={active.fadeIn ?? 0} onChange={e => updateMix("fadeIn", Number(e.target.value))} className="w-full" /></label><label className="block"><span className="mb-2 flex items-center justify-between text-[11px] font-bold"><span>Fade out</span><span>{(active.fadeOut ?? 0).toFixed(1)}s</span></span><input type="range" min="0" max={Math.max(0.1, len(active) / 2)} step="0.1" value={active.fadeOut ?? 0} onChange={e => updateMix("fadeOut", Number(e.target.value))} className="w-full" /></label></div>}{active.type === "video" && <div><label className="mb-2 block text-[11px] font-bold">Speed · {speed}×</label><input type="range" min="0.25" max="2" step="0.25" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full" /></div>}<div><label className="mb-2 block text-[11px] font-bold">Trim start · {active.trimStart.toFixed(1)}s</label><input type="range" min="0" max={Math.max(0, active.trimEnd - .1)} step="0.1" value={active.trimStart} onChange={e => trim("trimStart", Number(e.target.value))} className="w-full" /></div><div><label className="mb-2 block text-[11px] font-bold">Trim end · {active.trimEnd.toFixed(1)}s</label><input type="range" min={Math.min(active.duration, active.trimStart + .1)} max={active.duration || 0} step="0.1" value={active.trimEnd} onChange={e => trim("trimEnd", Number(e.target.value))} className="w-full" /></div><div><label className="mb-2 block text-[11px] font-bold">Text overlay</label><input value={text} onChange={e => setText(e.target.value)} placeholder="Add a title or caption" className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs outline-none focus:border-black" /></div></div> : <p className="mt-8 text-center text-xs leading-5 text-black/40">Select media to edit its lane, timing and audio mix.</p>}</aside>
    </div>
  </main>;
}
