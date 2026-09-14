"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Music2, Pause, Play, Plus, Scissors, SkipBack, SkipForward, Trash2, Upload, Volume2 } from "lucide-react";

type Clip = { id: string; name: string; url: string; type: "video" | "image" | "audio"; duration: number; file: File };
type Ratio = "9:16" | "16:9" | "1:1";

const ratioClass: Record<Ratio, string> = { "9:16": "aspect-[9/16]", "16:9": "aspect-video", "1:1": "aspect-square" };

export default function VideoStudio() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [exporting, setExporting] = useState(false);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedClip = clips.find(c => c.id === selected) ?? clips[0];

  const totalDuration = useMemo(() => clips.reduce((sum, clip) => sum + clip.duration, 0), [clips]);
  const pushHistory = () => setHistory(h => [...h.slice(-19), clips]);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const next = files.filter(f => f.type.startsWith("video/") || f.type.startsWith("image/") || f.type.startsWith("audio/")).map(file => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      duration: file.type.startsWith("image/") ? 5 : 0,
      file,
    } as Clip));
    setClips(prev => [...prev, ...next]);
    setSelected(next[0]?.id ?? selected);
    event.target.value = "";
  };

  const removeSelected = () => {
    if (!selected) return;
    const removed = clips.find(c => c.id === selected);
    pushHistory();
    const next = clips.filter(c => c.id !== selected);
    if (removed) URL.revokeObjectURL(removed.url);
    setClips(next);
    setSelected(next[0]?.id ?? null);
    setPlaying(false);
  };

  const splitSelected = () => {
    if (!selectedClip || selectedClip.type !== "video" || selectedClip.duration < 2) return;
    const cut = Math.min(Math.max(current, 0.5), selectedClip.duration - 0.5);
    const a: Clip = { ...selectedClip, id: `${selectedClip.id}-a`, name: `${selectedClip.name} · 1`, duration: cut };
    const b: Clip = { ...selectedClip, id: `${selectedClip.id}-b`, name: `${selectedClip.name} · 2`, duration: selectedClip.duration - cut };
    const index = clips.findIndex(c => c.id === selectedClip.id);
    const next = [...clips.slice(0, index), a, b, ...clips.slice(index + 1)];
    pushHistory();
    setClips(next);
    setSelected(a.id);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(h => h.slice(0, -1));
    setClips(previous);
    setSelected(previous[0]?.id ?? null);
  };

  const exportPreview = async () => {
    const video = mediaRef.current;
    if (!video || selectedClip?.type !== "video") return;
    setExporting(true);
    try {
      const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      if (!stream || typeof MediaRecorder === "undefined") throw new Error("Browser export is not supported here.");
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
      video.currentTime = 0;
      setPlaying(true);
      await video.play();
      recorder.start();
      setTimeout(() => { video.pause(); recorder.stop(); setPlaying(false); }, Math.min((selectedClip.duration || 10) * 1000, 30000));
      await done;
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "targetbud-video-preview.webm"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Export could not start.");
    } finally { setExporting(false); }
  };

  useEffect(() => { if (mediaRef.current) { mediaRef.current.playbackRate = speed; mediaRef.current.volume = volume; } }, [speed, volume]);
  useEffect(() => { const v = mediaRef.current; if (!v) return; const onTime = () => setCurrent(v.currentTime); const onEnd = () => setPlaying(false); v.addEventListener("timeupdate", onTime); v.addEventListener("ended", onEnd); return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); }; }, [selectedClip?.id]);

  return <main className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] text-black">
    <section className="border-b border-black/10 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-black/45">TargetBud Create</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Video Studio</h1></div><div className="flex items-center gap-2"><button onClick={undo} disabled={!history.length} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30">Undo</button><button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white"><Upload size={15}/> Import</button><button onClick={exportPreview} disabled={!selectedClip || selectedClip.type !== "video" || exporting} className="rounded-xl border border-black bg-white px-4 py-2.5 text-xs font-bold disabled:opacity-35">{exporting ? "Exporting…" : "Export preview"}</button></div></div></section>
    <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden" onChange={addFiles}/>
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_260px] lg:px-8">
      <aside className="rounded-2xl border border-black/10 bg-white p-3"><p className="px-2 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Media</p><button onClick={() => inputRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-3 py-5 text-xs font-bold hover:bg-black/[.03]"><Plus size={16}/> Add media</button><div className="space-y-2">{clips.map(c => <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full rounded-xl border p-2 text-left ${selected===c.id ? "border-black bg-black/[.04]" : "border-black/10"}`}><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-black text-white">{c.type === "audio" ? <Music2 size={14}/> : <Film size={14}/>}</span><span className="min-w-0 truncate text-xs font-bold">{c.name}</span></div><span className="mt-1 block text-[10px] text-black/40">{c.duration ? `${c.duration.toFixed(1)}s` : "Reading duration…"}</span></button>)}{!clips.length && <p className="px-2 py-6 text-center text-xs leading-5 text-black/40">Import a video, photo or audio file to start.</p>}</div></aside>
      <section className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-black/10 p-1">{(["9:16","16:9","1:1"] as Ratio[]).map(r => <button key={r} onClick={() => setRatio(r)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${ratio===r ? "bg-black text-white" : "text-black/55"}`}>{r}</button>)}</div><div className="flex items-center gap-2 text-xs text-black/45"><span>{clips.length} clips</span><span>·</span><span>{totalDuration.toFixed(1)}s timeline</span></div></div><div className="flex min-h-[420px] items-center justify-center rounded-xl bg-black/[.035] p-5"><div className={`relative w-full max-w-[680px] overflow-hidden rounded-xl bg-black ${ratioClass[ratio]}`}><div className="absolute inset-0 flex items-center justify-center">{selectedClip?.type === "video" ? <video ref={mediaRef} src={selectedClip.url} className="h-full w-full object-contain" playsInline onLoadedMetadata={e => { const d=e.currentTarget.duration; if (Number.isFinite(d)) setClips(cs=>cs.map(c=>c.id===selectedClip.id?{...c,duration:d}:c)); }} /> : selectedClip?.type === "image" ? <img src={selectedClip.url} alt="Selected media" className="h-full w-full object-contain"/> : <div className="text-center text-white/50"><Music2 className="mx-auto mb-2"/>Audio track selected</div>}{text && <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center text-2xl font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,.8)]">{text}</div>}{!selectedClip && <div className="px-6 text-center text-sm text-white/50">Your preview will appear here</div>}</div></div></div><div className="mt-4 flex items-center justify-center gap-2"><button onClick={() => { if(mediaRef.current){mediaRef.current.currentTime=0;setCurrent(0);}}} className="grid size-9 place-items-center rounded-full border border-black/10"><SkipBack size={15}/></button><button onClick={() => { const v=mediaRef.current; if(!v)return; if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)} }} disabled={!selectedClip || selectedClip.type !== "video"} className="grid size-11 place-items-center rounded-full bg-black text-white disabled:opacity-30">{playing?<Pause size={17}/>:<Play size={17}/>}</button><button onClick={() => { if(mediaRef.current){mediaRef.current.currentTime=Math.min(mediaRef.current.duration||0,current+5);}}} className="grid size-9 place-items-center rounded-full border border-black/10"><SkipForward size={15}/></button></div></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Timeline</p><p className="mt-1 text-xs text-black/45">Select a clip, then split or remove it.</p></div><div className="flex gap-2"><button onClick={splitSelected} disabled={!selectedClip || selectedClip.type !== "video"} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:opacity-30"><Scissors size={14}/> Split</button><button onClick={removeSelected} disabled={!selectedClip} className="grid size-9 place-items-center rounded-lg border border-black/10 text-black/60 disabled:opacity-30" aria-label="Remove selected clip"><Trash2 size={14}/></button></div></div><div className="flex gap-2 overflow-x-auto rounded-xl bg-black/[.035] p-2">{clips.map(c => <button key={c.id} onClick={() => setSelected(c.id)} className={`min-w-[150px] rounded-lg border px-3 py-3 text-left ${selected===c.id?"border-black bg-white":"border-black/10 bg-white/60"}`}><div className="text-xs font-bold truncate">{c.name}</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full w-full rounded-full bg-black"/></div><div className="mt-2 text-[10px] text-black/40">{c.duration ? `${c.duration.toFixed(1)} sec` : "loading"}</div></button>)}{!clips.length&&<div className="flex min-h-20 w-full items-center justify-center text-xs text-black/35">No clips yet</div>}</div></div>
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Quick edits</p><label className="mt-4 block text-xs font-bold">Text overlay<input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a title…" className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black"/></label><label className="mt-4 block text-xs font-bold">Speed <span className="float-right font-normal text-black/45">{speed}×</span><input type="range" min="0.25" max="2" step="0.25" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="mt-3 w-full"/></label><label className="mt-4 block text-xs font-bold"><span className="inline-flex items-center gap-1"><Volume2 size={13}/> Volume</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="mt-3 w-full"/></label></div><div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-black/40">Next build</p><ul className="mt-3 space-y-2 text-xs leading-5 text-black/55"><li>• MP4 export pipeline</li><li>• Captions & transitions</li><li>• Filters and crop controls</li><li>• Shorts/Reels templates</li><li>• News/article → short video</li></ul></div></aside>
    </div>
  </main>;
}
