"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { AudioLines, ChevronLeft, Copy, Film, Layers3, Mic, Pause, Play, Plus, Redo2, Scissors, Settings2, SlidersHorizontal, Sparkles, Sticker, Trash2, Type, Undo2, Upload, Volume2, WandSparkles, X } from "lucide-react";
import { getBrowserExportFormat } from "./export-support";
import { exportBrowserComposition, type CompositionClip } from "./browser-compositor";

type Ratio = "9:16" | "16:9" | "1:1";
type Tool = "media" | "audio" | "text" | "stickers" | "effects" | "transitions" | "filters" | "adjust" | "ai";
type Lane = "video" | "overlay" | "audio" | "voice";
type Filter = "none" | "mono" | "warm" | "cool" | "vivid" | "fade";
type KF = { t: number; value: number };
type Keyframes = { x: KF[]; y: KF[]; scale: KF[]; rotation: KF[]; opacity: KF[]; volume: KF[] };
type Adjust = { brightness: number; contrast: number; saturation: number; temperature: number; blur: number };
type Clip = CompositionClip & { file: File; lane: Lane; start: number; filter: Filter; scale: number; rotation: number; x: number; y: number; opacity: number; speed: number; effect: string; transition: string; reverse: boolean; keyframes: Keyframes; adjust: Adjust; mask: boolean; maskShape: "rectangle" | "circle"; chromaKey: boolean };

const ratios: Ratio[] = ["9:16", "16:9", "1:1"];
const lanes: Lane[] = ["video", "overlay", "audio", "voice"];
const filters: Filter[] = ["none", "mono", "warm", "cool", "vivid", "fade"];
const tools: Array<[Tool, string, ReactNode]> = [
  ["media", "Media", <Film size={18} key="media" />], ["audio", "Audio", <AudioLines size={18} key="audio" />],
  ["text", "Text", <Type size={18} key="text" />], ["stickers", "Stickers", <Sticker size={18} key="stickers" />],
  ["effects", "Effects", <Sparkles size={18} key="effects" />], ["transitions", "Transitions", <Layers3 size={18} key="transitions" />],
  ["filters", "Filters", <SlidersHorizontal size={18} key="filters" />], ["adjust", "Adjust", <Settings2 size={18} key="adjust" />],
  ["ai", "AI Tools", <WandSparkles size={18} key="ai" />],
];
const emptyKF = (): Keyframes => ({ x: [], y: [], scale: [], rotation: [], opacity: [], volume: [] });
const lengthOf = (c?: Clip) => c ? Math.max(0, c.trimEnd - c.trimStart) : 0;
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const interpolate = (list: KF[], t: number, fallback: number) => { if (!list.length) return fallback; const s = [...list].sort((a, b) => a.t - b.t); if (t <= s[0].t) return s[0].value; if (t >= s[s.length - 1].t) return s[s.length - 1].value; const i = s.findIndex(k => k.t >= t); const a = s[i - 1], b = s[i], p = (t - a.t) / Math.max(.001, b.t - a.t); return a.value + (b.value - a.value) * p; };
const newAdjust = (): Adjust => ({ brightness: 0, contrast: 0, saturation: 0, temperature: 0, blur: 0 });

