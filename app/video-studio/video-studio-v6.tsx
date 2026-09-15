"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Copy, Crop,
  Film, FolderOpen, Gauge, Grid2X2, Image as ImageIcon, Layers3, Maximize2,
  Menu, Mic, Minus, Music2, Pause, Play, Plus, Redo2, RotateCw, Scissors,
  Settings2, SlidersHorizontal, Sparkles, Square, Sticker, Trash2, Type,
  Undo2, Upload, Volume2, WandSparkles, X, Zap
} from "lucide-react";
import { getBrowserExportFormat } from "./export-support";
import { exportBrowserComposition, type CompositionClip } from "./browser-compositor";

type MediaType = "video" | "image" | "audio";
type Lane = "video" | "overlay" | "audio" | "voice";
type Ratio = "9:16" | "16:9" | "1:1";
type Tool = "media" | "audio" | "text" | "stickers" | "effects" | "transitions" | "filters" | "adjust" | "ai";
type Filter = "none" | "mono" | "warm" | "cool" | "vivid" | "fade";
type InspectorTab = "video" | "audio" | "speed" | "animate" | "adjust";
type Clip = CompositionClip & {
  file: File;
  lane: Lane;
  filter: Filter;
  rotation: number;
  scale: number;
  x: number;
  y: number;
  transition: "none" | "fade" | "slide";
};

const ratios: Ratio[] = ["9:16", "16:9", "1:1"];
const filters: Filter[] = ["none", "mono", "warm", "cool", "vivid", "fade"];
const tools: Array<[Tool, string, ReactNode]> = [
  ["media", "Media", <Film size={18} key="media" />],
  ["audio", "Audio", <Music2 size={18} key="audio" />],
  ["text", "Text", <Type size={18} key="text" />],
  ["stickers", "Stickers", <Sticker size={18} key="stickers" />],
  ["effects", "Effects", <Sparkles size={18} key="effects" />],
  ["transitions", "Transitions", <Layers3 size={18} key="transitions" />],
  ["filters", "Filters", <SlidersHorizontal size={18} key="filters" />],
  ["adjust", "Adjust", <Settings2 size={18} key="adjust" />],
  ["ai", "AI Tools", <WandSparkles size={18} key="ai" />],
];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const lengthOf = (c?: Clip) => c ? Math.max(0, c.trimEnd - c.trimStart) : 0;
const mediaLane = (type: MediaType): Lane => type === "audio" ? "audio" : type === "image" ? "overlay" : "video";
const laneLabel: Record<Lane, string> = { video: "Video", overlay: "Overlay", audio: "Audio", voice: "Voice" };

