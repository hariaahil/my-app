"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Film, GripVertical, Image as ImageIcon, Music2, Pause, Play, Plus, Scissors, Trash2, Undo2, Upload, Volume2 } from "lucide-react";

type MediaType = "video" | "image" | "audio";
type Clip = { id: string; name: string; url: string; type: MediaType; duration: number; trimStart: number; trimEnd: number; file: File };
type Ratio = "9:16" | "16:9" | "1:1";

const ratioClass: Record<Ratio, string> = { "9:16": "aspect-[9/16]", "16:9": "aspect-video", "1:1": "aspect-square" };
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const lengthOf = (c: Clip) => Math.max(0, c.trimEnd - c.trimStart);

export default function VideoStudioV2() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [exporting, setExporting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedClip = clips.find(c => c.id === selected) ?? clips[0];
  const totalDuration = useMemo(() => clips.reduce((n, c) => n + lengthOf(c), 0), [clips]);
  const remember = () => setHistory(h => [...h.slice(-19), clips]);
  const select = (id: string) => { setSelected(id); setCurrent(0); setPlaying(false); };

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => /^(video|image|audio)\//.test(f.type));
    if (!files.length) return;
    const next: Clip[] = files.map(file => {
      const type: MediaType = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const duration = type === "image" ? 5 : 0;
      return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type, duration, trimStart: 0, trimEnd: duration, file };
    });
    setClips(old => [...old, ...next]); setSelected(next[0]?.id ?? selected); e.target.value = ""; setMessage(null);
  };

  useEffect(() => {
    if (!selectedClip || selectedClip.duration > 0 || selectedClip.type === "image") return;
    const media = document.createElement(selectedClip.type === "audio" ? "audio" : "video");
    media.preload = "metadata"; media.src = selectedClip.url;
    const onMeta = () => { const d = Number.isFinite(media.duration) ? media.duration : 0; if (d > 0) setClips(cs => cs.map(c => c.id === selectedClip.id ? { ...c, duration: d, trimEnd: d } : c)); };
    media.addEventListener("loadedmetadata", onMeta); return () => { media.removeEventListener("loadedmetadata", onMeta); media.src = ""; };
  }, [selectedClip?.id, selectedClip?.duration, selectedClip?.type, selectedClip?.url]);

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = clips.findIndex(c => c.id === fromId), to = clips.findIndex(c => c.id === toId); if (from < 0 || to < 0) return;
    remember(); const next = [...clips]; const [item] = next.splice(from, 1); next.splice(to, 0, item); setClips(next);
  };
  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return; const i = clips.findIndex(c => c.id === selected), target = i + direction; if (i < 0 || target < 0 || target >= clips.length) return;
    remember(); const next = [...clips]; [next[i], next[target]] = [next[target], next[i]]; setClips(next);
  };
  const removeSelected = () => {
    if (!selectedClip) return; remember(); URL.revokeObjectURL(selectedClip.url); const next = clips.filter(c => c.id !== selectedClip.id); setClips(next); setSelected(next[0]?.id ?? null); setPlaying(false); setCurrent(0);
  };
  const splitSelected = () => {
    if (!selectedClip || selectedClip.type !== "video" || lengthOf(selectedClip) < 1) return;
    const local = clamp(current, 0.5, lengthOf(selectedClip) - 0.5), cut = selectedClip.trimStart + local; remember();
    const a = { ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} · 1`, trimEnd: cut }, b = { ...selectedClip, id: crypto.randomUUID(), name: `${selectedClip.name} · 2`, trimStart: cut };
    const i = clips.findIndex(c => c.id === selectedClip.id); setClips([...clips.slice(0, i), a, b, ...clips.slice(i + 1)]); setSelected(a.id); setCurrent(0);
  };
  const updateTrim = (key: "trimStart" | "trimEnd", value: number) => {
    if (!selectedClip || !selectedClip.duration) return;
    const min = key === "trimStart" ? 0 : selectedClip.trimStart + 0.1, max = key === "trimEnd" ? selectedClip.duration : selectedClip.trimEnd - 0.1;
    remember(); setClips(cs => cs.map(c => c.id === selectedClip.id ? { ...c, [key]: clamp(value, min, max) } : c));
  };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setHistory(h => h.slice(0, -1)); setClips(previous); setSelected(previous[0]?.id ?? null); setCurrent(0); setPlaying(false); };
  const sync = (local: number) => { if (videoRef.current && selectedClip?.type === "video") videoRef.current.currentTime = selectedClip.trimStart + clamp(local, 0, lengthOf(selectedClip)); };

  const exportPreview = async () => {
    const video = videoRef.current; if (!video || selectedClip?.type !== "video") return; setExporting(true); setMessage(null);
    try {
      const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      if (!capture || typeof MediaRecorder === "undefined") throw new Error("This browser does not support browser video export.");
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(capture, { mimeType: mime }); const chunks: Blob[] = []; recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); }); sync(0); video.playbackRate = speed; video.volume = volume; await video.play(); recorder.start();
      window.setTimeout(() => { video.pause(); recorder.stop(); setPlaying(false); }, Math.min(lengthOf(selectedClip) / speed * 1000, 30000)); await stopped;
      const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })); const a = document.createElement("a"); a.href = url; a.download = "targetbud-video-preview.webm"; a.click(); URL.revokeObjectURL(url);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Export could not start."); } finally { setExporting(false); }
  };

  useEffect(() => { const v = videoRef.current; if (!v) return; const onTime = () => { if (!selectedClip || selectedClip.type !== "video") return; const local = v.currentTime - selectedClip.trimStart; if (local >= lengthOf(selectedClip)) { v.pause(); setPlaying(false); setCurrent(lengthOf(selectedClip)); } else if (local >= 0) setCurrent(local); }; v.addEventListener("timeupdate", onTime); return () => v.removeEventListener("timeupdate", onTime); }, [selectedClip?.id, selectedClip?.trimStart, selectedClip?.trimEnd]);
  useEffect(() => { if (videoRef.current) { videoRef.current.playbackRate = speed; videoRef.current.volume = volume; } }, [speed, volume]);
  const iconFor = (type: MediaType) => type === "audio" ? <Music2 size={14}/> : type === "image" ? <ImageIcon size={14}/> : <Film size={14}/>;
  const onDrop = (e: DragEvent<HTMLButtonElement>, targetId: string) => { e.preventDefault(); if (dragId) reorder(dragId, targetId); setDragId(null); };

  return <main className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] text-black">
    <header className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-black/45">TargetBud Create</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Video Studio</h1><p className="mt-1 text-xs text-black/45">Edit locally in your browser. Imported files stay on this device.</p></div><div className="flex items-center gap-2"><button onClick={undo} disabled={!history.length} className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Undo2 size={14}/> Undo</button><button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white"><Upload size={15}/> Import</button><button onClick={exportPreview} disabled={!selectedClip || selectedClip.type !== "video" || exporting} className="rounded-xl border border-black px-4 py-2.5 text-xs font-bold disabled:opacity-35">{exporting ? "Exporting…" : "Export preview"}</button></div></div></header>
    <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden" onChange={addFiles}/>
    {message && <div role="status" className="mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-xs">{message}</div></div>}
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_270px] lg:px-8">
      <aside className="rounded-2xl border border-black/10 bg-white p-3"><div className="flex items-center justify-between px-2 py-2"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Media</p><span className="text-[10px] text-black/35">{clips.length}</span></div><button onClick={() => inputRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-3 py-5 text-xs font-bold hover:bg-black/[.03]"><Plus size={16}/> Add media</button><div className="space-y-2">{clips.map(c => <button key={c.id} onClick={() => select(c.id)} className={`w-full rounded-xl border p-2 text-left ${selected===c.id ? "border-black bg-black/[.04]" : "border-black/10"}`}><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-black text-white">{iconFor(c.type)}</span><span className="min-w-0 truncate text-xs font-bold">{c.name}</span></div><span className="mt-1 block text-[10px] text-black/40">{c.duration ? `${lengthOf(c).toFixed(1)}s / ${c.duration.toFixed(1)}s` : "Reading duration…"}</span></button>)}{!clips.length && <p className="px-2 py-8 text-center text-xs leading-5 text-black/40">Add video, photo or audio to start a project.</p>}</div></aside>
      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-black/10 p-1">{(["9:16","16:9","1:1"] as Ratio[]).map(r => <button key={r} onClick={() => setRatio(r)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${ratio===r ? "bg-black text-white" : "text-black/55"}`}>{r}</button>)}</div><div className="text-xs text-black/45">{clips.length} clips · {totalDuration.toFixed(1)}s</div></div><div className="flex min-h-[420px] items-center justify-center rounded-xl bg-black/[.035] p-5"><div className={`relative w-full max-w-[680px] overflow-hidden rounded-xl bg-black ${ratioClass[ratio]}`}><div className="absolute inset-0 flex items-center justify-center">{selectedClip?.type === "video" ? <video ref={videoRef} src={selectedClip.url} className="h-full w-full object-contain" playsInline /> : selectedClip?.type === "image" ? <img src={selectedClip.url} alt="Selected media" className="h-full w-full object-contain"/> : selectedClip ? <div className="text-center text-white/50"><Music2 className="mx-auto mb-2"/>Audio track selected</div> : <div className="px-6 text-center text-sm text-white/50">Your preview will appear here</div>}{text && <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center text-2xl font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]">{text}</div>}</div></div></div><div className="mt-4 flex items-center justify-center gap-2"><button onClick={() => { setCurrent(0); sync(0); }} className="grid size-9 place-items-center rounded-full border border-black/10" aria-label="Go to clip start">|&lt;</button><button onClick={() => { const v=videoRef.current; if (!v) return; if (v.paused) { sync(current); v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } }} disabled={selectedClip?.type !== "video"} className="grid size-11 place-items-center rounded-full bg-black text-white disabled:opacity-30" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button><button onClick={() => { const next=clamp(current+5,0,lengthOf(selectedClip ?? {trimStart:0,trimEnd:0} as Clip)); setCurrent(next); sync(next); }} disabled={!selectedClip} className="grid size-9 place-items-center rounded-full border border-black/10" aria-label="Skip forward">&gt;|</button></div></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Timeline</p><p className="mt-1 text-xs text-black/45">Drag clips to reorder. Keyboard users can use ↑ / ↓.</p></div><div className="flex gap-2"><button onClick={() => moveSelected(-1)} disabled={!selected || clips.findIndex(c=>c.id===selected)<=0} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30" aria-label="Move clip left">←</button><button onClick={() => moveSelected(1)} disabled={!selected || clips.findIndex(c=>c.id===selected)<0 || clips.findIndex(c=>c.id===selected)>=clips.length-1} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30" aria-label="Move clip right">→</button><button onClick={splitSelected} disabled={!selectedClip || selectedClip.type!=="video"} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Scissors size={14}/> Split</button><button onClick={removeSelected} disabled={!selectedClip} className="grid size-9 place-items-center rounded-lg border border-black/10 disabled:opacity-30" aria-label="Remove selected clip"><Trash2 size={14}/></button></div></div><div className="flex gap-2 overflow-x-auto rounded-xl bg-black/[.035] p-2">{clips.map((c,i) => <button key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,c.id)} onDragEnd={()=>setDragId(null)} onClick={()=>select(c.id)} onKeyDown={e=>{if(e.key==="ArrowUp"){e.preventDefault();moveSelected(-1)}if(e.key==="ArrowDown"){e.preventDefault();moveSelected(1)}}} className={`group relative min-w-[170px] rounded-lg border px-3 py-3 text-left ${selected===c.id?"border-black bg-white":"border-black/10 bg-white/60"}`} aria-label={`Clip ${i+1}: ${c.name}. Drag to reorder`}><div className="flex items-center gap-2"><GripVertical size={14} className="shrink-0 text-black/30"/><span className="truncate text-xs font-bold">{c.name}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full w-full rounded-full bg-black"/></div><div className="mt-2 text-[10px] text-black/40">{lengthOf(c).toFixed(1)} sec · {c.type}</div></button>)}{!clips.length&&<div className="flex min-h-20 w-full items-center justify-center text-xs text-black/35">No clips yet</div>}</div></div>
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Quick edits</p>{selectedClip ? <div className="mt-4 space-y-4"><div><p className="text-xs font-bold">Trim</p><p className="mt-1 text-[10px] text-black/45">{selectedClip.trimStart.toFixed(1)}s → {selectedClip.trimEnd.toFixed(1)}s</p><label className="mt-3 block text-[10px] font-semibold text-black/50">Start<input aria-label="Trim start" type="range" min="0" max={Math.max(0,selectedClip.duration-0.1)} step="0.1" value={selectedClip.trimStart} onChange={e=>updateTrim("trimStart",Number(e.target.value))} className="mt-1 w-full"/></label><label className="mt-3 block text-[10px] font-semibold text-black/50">End<input aria-label="Trim end" type="range" min={Math.min(selectedClip.duration,selectedClip.trimStart+0.1)} max={selectedClip.duration} step="0.1" value={selectedClip.trimEnd} onChange={e=>updateTrim("trimEnd",Number(e.target.value))} className="mt-1 w-full"/></label></div><label className="block text-xs font-bold">Text overlay<input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a title or caption" className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none focus:border-black"/></label><label className="block text-xs font-bold">Speed <span className="font-normal text-black/45">{speed}×</span><input aria-label="Playback speed" type="range" min="0.5" max="2" step="0.25" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="mt-2 w-full"/></label><label className="block text-xs font-bold"><span className="inline-flex items-center gap-1"><Volume2 size={14}/> Volume</span><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="mt-2 w-full"/></label></div> : <p className="mt-4 text-xs leading-5 text-black/40">Select a clip to edit its trim, text, speed or volume.</p>}</div><div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Export status</p><p className="mt-2 text-xs leading-5 text-black/50">Browser export currently produces a WebM preview. A true MP4 pipeline remains a separate processing milestone.</p></div></aside>
    </div>
  </main>;
}