export default function VideoStudioV9() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("media");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionStyle, setCaptionStyle] = useState("bold");
  const [history, setHistory] = useState<Clip[][]>([]);
  const [future, setFuture] = useState<Clip[][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [project, setProject] = useState("Untitled project");
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = clips.find(c => c.id === selectedId) ?? clips[0];
  const visual = useMemo(() => clips.filter(c => c.lane === "video" || c.lane === "overlay"), [clips]);
  const total = useMemo(() => visual.reduce((n, c) => Math.max(n, c.start + lengthOf(c)), 0), [visual]);

  const remember = () => { setHistory(h => [...h.slice(-39), clips]); setFuture([]); };
  const update = (patch: Partial<Clip>) => { if (!active) return; remember(); setClips(cs => cs.map(c => c.id === active.id ? { ...c, ...patch } : c)); };
  const addKeyframe = (prop: keyof Keyframes) => {
    if (!active) return;
    const value = prop === "x" ? active.x : prop === "y" ? active.y : prop === "scale" ? active.scale : prop === "rotation" ? active.rotation : prop === "opacity" ? active.opacity : active.volume;
    remember();
    setClips(cs => cs.map(c => c.id === active.id ? { ...c, keyframes: { ...c.keyframes, [prop]: [...c.keyframes[prop].filter(k => Math.abs(k.t - time) > .02), { t: time, value }] } } : c));
  };
  const setKeyframeValue = (prop: keyof Keyframes, value: number) => {
    if (!active) return;
    if (!active.keyframes[prop].length) { update(prop === "x" ? { x: value } : prop === "y" ? { y: value } : prop === "scale" ? { scale: value } : prop === "rotation" ? { rotation: value } : prop === "opacity" ? { opacity: value } : { volume: value }); return; }
    remember();
    setClips(cs => cs.map(c => c.id === active.id ? { ...c, keyframes: { ...c.keyframes, [prop]: c.keyframes[prop].map(k => Math.abs(k.t - time) < .02 ? { ...k, value } : k) } } : c));
  };
  const evaluated = (prop: keyof Keyframes, fallback: number) => interpolate(active?.keyframes[prop] ?? [], time, fallback);

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => /^(video|image|audio)\//.test(f.type));
    if (!files.length) return;
    remember();
    let cursor = visual.reduce((n, c) => Math.max(n, c.start + lengthOf(c)), 0);
    const next: Clip[] = files.map(file => {
      const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const duration = type === "image" ? 5 : 0;
      const clip: Clip = { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type, lane: type === "video" ? "video" : type === "image" ? "overlay" : "audio", duration, trimStart: 0, trimEnd: duration, volume: 1, fadeIn: 0, fadeOut: 0, file, start: cursor, filter: "none", scale: 1, rotation: 0, x: 0, y: 0, opacity: 1, speed: 1, effect: "none", transition: "none", reverse: false, keyframes: emptyKF(), adjust: newAdjust(), mask: false, maskShape: "rectangle", chromaKey: false };
      if (type !== "audio") cursor += duration;
      return clip;
    });
    setClips(cs => [...cs, ...next]); setSelectedId(next[0]?.id ?? null); e.target.value = ""; setMessage(`${next.length} media item${next.length > 1 ? "s" : ""} imported.`);
  };

  const split = () => {
    if (!active || active.type !== "video" || lengthOf(active) < .4) return;
    const cut = active.trimStart + clamp(time, .1, lengthOf(active) - .1); remember();
    const a = { ...active, id: crypto.randomUUID(), name: `${active.name} A`, trimEnd: cut };
    const b = { ...active, id: crypto.randomUUID(), name: `${active.name} B`, trimStart: cut, start: active.start + time };
    setClips(cs => { const i = cs.findIndex(c => c.id === active.id); return [...cs.slice(0, i), a, b, ...cs.slice(i + 1)]; }); setSelectedId(a.id); setTime(0);
  };
  const duplicate = () => { if (!active) return; remember(); const copy = { ...active, id: crypto.randomUUID(), name: `${active.name} copy`, start: active.start + lengthOf(active) }; setClips(cs => [...cs, copy]); setSelectedId(copy.id); };
  const remove = () => { if (!active) return; remember(); URL.revokeObjectURL(active.url); const next = clips.filter(c => c.id !== active.id); setClips(next); setSelectedId(next[0]?.id ?? null); setTime(0); };
  const undo = () => { const p = history.at(-1); if (!p) return; setFuture(f => [...f, clips]); setHistory(h => h.slice(0, -1)); setClips(p); setSelectedId(p[0]?.id ?? null); };
  const redo = () => { const n = future.at(-1); if (!n) return; setHistory(h => [...h, clips]); setFuture(f => f.slice(0, -1)); setClips(n); setSelectedId(n[0]?.id ?? null); };
  const play = () => { if (!active || active.type !== "video" || !videoRef.current) { setMessage("Select a video clip first."); return; } if (playing) { videoRef.current.pause(); setPlaying(false); } else { videoRef.current.currentTime = active.trimStart + time; videoRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); } };
  const exportProject = async () => { if (!clips.length) return; setExporting(true); try { const f = getBrowserExportFormat(); if (!f) throw new Error("Browser encoding unavailable."); const r = await exportBrowserComposition({ clips, ratio, text: caption, mimeType: f.mimeType, extension: f.extension }); const url = URL.createObjectURL(r.blob); const a = document.createElement("a"); a.href = url; a.download = `${project.replace(/[^a-z0-9-_]+/gi, "-")}.${r.extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("Export complete."); } catch (e) { setMessage(e instanceof Error ? e.message : "Export failed."); } finally { setExporting(false); } };

  const panel = tool === "media" ? <MediaPanel clips={clips} selectedId={selectedId} select={setSelectedId} importMedia={() => inputRef.current?.click()} />
    : tool === "text" ? <TextPanel caption={caption} setCaption={setCaption} style={captionStyle} setStyle={setCaptionStyle} />
    : tool === "audio" ? <AudioPanel importMedia={() => inputRef.current?.click()} setMessage={setMessage} />
    : tool === "stickers" ? <StickerPanel />
    : tool === "effects" ? <EffectsPanel active={active} update={update} />
    : tool === "transitions" ? <TransitionsPanel active={active} update={update} />
    : tool === "filters" ? <FiltersPanel active={active} update={update} />
    : tool === "adjust" ? <AdjustPanel active={active} update={(k, v) => active && update({ adjust: { ...active.adjust, [k]: v } })} />
    : <AIPanel setMessage={setMessage} />;

  const transform = { x: evaluated("x", active?.x ?? 0), y: evaluated("y", active?.y ?? 0), scale: evaluated("scale", active?.scale ?? 1), rotation: evaluated("rotation", active?.rotation ?? 0), opacity: evaluated("opacity", active?.opacity ?? 1) };
  const cssFilter = active ? `brightness(${1 + active.adjust.brightness / 100}) contrast(${1 + active.adjust.contrast / 100}) saturate(${1 + active.adjust.saturation / 100}) blur(${active.adjust.blur}px)` : "none";
  const previewStyle = { transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`, opacity: transform.opacity, filter: cssFilter };

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#151518] px-3 sm:px-5">
        <div className="flex items-center gap-2"><button className="rounded-lg p-2"><ChevronLeft size={18} /></button><input value={project} onChange={e => setProject(e.target.value)} className="w-40 bg-transparent text-sm font-semibold outline-none sm:w-56" /><span className="hidden rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/40 sm:block">All changes saved</span></div>
        <div className="flex gap-1"><button onClick={undo} disabled={!history.length} className="rounded-lg p-2 disabled:opacity-25"><Undo2 size={17} /></button><button onClick={redo} disabled={!future.length} className="rounded-lg p-2 disabled:opacity-25"><Redo2 size={17} /></button><button onClick={() => inputRef.current?.click()} className="hidden rounded-lg bg-white/10 px-3 py-2 text-xs sm:flex"><Upload size={14} className="mr-1" />Import</button><button onClick={exportProject} disabled={!clips.length || exporting} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black">{exporting ? "Exporting…" : "Export"}</button></div>
      </header>
      <input ref={inputRef} type="file" multiple accept="video/*,image/*,audio/*" className="hidden" onChange={addFiles} />
      <div className="grid min-h-[calc(100vh-56px)] lg:grid-cols-[72px_240px_minmax(0,1fr)_290px]">
        <nav className="order-2 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#111114] p-2 lg:order-1 lg:flex-col lg:border-b-0 lg:border-r">{tools.map(([id, label, icon]) => <button key={id} onClick={() => setTool(id)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-semibold ${tool === id ? "bg-white text-black" : "text-white/50 hover:bg-white/5"}`}>{icon}<span>{label}</span></button>)}</nav>
        <aside className="order-1 border-b border-white/10 bg-[#17171a] p-3 lg:order-2 lg:border-b-0 lg:border-r">{panel}</aside>
        <section className="order-3 flex min-w-0 flex-col bg-[#09090b]">
          <div className="flex min-h-[420px] flex-1 items-center justify-center p-4 sm:p-8">
            <div className={`relative max-h-[62vh] w-full max-w-[760px] overflow-hidden rounded-xl bg-black ${ratio === "9:16" ? "aspect-[9/16]" : ratio === "16:9" ? "aspect-video" : "aspect-square"}`}>
              <div className="absolute inset-0 grid place-items-center">
                {active?.type === "video" && <video ref={videoRef} src={active.url} playsInline className="h-full w-full object-contain" style={previewStyle} onTimeUpdate={() => { if (videoRef.current && active) setTime(Math.max(0, videoRef.current.currentTime - active.trimStart)); }} />}
                {active?.type === "image" && <img src={active.url} className="max-h-full max-w-full object-contain" style={previewStyle} alt="" />}
                {active?.type === "audio" && <div className="text-center text-white/30"><Volume2 className="mx-auto mb-2" />Audio selected</div>}
                {caption && <div className={`absolute bottom-[12%] left-3 right-3 text-center text-2xl ${captionStyle === "bold" ? "font-black" : "font-medium"} ${captionStyle === "boxed" ? "rounded-lg bg-black/70 p-2" : ""}`}>{caption}</div>}
              </div>
              {active?.mask && <div className={`pointer-events-none absolute inset-0 ${active.maskShape === "circle" ? "rounded-full" : ""}`} style={{ boxShadow: "0 0 0 999px rgba(0,0,0,.35)" }} />}
            </div>
          </div>
          <div className="border-t border-white/10 bg-[#111114] p-2">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-1"><button onClick={play} className="rounded-lg bg-white p-2 text-black">{playing ? <Pause size={16} /> : <Play size={16} />}</button><button onClick={split} className="rounded-lg p-2"><Scissors size={16} /></button><button onClick={duplicate} className="rounded-lg p-2"><Copy size={16} /></button><button onClick={remove} className="rounded-lg p-2"><Trash2 size={16} /></button><div className="ml-2 flex rounded-lg bg-white/5 p-1">{ratios.map(r => <button key={r} onClick={() => setRatio(r)} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${ratio === r ? "bg-white text-black" : "text-white/40"}`}>{r}</button>)}</div><label className="ml-2 text-[10px] text-white/40">Zoom <input type="range" min=".5" max="2" step=".1" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label></div>
            <div className="overflow-x-auto"><div className="relative min-w-[900px]" style={{ width: Math.max(900, total * 90 * zoom + 180) }}>{lanes.map(lane => <div key={lane} className="relative mb-1 h-12 rounded bg-white/[.025]"><span className="absolute left-1 top-1 text-[8px] text-white/25">{lane}</span>{clips.filter(c => c.lane === lane).map(c => <button key={c.id} onClick={() => { setSelectedId(c.id); setTime(0); }} className={`absolute top-4 h-7 overflow-hidden rounded-md border px-2 text-left text-[9px] ${selectedId === c.id ? "border-white bg-white/20" : "border-white/10 bg-white/10"}`} style={{ left: c.start * 90 * zoom, width: Math.max(48, lengthOf(c) * 90 * zoom) }}>{c.name}</button>)}</div>)}{active && <div className="pointer-events-none absolute top-0 h-full w-px bg-white" style={{ left: (active.start + time) * 90 * zoom }} />}</div></div>
          </div>
        </section>
        <aside className="hidden border-l border-white/10 bg-[#17171a] p-3 lg:block"><Inspector active={active} time={time} addKeyframe={addKeyframe} setKeyframeValue={setKeyframeValue} evaluated={evaluated} update={update} /></aside>
      </div>
      {message && <button onClick={() => setMessage(null)} className="fixed bottom-4 right-4 z-50 rounded-xl border border-white/10 bg-[#202024] px-4 py-3 text-xs shadow-2xl">{message}<X size={12} className="ml-2 inline" /></button>}
    </main>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) { return <div className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}{title}</div>; }