export default function VideoStudioV6() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [tool, setTool] = useState<Tool>("media");
  const [inspector, setInspector] = useState<InspectorTab>("video");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [future, setFuture] = useState<Clip[][]>([]);
  const [projectName, setProjectName] = useState("Untitled project");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = clips.find((c) => c.id === selectedId) ?? clips[0];

  const visualClips = useMemo(() => clips.filter((c) => c.lane !== "audio" && c.lane !== "voice"), [clips]);
  const audioClips = useMemo(() => clips.filter((c) => c.lane === "audio" || c.lane === "voice"), [clips]);
  const total = useMemo(() => visualClips.reduce((n, c) => n + lengthOf(c), 0), [visualClips]);
  const timelineWidth = Math.max(820, total * 75 * zoom + 180);

  const remember = () => {
    setHistory((h) => [...h.slice(-29), clips]);
    setFuture([]);
  };

  const select = (id: string) => {
    setSelectedId(id);
    setCurrent(0);
    setPlaying(false);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((f) => /^(video|image|audio)\//.test(f.type));
    if (!files.length) return;
    const next: Clip[] = files.map((file) => {
      const type: MediaType = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const duration = type === "image" ? 5 : 0;
      return {
        id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type,
        lane: mediaLane(type), duration, trimStart: 0, trimEnd: duration,
        volume: type === "image" ? 0 : 1, fadeIn: 0, fadeOut: 0, file,
        filter: "none", rotation: 0, scale: 1, x: 0, y: 0, transition: "none",
      };
    });
    remember();
    setClips((currentClips) => [...currentClips, ...next]);
    setSelectedId(next[0]?.id ?? selectedId);
    event.target.value = "";
    setMessage(`${next.length} media item${next.length > 1 ? "s" : ""} imported.`);
  };

  useEffect(() => {
    if (!active || active.duration || active.type === "image") return;
    const media = document.createElement(active.type === "audio" ? "audio" : "video");
    media.preload = "metadata";
    media.src = active.url;
    const loaded = () => {
      if (!Number.isFinite(media.duration) || media.duration <= 0) return;
      setClips((items) => items.map((c) => c.id === active.id ? { ...c, duration: media.duration, trimEnd: media.duration } : c));
    };
    media.addEventListener("loadedmetadata", loaded);
    return () => { media.removeEventListener("loadedmetadata", loaded); media.src = ""; };
  }, [active?.id, active?.duration, active?.type, active?.url]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || active?.type !== "video") return;
    const tick = () => {
      const local = video.currentTime - active.trimStart;
      if (local >= lengthOf(active)) {
        video.pause(); setPlaying(false); setCurrent(lengthOf(active));
      } else if (local >= 0) setCurrent(local);
    };
    video.addEventListener("timeupdate", tick);
    return () => video.removeEventListener("timeupdate", tick);
  }, [active?.id, active?.trimStart, active?.trimEnd, active?.type]);

  const update = (patch: Partial<Clip>) => {
    if (!active) return;
    remember();
    setClips((items) => items.map((c) => c.id === active.id ? { ...c, ...patch } : c));
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((f) => [...f, clips]); setHistory((h) => h.slice(0, -1)); setClips(previous);
    setSelectedId(previous[0]?.id ?? null);
  };
  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((h) => [...h, clips]); setFuture((f) => f.slice(0, -1)); setClips(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const togglePlay = () => {
    if (!active) { setMessage("Import a video first."); return; }
    if (active.type !== "video") { setPlaying((p) => !p); return; }
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); }
    else {
      if (video.currentTime < active.trimStart || video.currentTime >= active.trimEnd) video.currentTime = active.trimStart + current;
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const syncTime = (value: number) => {
    setCurrent(value);
    if (videoRef.current && active?.type === "video") videoRef.current.currentTime = active.trimStart + clamp(value, 0, lengthOf(active));
  };

  const split = () => {
    if (!active || active.type !== "video" || lengthOf(active) < 1) return;
    const local = clamp(current, 0.1, lengthOf(active) - 0.1);
    const cut = active.trimStart + local;
    remember();
    const first: Clip = { ...active, id: crypto.randomUUID(), name: `${active.name} · A`, trimEnd: cut };
    const second: Clip = { ...active, id: crypto.randomUUID(), name: `${active.name} · B`, trimStart: cut };
    const index = clips.findIndex((c) => c.id === active.id);
    setClips([...clips.slice(0, index), first, second, ...clips.slice(index + 1)]);
    setSelectedId(first.id); setCurrent(0);
  };

  const remove = () => {
    if (!active) return;
    remember(); URL.revokeObjectURL(active.url);
    const next = clips.filter((c) => c.id !== active.id);
    setClips(next); setSelectedId(next[0]?.id ?? null); setCurrent(0);
  };

  const duplicate = () => {
    if (!active) return;
    remember();
    const copy: Clip = { ...active, id: crypto.randomUUID(), name: `${active.name} copy` };
    const i = clips.findIndex((c) => c.id === active.id);
    setClips([...clips.slice(0, i + 1), copy, ...clips.slice(i + 1)]); setSelectedId(copy.id);
  };

  const reorder = (from: string, to: string) => {
    if (from === to) return;
    const a = clips.findIndex((c) => c.id === from), b = clips.findIndex((c) => c.id === to);
    if (a < 0 || b < 0 || clips[a].lane !== clips[b].lane) return;
    remember(); const next = [...clips]; const [item] = next.splice(a, 1); next.splice(b, 0, item); setClips(next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.currentTarget.dataset.clip;
    if (dragId && target) reorder(dragId, target);
    setDragId(null);
  };

  const exportProject = async () => {
    if (!clips.length) { setMessage("Import media before exporting."); return; }
    setExporting(true); setMessage(null);
    try {
      const format = getBrowserExportFormat();
      if (!format) throw new Error("This browser cannot encode a project video.");
      const result = await exportBrowserComposition({ clips, ratio, text: caption, mimeType: format.mimeType, extension: format.extension });
      const url = URL.createObjectURL(result.blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${projectName.replace(/[^a-z0-9-_]+/gi, "-")}.${result.extension}`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage(`Export complete: ${result.extension.toUpperCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally { setExporting(false); }
  };

  const renderToolPanel = () => {
    if (tool === "media") return <MediaPanel clips={clips} selectedId={selectedId} onSelect={select} onImport={() => inputRef.current?.click()} />;
    if (tool === "text") return <div className="space-y-4"><PanelTitle icon={<Type size={16} />} title="Text" /><textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Type your title or caption" className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm outline-none placeholder:text-white/25"/><div className="grid grid-cols-2 gap-2"><button className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs"><Type size={17} className="mx-auto mb-1"/>Add text</button><button className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs"><Zap size={17} className="mx-auto mb-1"/>Template</button></div></div>;
    if (tool === "audio") return <div className="space-y-4"><PanelTitle icon={<Music2 size={16} />} title="Audio" /><button onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[.03] p-5 text-xs font-semibold"><Upload size={16}/> Import audio</button><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="mb-2 text-xs font-semibold">Audio tracks</div>{audioClips.length ? audioClips.map((c) => <div key={c.id} className="flex items-center gap-2 border-b border-white/5 py-2 text-[11px]"><Volume2 size={14}/><span className="truncate">{c.name}</span></div>) : <span className="text-[10px] text-white/30">No audio imported.</span>}</div></div>;
    if (tool === "filters") return <div className="space-y-3"><PanelTitle icon={<SlidersHorizontal size={16} />} title="Filters" />{filters.map((f) => <button key={f} disabled={!active} onClick={() => update({ filter: f })} className={`w-full rounded-xl border p-3 text-left text-xs ${active?.filter === f ? "border-white bg-white text-black" : "border-white/10 bg-white/[.04]"}`}>{f[0].toUpperCase() + f.slice(1)}<span className="float-right text-white/25">{f === "none" ? "Original" : "Preview"}</span></button>)}</div>;
    if (tool === "effects") return <EffectPanel active={active} update={update} />;
    if (tool === "transitions") return <div className="space-y-3"><PanelTitle icon={<Layers3 size={16} />} title="Transitions" />{(["none", "fade", "slide"] as const).map((t) => <button key={t} disabled={!active} onClick={() => update({ transition: t })} className={`w-full rounded-xl border p-3 text-left text-xs ${active?.transition === t ? "border-white bg-white text-black" : "border-white/10 bg-white/[.04]"}`}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>;
    if (tool === "stickers") return <div className="space-y-4"><PanelTitle icon={<Sticker size={16} />} title="Stickers" /><div className="grid grid-cols-3 gap-2">{["😂", "🔥", "❤️", "✨", "😎", "🎯", "💯", "👀", "🚀"].map((s) => <button key={s} onClick={() => setCaption((v) => `${v} ${s}`.trim())} className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[.04] text-2xl">{s}</button>)}</div></div>;
    if (tool === "ai") return <div className="space-y-3"><PanelTitle icon={<WandSparkles size={16} />} title="AI Tools" />{["Auto captions", "Remove background", "Enhance quality", "Noise reduction", "Auto reframe"].map((x) => <button key={x} onClick={() => setMessage(`${x} is ready for the next processing step.`)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs"><span>{x}</span><ChevronRight size={14} className="text-white/30"/></button>)}</div>;
    return <div className="space-y-4"><PanelTitle icon={<Settings2 size={16} />} title="Adjust" />{["Brightness", "Contrast", "Saturation", "Temperature", "Sharpen"].map((label) => <label key={label} className="block text-[11px] text-white/55">{label}<input type="range" min="-100" max="100" defaultValue="0" className="mt-2 w-full accent-white"/></label>)}</div>;
  };

  return <main className="min-h-screen overflow-hidden bg-[#0a0b0d] text-white">
    <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" multiple className="hidden" onChange={addFiles} />
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#15171a] px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3"><button aria-label="Back" className="rounded-lg p-2 hover:bg-white/10"><ChevronLeft size={18}/></button><div className="flex items-center gap-2"><div className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-violet-500 text-black"><Film size={15}/></div><span className="hidden font-bold sm:inline">TargetBud <span className="font-normal text-white/55">Video Studio</span></span></div><input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="ml-1 hidden w-40 bg-transparent text-xs font-semibold outline-none sm:block lg:w-56"/><span className="hidden rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/45 lg:block">✓ All changes saved</span></div>
      <div className="flex items-center gap-1.5"><span className="hidden text-[10px] text-white/30 lg:inline">Project: {projectName}</span><button onClick={undo} disabled={!history.length} aria-label="Undo" className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-25"><Undo2 size={17}/></button><button onClick={redo} disabled={!future.length} aria-label="Redo" className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-25"><Redo2 size={17}/></button><button onClick={() => setMessage("Keyboard shortcuts: Space play, S split, Delete remove.")} className="hidden items-center gap-2 rounded-lg bg-white/[.06] px-3 py-2 text-xs sm:flex"><CircleHelp size={14}/> Shortcut</button><button onClick={exportProject} disabled={exporting} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-black disabled:opacity-40">{exporting ? "Exporting…" : "Export"}</button><button onClick={() => setMobileMenu(true)} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Menu"><Menu size={18}/></button></div>
    </header>

    <div className="hidden h-[calc(100vh-56px)] lg:grid lg:grid-cols-[74px_250px_minmax(520px,1fr)_292px]">
      <ToolRail tool={tool} setTool={setTool}/>
      <aside className="overflow-y-auto border-r border-white/10 bg-[#15171a] p-3">{renderToolPanel()}</aside>
      <EditorCenter ratio={ratio} setRatio={setRatio} active={active} caption={caption} videoRef={videoRef} playing={playing} togglePlay={togglePlay} current={current} syncTime={syncTime} />
      <Inspector active={active} tab={inspector} setTab={setInspector} update={update} speed={speed} setSpeed={setSpeed}/>
    </div>

    <div className="flex min-h-[calc(100vh-56px)] flex-col lg:hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111316] px-3 py-2"><button onClick={() => setMobileMenu(true)} className="rounded-lg p-2"><Menu size={18}/></button><div className="max-w-[160px] truncate text-xs font-semibold">{projectName}</div><button onClick={() => inputRef.current?.click()} className="rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold"><Upload size={13} className="mr-1 inline"/>Import</button></div>
      <div className="flex flex-1 flex-col bg-[#090a0c]">
        <div className="flex min-h-0 flex-1 items-center justify-center p-4"><MobilePreview ratio={ratio} active={active} caption={caption} videoRef={videoRef} playing={playing} togglePlay={togglePlay}/></div>
        <MobileTimeline clips={visualClips} selectedId={selectedId} select={select} current={current} syncTime={syncTime} zoom={zoom} setZoom={setZoom} onSplit={split} onDelete={remove}/>
      </div>
      <div className="border-t border-white/10 bg-[#121417] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2"><div className="grid grid-cols-5 gap-1">{([["media","Edit",<Crop size={18}/>],["audio","Audio",<Music2 size={18}/>],["text","Text",<Type size={18}/>],["effects","Effects",<Sparkles size={18}/>],["filters","Filters",<SlidersHorizontal size={18}/>]] as const).map(([id,label,icon]) => <button key={id} onClick={() => setTool(id)} className={`rounded-xl py-2 text-[10px] ${tool === id ? "bg-white text-black" : "text-white/60"}`}>{icon}<span className="mt-1 block">{label}</span></button>)}</div></div>
      {message && <div className="fixed bottom-20 left-3 right-3 z-30 rounded-xl border border-white/10 bg-[#202328] p-3 text-center text-xs shadow-2xl">{message}</div>}
    </div>

    <div className="hidden lg:block"><Timeline clips={clips} visualClips={visualClips} audioClips={audioClips} selectedId={selectedId} select={select} current={current} syncTime={syncTime} zoom={zoom} setZoom={setZoom} onSplit={split} onDelete={remove} onDuplicate={duplicate} onDragStart={setDragId} onDrop={onDrop}/></div>
    {message && <div className="fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-[#202328] px-4 py-3 text-xs shadow-2xl lg:block">{message}</div>}
    {mobileMenu && <MobileSheet onClose={() => setMobileMenu(false)} tools={tools} tool={tool} setTool={setTool} content={renderToolPanel()} />}
  </main>;
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) { return <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-bold">{icon}<span>{title}</span></div>; }

function MediaPanel({ clips, selectedId, onSelect, onImport }: { clips: Clip[]; selectedId: string | null; onSelect: (id: string) => void; onImport: () => void }) {
  return <div><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold">Media</span><span className="text-[10px] text-white/30">{clips.length} items</span></div><div className="mb-3 grid grid-cols-3 rounded-lg bg-white/[.04] p-1 text-[10px]"><button className="rounded-md bg-white/10 py-1.5">Local</button><button className="py-1.5 text-white/35">Stock</button><button className="py-1.5 text-white/35">Brand</button></div><button onClick={onImport} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.04] p-3 text-xs font-bold hover:bg-white/[.08]"><Upload size={15}/> Import</button><div className="grid grid-cols-2 gap-2">{clips.map((c) => <button key={c.id} onClick={() => onSelect(c.id)} className={`overflow-hidden rounded-lg border text-left ${selectedId === c.id ? "border-cyan-300" : "border-white/10"}`}><div className="grid aspect-[1.25] place-items-center bg-[#202226]">{c.type === "image" ? <ImageIcon size={22} className="text-white/40"/> : c.type === "audio" ? <Music2 size={22} className="text-white/40"/> : <Film size={22} className="text-white/40"/>}</div><div className="truncate px-2 py-1.5 text-[9px]">{c.name}</div></button>)}{!clips.length && <div className="col-span-2 rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] leading-5 text-white/25"><FolderOpen size={20} className="mx-auto mb-2"/>Import video, photos or audio.</div>}</div></div>;
}

function ToolRail({ tool, setTool }: { tool: Tool; setTool: (t: Tool) => void }) {
  return <nav className="flex flex-col items-center gap-1 overflow-y-auto border-r border-white/10 bg-[#111316] px-2 py-3">{tools.map(([id, label, icon]) => <button key={id} onClick={() => setTool(id)} className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[9px] font-semibold ${tool === id ? "bg-cyan-300 text-black" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>{icon}<span>{label}</span></button>)}</nav>;
}

function EditorCenter({ ratio, setRatio, active, caption, videoRef, playing, togglePlay, current, syncTime }: { ratio: Ratio; setRatio: (r: Ratio) => void; active?: Clip; caption: string; videoRef: React.RefObject<HTMLVideoElement | null>; playing: boolean; togglePlay: () => void; current: number; syncTime: (n: number) => void }) {
  const aspect = ratio === "9:16" ? "aspect-[9/16] max-h-[62vh]" : ratio === "16:9" ? "aspect-video w-full max-w-[760px]" : "aspect-square max-h-[62vh]";
  return <section className="flex min-w-0 flex-col bg-[#0b0d0f]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-2"><span className="text-xs text-white/40">Player</span><div className="flex gap-1">{ratios.map((r) => <button key={r} onClick={() => setRatio(r)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${ratio === r ? "bg-white text-black" : "bg-white/5 text-white/50"}`}>{r}</button>)}</div></div><div className="flex flex-1 items-center justify-center p-5"><div className={`relative w-full overflow-hidden rounded-lg bg-black shadow-2xl ${aspect}`}><div className="absolute inset-0 grid place-items-center">{active?.type === "video" ? <video ref={videoRef} src={active.url} className="h-full w-full object-contain" playsInline onPlay={() => undefined} /> : active?.type === "image" ? <img src={active.url} alt="" className="h-full w-full object-contain"/> : active?.type === "audio" ? <div className="text-center text-white/40"><Music2 size={42} className="mx-auto mb-2"/><div className="text-xs">{active.name}</div></div> : <div className="text-center text-white/25"><Film size={44} className="mx-auto mb-2"/><div className="text-xs">Import media to start</div></div>}{caption && <div className="pointer-events-none absolute left-4 right-4 top-[42%] text-center text-2xl font-black text-yellow-300 drop-shadow-[0_3px_2px_rgba(0,0,0,.9)] sm:text-4xl">{caption}</div>}</div><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10"><span className="font-mono text-[10px]">00:{current.toFixed(2).padStart(5, "0")}</span><button onClick={togglePlay} className="grid size-9 place-items-center rounded-full bg-white text-black">{playing ? <Pause size={16}/> : <Play size={16} className="ml-0.5"/>}</button><Maximize2 size={16} className="text-white/70"/></div></div></div></section>;
}

function MobilePreview({ ratio, active, caption, videoRef, playing, togglePlay }: { ratio: Ratio; active?: Clip; caption: string; videoRef: React.RefObject<HTMLVideoElement | null>; playing: boolean; togglePlay: () => void }) {
  const aspect = ratio === "9:16" ? "aspect-[9/16]" : ratio === "16:9" ? "aspect-video w-full" : "aspect-square";
  return <div className={`relative max-h-[58vh] w-full max-w-[420px] overflow-hidden rounded-xl bg-black shadow-2xl ${aspect}`}>{active?.type === "video" ? <video ref={videoRef} src={active.url} className="h-full w-full object-contain" playsInline/> : active?.type === "image" ? <img src={active.url} alt="" className="h-full w-full object-contain"/> : <div className="grid h-full place-items-center text-white/25"><Film size={40}/></div>}{caption && <div className="pointer-events-none absolute left-3 right-3 top-[42%] text-center text-2xl font-black text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,.9)]">{caption}</div>}<button onClick={togglePlay} className="absolute bottom-3 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-black/60 text-white">{playing ? <Pause size={18}/> : <Play size={18}/>}</button></div>;
}

function EffectPanel({ active, update }: { active?: Clip; update: (patch: Partial<Clip>) => void }) {
  return <div className="space-y-5"><PanelTitle icon={<Sparkles size={16}/>} title="Effects"/><label className="block text-[11px] text-white/55">Scale <span className="float-right text-white/80">{Math.round((active?.scale ?? 1) * 100)}%</span><input disabled={!active} type="range" min="0.5" max="2" step="0.05" value={active?.scale ?? 1} onChange={(e) => update({ scale: Number(e.target.value) })} className="mt-2 w-full accent-white"/></label><label className="block text-[11px] text-white/55">Rotation <span className="float-right text-white/80">{active?.rotation ?? 0}°</span><input disabled={!active} type="range" min="-180" max="180" value={active?.rotation ?? 0} onChange={(e) => update({ rotation: Number(e.target.value) })} className="mt-2 w-full accent-white"/></label><div className="grid grid-cols-2 gap-2"><button disabled={!active} onClick={() => update({ scale: 1, rotation: 0 })} className="rounded-xl bg-white/5 p-3 text-xs">Reset</button><button disabled={!active} onClick={() => update({ scale: 1.2 })} className="rounded-xl bg-white/5 p-3 text-xs">Auto zoom</button></div></div>;
}

function Inspector({ active, tab, setTab, update, speed, setSpeed }: { active?: Clip; tab: InspectorTab; setTab: (t: InspectorTab) => void; update: (patch: Partial<Clip>) => void; speed: number; setSpeed: (n: number) => void }) {
  const tabs: Array<[InspectorTab, string]> = [["video", "Video"], ["audio", "Audio"], ["speed", "Speed"], ["animate", "Animate"], ["adjust", "Adjust"]];
  return <aside className="overflow-y-auto border-l border-white/10 bg-[#15171a]"><div className="flex border-b border-white/10">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`flex-1 px-1 py-3 text-[10px] ${tab === id ? "border-b-2 border-cyan-300 text-cyan-300" : "text-white/45"}`}>{label}</button>)}</div><div className="p-4">{tab === "video" && <div className="space-y-5"><div className="grid grid-cols-4 rounded-lg bg-white/[.04] p-1 text-[9px]"><span className="rounded-md bg-white/10 py-2 text-center">Basic</span><span className="py-2 text-center text-white/35">Cutout</span><span className="py-2 text-center text-white/35">Mask</span><span className="py-2 text-center text-white/35">Enhance</span></div><InspectorSection title="Position & Size"><label className="block text-[11px] text-white/50">Scale<input disabled={!active} type="range" min="0.5" max="2" step="0.05" value={active?.scale ?? 1} onChange={(e) => update({ scale: Number(e.target.value) })} className="mt-2 w-full accent-white"/></label><div className="mt-3 grid grid-cols-2 gap-2"><input value={active?.x ?? 0} onChange={(e) => update({ x: Number(e.target.value) })} className="rounded-lg bg-white/5 p-2 text-xs"/><input value={active?.y ?? 0} onChange={(e) => update({ y: Number(e.target.value) })} className="rounded-lg bg-white/5 p-2 text-xs"/></div><label className="mt-3 block text-[11px] text-white/50">Rotate<input disabled={!active} type="range" min="-180" max="180" value={active?.rotation ?? 0} onChange={(e) => update({ rotation: Number(e.target.value) })} className="mt-2 w-full accent-white"/></label></InspectorSection><InspectorSection title="Blend"><label className="block text-[11px] text-white/50">Opacity<input type="range" min="0" max="100" defaultValue="100" className="mt-2 w-full accent-white"/></label></InspectorSection><InspectorSection title="Stabilize"/><InspectorSection title="Reduce noise"/><InspectorSection title="Relight"/></div>}{tab === "audio" && <div className="space-y-5"><PanelTitle icon={<Volume2 size={16}/>} title="Audio"/><label className="block text-[11px] text-white/50">Volume<input disabled={!active} type="range" min="0" max="100" value={Math.round((active?.volume ?? 1) * 100)} onChange={(e) => update({ volume: Number(e.target.value) / 100 })} className="mt-2 w-full accent-white"/></label><button className="w-full rounded-xl bg-white/5 p-3 text-xs">Fade in / out</button></div>}{tab === "speed" && <div className="space-y-5"><PanelTitle icon={<Gauge size={16}/>} title="Speed"/><div className="grid grid-cols-3 gap-2">{[0.5, 1, 2].map((n) => <button key={n} onClick={() => setSpeed(n)} className={`rounded-xl p-3 text-xs ${speed === n ? "bg-white text-black" : "bg-white/5"}`}>{n}x</button>)}</div><input type="range" min="0.25" max="3" step="0.25" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-white"/></div>}{tab === "animate" && <div className="space-y-3"><PanelTitle icon={<Zap size={16}/>} title="Animate"/>{["In", "Out", "Combo"].map((x) => <button key={x} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs">{x} animation <ChevronRight className="float-right" size={14}/></button>)}</div>}{tab === "adjust" && <div className="space-y-5"><PanelTitle icon={<SlidersHorizontal size={16}/>} title="Adjust"/>{["Brightness", "Contrast", "Saturation", "Temperature", "Sharpen"].map((x) => <label key={x} className="block text-[11px] text-white/50">{x}<input type="range" min="-100" max="100" defaultValue="0" className="mt-2 w-full accent-white"/></label>)}</div>}</div></aside>;
}

function InspectorSection({ title, children }: { title: string; children?: ReactNode }) { return <section className="border-t border-white/10 pt-4"><div className="mb-3 text-xs font-semibold">{title}</div>{children}</section>; }

function Timeline({ clips, visualClips, audioClips, selectedId, select, current, syncTime, zoom, setZoom, onSplit, onDelete, onDuplicate, onDragStart, onDrop }: { clips: Clip[]; visualClips: Clip[]; audioClips: Clip[]; selectedId: string | null; select: (id: string) => void; current: number; syncTime: (n: number) => void; zoom: number; setZoom: (n: number) => void; onSplit: () => void; onDelete: () => void; onDuplicate: () => void; onDragStart: (id: string) => void; onDrop: (e: DragEvent<HTMLDivElement>) => void }) {
  const total = Math.max(1, visualClips.reduce((n, c) => n + lengthOf(c), 0));
  return <section className="fixed bottom-0 left-0 right-0 z-20 h-[310px] border-t border-white/10 bg-[#121417] text-white"><div className="flex h-11 items-center gap-2 border-b border-white/10 px-4"><button onClick={onSplit} disabled={!selectedId} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-25" title="Split"><Scissors size={16}/></button><button onClick={onDuplicate} disabled={!selectedId} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-25" title="Duplicate"><Copy size={16}/></button><button onClick={onDelete} disabled={!selectedId} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-25" title="Delete"><Trash2 size={16}/></button><div className="ml-auto flex items-center gap-2"><Minus size={14}/><input aria-label="Timeline zoom" type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-32 accent-white"/><Plus size={14}/><span className="ml-3 text-[10px] text-white/35">{clips.length} clips</span></div></div><div className="flex h-[259px] overflow-auto"><div className="sticky left-0 z-10 w-28 shrink-0 border-r border-white/10 bg-[#121417] pt-8">{["Text", "Stickers", "Video", "Audio", "Voice"].map((x, i) => <div key={x} className="flex h-11 items-center gap-2 border-b border-white/5 px-3 text-[10px] text-white/55">{i === 0 ? <Type size={14}/> : i === 1 ? <Sticker size={14}/> : i === 2 ? <Film size={14}/> : i === 3 ? <Music2 size={14}/> : <Mic size={14}/>} {x}</div>)}</div><div className="relative min-w-max" style={{ width: `${Math.max(820, total * 75 * zoom + 120)}px` }}><div className="h-8 border-b border-white/5 px-2 text-[9px] text-white/25">{Array.from({ length: Math.ceil(total) + 1 }, (_, i) => <span key={i} className="mr-[62px]">00:{String(i).padStart(2, "0")}</span>)}</div><div className="absolute bottom-0 top-8 w-px bg-white" style={{ left: `${28 + (current / total) * (total * 75 * zoom)}px` }} /><TrackRow clips={visualClips.filter((c) => c.lane === "overlay")} selectedId={selectedId} select={select} onDragStart={onDragStart} onDrop={onDrop} lane="overlay"/><TrackRow clips={visualClips.filter((c) => c.lane === "video")} selectedId={selectedId} select={select} onDragStart={onDragStart} onDrop={onDrop} lane="video"/><TrackRow clips={audioClips.filter((c) => c.lane === "audio")} selectedId={selectedId} select={select} onDragStart={onDragStart} onDrop={onDrop} lane="audio" waveform/><TrackRow clips={audioClips.filter((c) => c.lane === "voice")} selectedId={selectedId} select={select} onDragStart={onDragStart} onDrop={onDrop} lane="voice" waveform/><input aria-label="Timeline position" type="range" min="0" max={total} step="0.01" value={Math.min(current, total)} onChange={(e) => syncTime(Number(e.target.value))} className="absolute bottom-0 left-0 right-0 z-20 h-1 w-full opacity-0"/></div></div></section>;
}

function TrackRow({ clips, selectedId, select, onDragStart, onDrop, lane, waveform }: { clips: Clip[]; selectedId: string | null; select: (id: string) => void; onDragStart: (id: string) => void; onDrop: (e: DragEvent<HTMLDivElement>) => void; lane: Lane; waveform?: boolean }) {
  return <div className="flex h-11 items-center border-b border-white/5 px-2">{clips.map((c) => <div key={c.id} data-clip={c.id} draggable onDragStart={() => onDragStart(c.id)} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => select(c.id)} className={`relative mr-1 flex h-9 cursor-pointer items-center overflow-hidden rounded-md border px-2 text-[9px] ${selectedId === c.id ? "border-cyan-300 ring-1 ring-cyan-300/30" : "border-white/10"} ${waveform ? "bg-blue-900/70" : lane === "overlay" ? "bg-violet-900/70" : "bg-cyan-900/70"}`} style={{ width: `${Math.max(74, lengthOf(c) * 75)}px` }}>{waveform ? <><div className="absolute inset-x-2 top-1/2 h-3 -translate-y-1/2 opacity-60" style={{ backgroundImage: "linear-gradient(90deg, transparent 0 4%, currentColor 4% 5%, transparent 5% 10%, currentColor 10% 11%, transparent 11% 17%, currentColor 17% 18%, transparent 18% 24%, currentColor 24% 26%, transparent 26% 33%, currentColor 33% 34%, transparent 34% 42%, currentColor 42% 44%, transparent 44% 52%, currentColor 52% 53%, transparent 53% 61%, currentColor 61% 64%, transparent 64% 72%, currentColor 72% 73%, transparent 73% 82%, currentColor 82% 84%, transparent 84% 92%, currentColor 92% 94%, transparent 94%)" }}/><span className="relative z-10">{c.name}</span></> : <><span className="truncate font-semibold">{c.name}</span><span className="ml-auto text-white/30">{lengthOf(c).toFixed(1)}s</span></>}</div>)}</div>;
}

function MobileTimeline({ clips, selectedId, select, current, syncTime, zoom, setZoom, onSplit, onDelete }: { clips: Clip[]; selectedId: string | null; select: (id: string) => void; current: number; syncTime: (n: number) => void; zoom: number; setZoom: (n: number) => void; onSplit: () => void; onDelete: () => void }) {
  const total = Math.max(1, clips.reduce((n, c) => n + lengthOf(c), 0));
  return <div className="border-t border-white/10 bg-[#111316] px-3 py-2"><div className="mb-2 flex items-center justify-between text-[10px] text-white/40"><span>00:{current.toFixed(2).padStart(5, "0")} / 00:{total.toFixed(2).padStart(5, "0")}</span><div className="flex items-center gap-1"><button onClick={onSplit} className="rounded p-1.5"><Scissors size={14}/></button><button onClick={onDelete} className="rounded p-1.5"><Trash2 size={14}/></button><input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-16 accent-white"/></div></div><div className="relative flex gap-1 overflow-x-auto pb-2">{clips.map((c) => <button key={c.id} onClick={() => select(c.id)} className={`relative h-16 shrink-0 overflow-hidden rounded-md border ${selectedId === c.id ? "border-cyan-300" : "border-white/10"}`} style={{ width: `${Math.max(76, lengthOf(c) * 45 * zoom)}px` }}><div className="grid h-full place-items-center bg-white/10"><Film size={18} className="text-white/30"/></div><span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-1 text-[8px]">{c.name}</span></button>)}{!clips.length && <div className="w-full rounded-lg border border-dashed border-white/10 p-5 text-center text-[10px] text-white/25">Your clips will appear here</div>}<div className="pointer-events-none absolute bottom-0 top-0 left-1/2 w-px bg-white/80"/></div><input aria-label="Mobile timeline position" type="range" min="0" max={total} step="0.01" value={Math.min(current, total)} onChange={(e) => syncTime(Number(e.target.value))} className="h-1 w-full accent-white"/></div>;
}

function MobileSheet({ onClose, tools: toolItems, tool, setTool, content }: { onClose: () => void; tools: Array<[Tool, string, ReactNode]>; tool: Tool; setTool: (t: Tool) => void; content: ReactNode }) {
  return <div className="fixed inset-0 z-50 lg:hidden"><button onClick={onClose} className="absolute inset-0 bg-black/70" aria-label="Close menu"/><div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#17191c] p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><b className="text-sm">Editor tools</b><button onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={16}/></button></div><div className="mb-4 grid grid-cols-5 gap-1">{toolItems.slice(0, 5).map(([id, label, icon]) => <button key={id} onClick={() => setTool(id)} className={`rounded-xl p-2 text-[9px] ${tool === id ? "bg-white text-black" : "bg-white/5 text-white/55"}`}>{icon}<span className="mt-1 block">{label}</span></button>)}</div>{content}</div></div>;
}