function MediaPanel({ clips, selectedId, select, importMedia }: { clips: Clip[]; selectedId: string | null; select: (id: string) => void; importMedia: () => void }) { return <div><PanelTitle icon={<Film size={16} />} title="Media" /><div className="mb-3 grid grid-cols-3 rounded-xl bg-white/5 p-1 text-[10px]"><b className="rounded-lg bg-white p-2 text-center text-black">Local</b><span className="p-2 text-center text-white/30">Stock</span><span className="p-2 text-center text-white/30">Brand</span></div><button onClick={importMedia} className="mb-3 w-full rounded-xl border border-dashed border-white/15 p-5 text-xs font-bold"><Plus size={15} className="mr-1 inline" />Import media</button>{clips.map(c => <button key={c.id} onClick={() => select(c.id)} className={`mb-2 w-full rounded-xl border p-2 text-left ${selectedId === c.id ? "border-white/60 bg-white/10" : "border-white/10"}`}><span className="truncate text-[11px]">{c.name}</span><span className="mt-1 block text-[9px] text-white/35">{lengthOf(c).toFixed(1)}s · {c.lane}</span></button>)}</div>; }
function TextPanel({ caption, setCaption, style, setStyle }: { caption: string; setCaption: (s: string) => void; style: string; setStyle: (s: string) => void }) { return <div><PanelTitle icon={<Type size={16} />} title="Text & Captions" /><textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Type captions or title" className="h-28 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none" /><div className="mt-2 grid grid-cols-3 gap-2">{["bold", "boxed", "clean"].map(s => <button key={s} onClick={() => setStyle(s)} className={`rounded-xl p-2 text-[10px] ${style === s ? "bg-white text-black" : "bg-white/5"}`}>{s}</button>)}</div></div>; }
function AudioPanel({ importMedia, setMessage }: { importMedia: () => void; setMessage: (s: string) => void }) { const record = async () => { if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setMessage("Voice recording is unavailable in this browser."); return; } try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks: Blob[] = []; const rec = new MediaRecorder(stream); rec.ondataavailable = e => e.data.size && chunks.push(e.data); rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); setMessage(`Voice recording captured (${Math.round(chunks.reduce((n, b) => n + b.size, 0) / 1024)} KB).`); }; rec.start(); setMessage("Recording for 5 seconds…"); setTimeout(() => rec.stop(), 5000); } catch { setMessage("Microphone permission denied."); } }; return <div><PanelTitle icon={<AudioLines size={16} />} title="Audio" /><button onClick={importMedia} className="mb-2 w-full rounded-xl border border-dashed border-white/15 p-4 text-xs"><Upload size={15} className="mr-1 inline" />Import audio</button><button onClick={record} className="w-full rounded-xl bg-white p-3 text-xs font-bold text-black"><Mic size={15} className="mr-1 inline" />Record voiceover</button></div>; }
function StickerPanel() { return <div><PanelTitle icon={<Sticker size={16} />} title="Stickers" /><div className="grid grid-cols-4 gap-2">{["🔥","❤️","⭐","😂","⚡","🎮","💯","✨","🎯","🚀","😎","👀"].map(x => <button key={x} className="aspect-square rounded-xl bg-white/5 text-xl">{x}</button>)}</div></div>; }
function EffectsPanel({ active, update }: { active?: Clip; update: (p: Partial<Clip>) => void }) { return <div><PanelTitle icon={<Sparkles size={16} />} title="Effects" /><div className="grid grid-cols-2 gap-2">{["none","blur","glow","shake","vhs","glitch"].map(x => <button key={x} disabled={!active} onClick={() => update({ effect: x })} className={`rounded-xl p-3 text-[10px] ${active?.effect === x ? "bg-white text-black" : "bg-white/5"}`}>{x}</button>)}</div></div>; }
function TransitionsPanel({ active, update }: { active?: Clip; update: (p: Partial<Clip>) => void }) { return <div><PanelTitle icon={<Layers3 size={16} />} title="Transitions" />{["none","fade","slide","zoom","wipe"].map(x => <button key={x} disabled={!active} onClick={() => update({ transition: x })} className={`mb-2 w-full rounded-xl p-3 text-left text-xs ${active?.transition === x ? "bg-white text-black" : "bg-white/5"}`}>{x}</button>)}</div>; }
function FiltersPanel({ active, update }: { active?: Clip; update: (p: Partial<Clip>) => void }) { return <div><PanelTitle icon={<SlidersHorizontal size={16} />} title="Filters" />{filters.map(x => <button key={x} disabled={!active} onClick={() => update({ filter: x })} className={`mb-2 w-full rounded-xl p-3 text-left text-xs ${active?.filter === x ? "bg-white text-black" : "bg-white/5"}`}>{x}</button>)}</div>; }
function AdjustPanel({ active, update }: { active?: Clip; update: (k: keyof Adjust, v: number) => void }) { const items: Array<keyof Adjust> = ["brightness","contrast","saturation","temperature","blur"]; return <div><PanelTitle icon={<Settings2 size={16} />} title="Adjust" />{items.map(k => <label key={k} className="mb-3 block text-[10px] text-white/50">{k}<input disabled={!active} type="range" min={k === "blur" ? 0 : -100} max={k === "blur" ? 20 : 100} value={active?.adjust[k] ?? 0} onChange={e => update(k, Number(e.target.value))} className="mt-2 w-full" /></label>)}</div>; }
function AIPanel({ setMessage }: { setMessage: (s: string) => void }) { return <div><PanelTitle icon={<WandSparkles size={16} />} title="AI Tools" />{["Auto Captions","Auto Cut","Auto Reframe","Background Removal","Motion Tracking","Silence Removal","Beat Sync"].map(x => <button key={x} onClick={() => setMessage(`${x}: control is ready; connect the selected AI runtime for processing.`)} className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs font-semibold">{x}<span className="mt-1 block text-[9px] text-white/30">Configure</span></button>)}</div>; }
function Inspector({ active, time, addKeyframe, setKeyframeValue, evaluated, update }: { active?: Clip; time: number; addKeyframe: (p: keyof Keyframes) => void; setKeyframeValue: (p: keyof Keyframes, v: number) => void; evaluated: (p: keyof Keyframes, d: number) => number; update: (p: Partial<Clip>) => void }) { if (!active) return <div className="grid h-full place-items-center text-xs text-white/30">Select a clip</div>; const Prop = ({ p, label, min, max, step, base }: { p: keyof Keyframes; label: string; min: number; max: number; step?: number; base: number }) => <label className="mb-3 block text-[10px] text-white/55">{label}<div className="flex gap-2"><input type="range" min={min} max={max} step={step ?? 1} value={evaluated(p, base)} onChange={e => setKeyframeValue(p, Number(e.target.value))} className="flex-1" /><button onClick={() => addKeyframe(p)} className="grid size-6 place-items-center rounded bg-white/10" title="Add keyframe"><span className="block size-2 rotate-45 border border-white" /></button></div></label>; return <div><PanelTitle icon={<Settings2 size={16} />} title="Inspector" /><Prop p="x" label="Position X" min={-500} max={500} base={active.x} /><Prop p="y" label="Position Y" min={-500} max={500} base={active.y} /><Prop p="scale" label="Scale" min={.2} max={3} step={.05} base={active.scale} /><Prop p="rotation" label="Rotation" min={-180} max={180} base={active.rotation} /><Prop p="opacity" label="Opacity" min={0} max={1} step={.01} base={active.opacity} /><button onClick={() => update({ mask: !active.mask })} className="mb-2 w-full rounded-xl bg-white/10 p-3 text-xs">{active.mask ? "Mask enabled" : "Enable mask"}</button><select value={active.maskShape} onChange={e => update({ maskShape: e.target.value as Clip["maskShape"] })} className="mb-2 w-full rounded-xl bg-white/10 p-3 text-xs"><option value="rectangle">Rectangle mask</option><option value="circle">Circle mask</option></select><button onClick={() => update({ chromaKey: !active.chromaKey })} className="mb-2 w-full rounded-xl bg-white/10 p-3 text-xs">{active.chromaKey ? "Chroma key enabled" : "Enable chroma key"}</button><label className="block text-[10px] text-white/50">Speed<input type="range" min=".25" max="4" step=".05" value={active.speed} onChange={e => update({ speed: Number(e.target.value) })} className="mt-2 w-full" /></label><button onClick={() => update({ reverse: !active.reverse })} className="mt-2 w-full rounded-xl bg-white/10 p-3 text-xs">{active.reverse ? "Reverse enabled" : "Reverse clip"}</button><p className="mt-3 text-[9px] text-white/30">Playhead {time.toFixed(2)}s · keyframe diamonds are editable.</p></div>; }
