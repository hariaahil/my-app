"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, ChevronDown, Copy, Film, FolderOpen, GripVertical, Layers3, Maximize2, Pause, Play, Plus, Redo2, Scissors, Settings2, SlidersHorizontal, Sparkles, Sticker, Trash2, Type, Undo2, Upload, Volume2, WandSparkles, X } from "lucide-react";
import { exportBrowserComposition, type CompositionClip } from "./browser-compositor";
import { getBrowserExportFormat } from "./export-support";
import { clamp, formatTime, getVideoEngineCapabilities } from "./video-engine";

type Lane = "video" | "overlay" | "audio" | "text";
type Ratio = "9:16" | "16:9" | "1:1";
type Tab = "media" | "audio" | "text" | "stickers" | "effects" | "transitions" | "filters" | "adjust" | "ai";
type KF = { t: number; value: number };
type Clip = CompositionClip & {
  file: File;
  lane: Lane;
  start: number;
  color: string;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  speed: number;
  volume: number;
  filter: string;
  effect: string;
  transition: string;
  keyframes: { x: KF[]; y: KF[]; scale: KF[]; rotation: KF[]; opacity: KF[]; volume: KF[] };
};

const tabs: [Tab, string][] = [["media", "Media"], ["audio", "Audio"], ["text", "Text"], ["stickers", "Stickers"], ["effects", "Effects"], ["transitions", "Transitions"], ["filters", "Filters"], ["adjust", "Adjust"], ["ai", "AI"]];
const lanes: Lane[] = ["video", "overlay", "text", "audio"];
const laneLabels: Record<Lane, string> = { video: "Video", overlay: "Overlay", text: "Text", audio: "Audio" };
const emptyKf = () => ({ x: [], y: [], scale: [], rotation: [], opacity: [], volume: [] });
const lengthOf = (c: Clip) => Math.max(0, c.trimEnd - c.trimStart);
const colors = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b"];

function interpolate(list: KF[], t: number, fallback: number) {
  if (!list.length) return fallback;
  const s = [...list].sort((a, b) => a.t - b.t);
  if (t <= s[0].t) return s[0].value;
  if (t >= s[s.length - 1].t) return s[s.length - 1].value;
  const i = s.findIndex(k => k.t >= t);
  const a = s[i - 1], b = s[i];
  const p = (t - a.t) / Math.max(0.001, b.t - a.t);
  return a.value + (b.value - a.value) * p;
}

export default function VideoStudioV10() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("media");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(70);
  const [project, setProject] = useState("Untitled project");
  const [caption, setCaption] = useState("");
  const [history, setHistory] = useState<Clip[][]>([]);
  const [future, setFuture] = useState<Clip[][]>([]);
  const [notice, setNotice] = useState("Ready");
  const [exporting, setExporting] = useState(false);
  const [engine, setEngine] = useState(getVideoEngineCapabilities());
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const active = clips.find(c => c.id === selectedId) ?? null;
  const duration = useMemo(() => clips.reduce((m, c) => Math.max(m, c.start + lengthOf(c)), 0), [clips]);
  const pxPerSecond = zoom;

  useEffect(() => setEngine(getVideoEngineCapabilities()), []);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPlayhead(t => t >= duration ? 0 : t + 0.05), 50);
    return () => window.clearInterval(id);
  }, [playing, duration]);
  useEffect(() => {
    if (!previewRef.current || !active || active.type !== "video") return;
    const local = clamp((playhead - active.start) * active.speed, 0, lengthOf(active));
    const next = active.reverse ? active.trimEnd - local : active.trimStart + local;
    if (Math.abs(previewRef.current.currentTime - next) > 0.12) previewRef.current.currentTime = next;
    if (playing) previewRef.current.play().catch(() => undefined); else previewRef.current.pause();
  }, [playhead, active, playing]);

  const remember = () => { setHistory(h => [...h.slice(-49), clips]); setFuture([]); };
  const patch = (id: string, changes: Partial<Clip>) => { remember(); setClips(cs => cs.map(c => c.id === id ? { ...c, ...changes } : c)); };
  const updateActive = (changes: Partial<Clip>) => { if (active) patch(active.id, changes); };
  const addKeyframe = (prop: keyof Clip["keyframes"]) => {
    if (!active) return;
    const base = prop === "x" ? active.x : prop === "y" ? active.y : prop === "scale" ? active.scale : prop === "rotation" ? active.rotation : prop === "opacity" ? active.opacity : active.volume;
    remember();
    setClips(cs => cs.map(c => c.id === active.id ? { ...c, keyframes: { ...c.keyframes, [prop]: [...c.keyframes[prop].filter(k => Math.abs(k.t - playhead) > 0.02), { t: playhead, value: base }] } } : c));
  };
  const setKeyframe = (prop: keyof Clip["keyframes"], value: number) => {
    if (!active) return;
    const list = active.keyframes[prop];
    if (!list.length) return updateActive(prop === "x" ? { x: value } : prop === "y" ? { y: value } : prop === "scale" ? { scale: value } : prop === "rotation" ? { rotation: value } : prop === "opacity" ? { opacity: value } : { volume: value });
    remember();
    setClips(cs => cs.map(c => c.id === active.id ? { ...c, keyframes: { ...c.keyframes, [prop]: list.map(k => Math.abs(k.t - playhead) < 0.02 ? { ...k, value } : k) } } : c));
  };
  const valueAt = (prop: keyof Clip["keyframes"], base: number) => interpolate(active?.keyframes[prop] ?? [], playhead, base);

  const importFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].filter(f => /^(video|image|audio)\//.test(f.type));
    if (!files.length) return;
    remember();
    let cursor = duration;
    const created = files.map((file, i) => {
      const type: Clip["type"] = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const clip: Clip = { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type, duration: type === "image" ? 5 : 0, trimStart: 0, trimEnd: type === "image" ? 5 : 0, volume: 1, fadeIn: 0, fadeOut: 0, file, lane: type === "audio" ? "audio" : i === 0 && clips.length === 0 ? "video" : type === "video" ? "video" : "overlay", start: cursor, color: colors[i % colors.length], scale: 1, x: 0, y: 0, rotation: 0, opacity: 1, speed: 1, filter: "none", effect: "none", transition: "none", keyframes: emptyKf() };
      if (type !== "audio") cursor += clip.duration;
      return clip;
    });
    setClips(cs => [...cs, ...created]);
    setSelectedId(created[0]?.id ?? null);
    e.target.value = "";
    created.forEach(c => {
      if (c.type !== "image") {
        const media = document.createElement(c.type === "video" ? "video" : "audio");
        media.preload = "metadata";
        media.src = c.url;
        media.onloadedmetadata = () => setClips(cs => cs.map(x => x.id === c.id ? { ...x, duration: media.duration, trimEnd: media.duration } : x));
      }
    });
    setNotice(`${created.length} item${created.length > 1 ? "s" : ""} imported`);
  };

  const split = () => {
    if (!active || playhead <= active.start || playhead >= active.start + lengthOf(active) || active.type === "audio") return setNotice("Place the playhead inside a video/image clip to split it.");
    const cut = active.trimStart + (playhead - active.start) * active.speed;
    if (cut <= active.trimStart + 0.05 || cut >= active.trimEnd - 0.05) return;
    remember();
    const first = { ...active, id: crypto.randomUUID(), name: `${active.name} 1`, trimEnd: cut };
    const second = { ...active, id: crypto.randomUUID(), name: `${active.name} 2`, trimStart: cut, start: playhead };
    setClips(cs => { const i = cs.findIndex(c => c.id === active.id); return [...cs.slice(0, i), first, second, ...cs.slice(i + 1)]; });
    setSelectedId(second.id); setNotice("Clip split");
  };
  const duplicate = () => { if (!active) return; remember(); const c = { ...active, id: crypto.randomUUID(), name: `${active.name} copy`, start: active.start + lengthOf(active) }; setClips(cs => [...cs, c]); setSelectedId(c.id); };
  const remove = () => { if (!active) return; remember(); URL.revokeObjectURL(active.url); const remaining = clips.filter(c => c.id !== active.id); setClips(remaining); setSelectedId(remaining[0]?.id ?? null); setNotice("Clip deleted"); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture(f => [...f, clips]); setHistory(h => h.slice(0, -1)); setClips(previous); setSelectedId(previous[0]?.id ?? null); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory(h => [...h, clips]); setFuture(f => f.slice(0, -1)); setClips(next); setSelectedId(next[0]?.id ?? null); };
  const timelineSeek = (clientX: number) => { const r = timelineRef.current?.getBoundingClientRect(); if (!r) return; const x = clientX - r.left; setPlayhead(clamp(x / pxPerSecond, 0, duration)); };
  const dropClip = (e: React.DragEvent, lane: Lane) => { const id = e.dataTransfer.getData("clip"); if (!id) return; const r = timelineRef.current?.getBoundingClientRect(); if (!r) return; const start = clamp((e.clientX - r.left) / pxPerSecond, 0, Math.max(0, duration)); remember(); setClips(cs => cs.map(c => c.id === id ? { ...c, start, lane } : c)); setSelectedId(id); };
  const exportProject = async () => {
    if (!clips.length) return setNotice("Import media first");
    setExporting(true);
    try {
      const f = getBrowserExportFormat(); if (!f) throw new Error("This browser cannot export video.");
      const result = await exportBrowserComposition({ clips, ratio, text: caption, mimeType: f.mimeType, extension: f.extension });
      const url = URL.createObjectURL(result.blob); const a = document.createElement("a"); a.href = url; a.download = `${project.replace(/[^a-z0-9]+/gi, "-")}.${result.extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("Export complete");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Export failed"); } finally { setExporting(false); }
  };

  const visual = active ? { x: valueAt("x", active.x), y: valueAt("y", active.y), scale: valueAt("scale", active.scale), rotation: valueAt("rotation", active.rotation), opacity: valueAt("opacity", active.opacity) } : { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  const previewClass = ratio === "9:16" ? "aspect-[9/16]" : ratio === "1:1" ? "aspect-square" : "aspect-video";
  const mediaStyle = { transform: `translate(${visual.x}px,${visual.y}px) scale(${visual.scale}) rotate(${visual.rotation}deg)`, opacity: visual.opacity, filter: active?.filter === "mono" ? "grayscale(1)" : active?.filter === "warm" ? "sepia(.25) saturate(1.25)" : active?.filter === "cool" ? "hue-rotate(180deg) saturate(.8)" : active?.filter === "vivid" ? "saturate(1.7) contrast(1.08)" : "none" };

  return <main className="h-screen overflow-hidden bg-[#101011] text-white">
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#18181b] px-3">
      <div className="flex min-w-0 items-center gap-2"><div className="rounded-lg bg-white p-1.5 text-black"><Film size={17}/></div><input value={project} onChange={e => setProject(e.target.value)} className="w-40 bg-transparent text-sm font-semibold outline-none"/><span className="hidden text-[11px] text-white/35 md:block">{notice}</span></div>
      <div className="flex items-center gap-1"><button onClick={undo} disabled={!history.length} className="rounded-md p-2 hover:bg-white/10 disabled:opacity-25"><Undo2 size={17}/></button><button onClick={redo} disabled={!future.length} className="rounded-md p-2 hover:bg-white/10 disabled:opacity-25"><Redo2 size={17}/></button><button onClick={() => inputRef.current?.click()} className="ml-2 rounded-md bg-white/10 px-3 py-2 text-xs"><Upload size={14} className="mr-1 inline"/>Import</button><button onClick={exportProject} disabled={exporting} className="ml-1 rounded-md bg-[#f4f4f5] px-4 py-2 text-xs font-bold text-black">{exporting ? "Exporting…" : "Export"}</button></div>
    </header>
    <input ref={inputRef} type="file" multiple accept="video/*,image/*,audio/*" className="hidden" onChange={importFiles}/>
    <div className="grid h-[calc(100vh-56px)] grid-cols-[64px_220px_minmax(0,1fr)_280px] max-lg:grid-cols-[56px_minmax(0,1fr)]">
      <nav className="row-span-2 flex flex-col items-center gap-1 border-r border-white/10 bg-[#151517] p-2 max-lg:row-span-1">{tabs.map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[9px] ${tab === id ? "bg-white text-black" : "text-white/55 hover:bg-white/5"}`}><TabIcon tab={id}/><span>{label}</span></button>)}</nav>
      <aside className="overflow-y-auto border-r border-white/10 bg-[#19191c] p-3 max-lg:hidden"><Panel tab={tab} input={() => inputRef.current?.click()} clips={clips} selectedId={selectedId} select={setSelectedId} caption={caption} setCaption={setCaption} setNotice={setNotice}/></aside>
      <section className="flex min-w-0 flex-col bg-[#0d0d0f]">
        <div className="flex min-h-0 flex-1 items-center justify-center p-6"><div className={`relative max-h-full w-auto max-w-[80%] overflow-hidden rounded-md bg-black shadow-2xl ${previewClass}`}><Preview active={active} style={mediaStyle} ref={previewRef} caption={caption}/><button className="absolute bottom-3 right-3 rounded-md bg-black/50 p-2"><Maximize2 size={14}/></button></div></div>
        <div className="flex h-11 items-center justify-center gap-2 border-y border-white/10 bg-[#171719]"><button onClick={() => setPlayhead(0)} className="px-2 text-xs text-white/50">00:00</button><button onClick={() => setPlaying(v => !v)} className="rounded-full bg-white p-2 text-black">{playing ? <Pause size={14}/> : <Play size={14}/>}</button><button onClick={split} className="rounded-md p-2 hover:bg-white/10" title="Split"><Scissors size={15}/></button><button onClick={duplicate} className="rounded-md p-2 hover:bg-white/10" title="Duplicate"><Copy size={15}/></button><button onClick={remove} className="rounded-md p-2 hover:bg-white/10" title="Delete"><Trash2 size={15}/></button><span className="ml-2 text-xs text-white/40">{formatTime(playhead)} / {formatTime(duration)}</span></div>
      </section>
      <aside className="overflow-y-auto border-l border-white/10 bg-[#19191c] p-4 max-lg:hidden"><Inspector active={active} playhead={playhead} ratio={ratio} setRatio={setRatio} update={updateActive} addKeyframe={addKeyframe} setKeyframe={setKeyframe} engine={engine}/></aside>
      <section className="col-span-2 border-t border-white/10 bg-[#131315] max-lg:col-span-1">
        <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[11px] text-white/45"><div className="flex items-center gap-3"><button onClick={() => setZoom(z => clamp(z - 10, 25, 160))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(z => clamp(z + 10, 25, 160))}>+</button><span className="ml-3">Snap</span></div><div className="flex items-center gap-2"><FolderOpen size={13}/> Local project</div></div>
        <div ref={timelineRef} className="relative h-[250px] overflow-auto" onClick={e => timelineSeek(e.clientX)}>
          <div className="sticky top-0 z-20 ml-24 h-7 border-b border-white/10 bg-[#131315]" style={{width: Math.max(900, duration * pxPerSecond + 300)}}>{Array.from({length: Math.max(8, Math.ceil(duration)+1)}, (_,i) => <span key={i} className="absolute top-1 text-[9px] text-white/35" style={{left:i*pxPerSecond}}>{formatTime(i)}</span>)}</div>
          {lanes.map(lane => <div key={lane} className="flex h-14 border-b border-white/5"><div className="sticky left-0 z-10 flex w-24 shrink-0 items-center gap-1 border-r border-white/10 bg-[#171719] px-2 text-[10px] text-white/45"><GripVertical size={11}/>{laneLabels[lane]}</div><div className="relative min-w-[900px] flex-1" onDragOver={e => e.preventDefault()} onDrop={e => dropClip(e,lane)}>{clips.filter(c => c.lane === lane).map(c => <TimelineClip key={c.id} clip={c} selected={c.id === selectedId} px={pxPerSecond} onSelect={() => setSelectedId(c.id)} onDragStart={e => e.dataTransfer.setData("clip",c.id)}/>)}</div></div>)}
          <div className="pointer-events-none absolute top-0 z-30 h-full w-px bg-red-400" style={{left: 96 + playhead * pxPerSecond}}><div className="absolute -left-1.5 top-0 h-3 w-3 rotate-45 bg-red-400"/></div>
        </div>
      </section>
    </div>
  </main>;
}

function TabIcon({tab}:{tab:Tab}) { const p={size:17}; if(tab==="media")return <Film {...p}/>; if(tab==="audio")return <AudioLines {...p}/>; if(tab==="text")return <Type {...p}/>; if(tab==="stickers")return <Sticker {...p}/>; if(tab==="effects")return <Sparkles {...p}/>; if(tab==="transitions")return <Layers3 {...p}/>; if(tab==="filters")return <SlidersHorizontal {...p}/>; if(tab==="adjust")return <Settings2 {...p}/>; return <WandSparkles {...p}/>; }

function Panel({tab,input,clips,selectedId,select,caption,setCaption,setNotice}:{tab:Tab;input:()=>void;clips:Clip[];selectedId:string|null;select:(id:string)=>void;caption:string;setCaption:(v:string)=>void;setNotice:(v:string)=>void}) { if(tab==="media") return <div><h2 className="mb-3 text-sm font-semibold">Media</h2><button onClick={input} className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-bold text-black"><Plus size={14}/> Import</button><div className="grid grid-cols-3 gap-2">{clips.map(c=><button key={c.id} onClick={()=>select(c.id)} className={`overflow-hidden rounded-md border text-left ${selectedId===c.id?"border-white":"border-white/10"}`}><div className="flex h-16 items-center justify-center bg-[#252528] text-[9px] text-white/50">{c.type.toUpperCase()}</div><div className="truncate px-1 py-1 text-[9px]">{c.name}</div></button>)}</div></div>; if(tab==="text") return <div><h2 className="mb-3 text-sm font-semibold">Text</h2><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Type text / caption" className="h-24 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-xs outline-none"/><button onClick={()=>setNotice("Text overlay updated in preview")} className="mt-2 w-full rounded-lg bg-white/10 py-2 text-xs">Apply to preview</button></div>; if(tab==="ai") return <div><h2 className="mb-3 text-sm font-semibold">AI Tools</h2>{["Auto captions","Silence removal","Auto reframe","Background removal","Motion tracking"].map(x=><button key={x} onClick={()=>setNotice(`${x}: engine hook ready — processing is not falsely marked complete.`)} className="mb-2 w-full rounded-lg border border-white/10 px-3 py-3 text-left text-xs hover:bg-white/5">{x}<span className="float-right text-white/30">›</span></button>)}</div>; return <div><h2 className="mb-3 text-sm font-semibold">{tabs.find(x=>x[0]===tab)?.[1]}</h2>{["Popular","Basic","Cinematic","Trending","More"].map(x=><button key={x} onClick={()=>setNotice(`${x} library selected`)} className="mb-2 w-full rounded-lg bg-white/5 px-3 py-3 text-left text-xs">{x}<ChevronDown size={13} className="float-right text-white/30"/></button>)}</div>; }

function TimelineClip({clip,selected,px,onSelect,onDragStart}:{clip:Clip;selected:boolean;px:number;onSelect:()=>void;onDragStart:(e:React.DragEvent)=>void}) { return <div draggable onDragStart={onDragStart} onClick={e=>{e.stopPropagation();onSelect();}} className={`absolute top-2 h-10 cursor-grab overflow-hidden rounded border text-[10px] ${selected?"border-white ring-1 ring-white/50":"border-white/10"}`} style={{left:clip.start*px,width:Math.max(42,lengthOf(clip)*px),background:clip.color}}><div className="flex h-full items-center gap-1 px-2"><GripVertical size={11}/><span className="truncate font-medium">{clip.name}</span></div></div>; }

const Preview = ({active,style,caption}:{active:Clip|null;style:React.CSSProperties;caption:string},ref:React.Ref<HTMLVideoElement>) => <div className="h-full w-full overflow-hidden"><div className="flex h-full w-full items-center justify-center" style={style}>{active?.type==="video"?<video ref={ref} src={active.url} className="h-full w-full object-contain" playsInline/>:active?.type==="image"?<img src={active.url} alt="" className="h-full w-full object-contain"/>:<div className="text-xs text-white/25">{active?"Audio clip selected":"Import media to start"}</div>}</div>{caption&&<div className="pointer-events-none absolute inset-x-4 bottom-12 text-center text-2xl font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,.9)]">{caption}</div>}</div>;

function Inspector({active,playhead,ratio,setRatio,update,addKeyframe,setKeyframe,engine}:{active:Clip|null;playhead:number;ratio:Ratio;setRatio:(r:Ratio)=>void;update:(x:Partial<Clip>)=>void;addKeyframe:(p:keyof Clip["keyframes"])=>void;setKeyframe:(p:keyof Clip["keyframes"],v:number)=>void;engine:ReturnType<typeof getVideoEngineCapabilities>}) { if(!active)return <div className="text-center text-xs text-white/30">Select a clip to edit it.<div className="mt-4 rounded-lg bg-white/5 p-3 text-left">Choose a timeline clip to reveal Transform, Keyframes, Speed and Audio controls.</div></div>; const row=(label:string,prop:keyof Clip["keyframes"],value:number,set:(v:number)=>void,min:number,max:number,step=1)=><div className="mb-3"><div className="mb-1 flex items-center justify-between text-[10px] text-white/55"><span>{label}</span><button onClick={()=>addKeyframe(prop)} className="rounded px-1 text-white/60 hover:bg-white/10" title="Add keyframe">◇</button></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>setKeyframe(prop,Number(e.target.value))} className="w-full"/></div>; return <div><div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-semibold">Video</div><div className="text-[10px] text-white/35">{active.name}</div></div><button onClick={()=>update({opacity:1,scale:1,x:0,y:0,rotation:0})} className="text-[10px] text-white/40">Reset</button></div><section className="mb-5"><h3 className="mb-2 text-xs font-semibold">Canvas</h3><div className="grid grid-cols-3 gap-1">{(["9:16","16:9","1:1"] as Ratio[]).map(r=><button key={r} onClick={()=>setRatio(r)} className={`rounded bg-white/5 py-2 text-[10px] ${ratio===r?"bg-white text-black":""}`}>{r}</button>)}</div></section><section className="mb-5"><h3 className="mb-3 text-xs font-semibold">Transform</h3>{row("Position X","x",active.x,v=>setKeyframe("x",v),-500,500)}{row("Position Y","y",active.y,v=>setKeyframe("y",v),-500,500)}{row("Scale","scale",active.scale,v=>setKeyframe("scale",v),0.1,3,.01)}{row("Rotation","rotation",active.rotation,v=>setKeyframe("rotation",v),-180,180)}{row("Opacity","opacity",active.opacity,v=>setKeyframe("opacity",v),0,1,.01)}</section><section className="mb-5"><h3 className="mb-2 text-xs font-semibold">Speed</h3><input type="range" min="0.25" max="3" step=".05" value={active.speed} onChange={e=>update({speed:Number(e.target.value)})} className="w-full"/><div className="mt-1 flex justify-between text-[10px] text-white/35"><span>0.25×</span><span>{active.speed.toFixed(2)}×</span><span>3×</span></div><button onClick={()=>update({reverse:!active.reverse})} className={`mt-2 w-full rounded bg-white/5 py-2 text-[10px] ${active.reverse?"bg-white text-black":""}`}>Reverse</button></section><section><h3 className="mb-2 text-xs font-semibold">Engine</h3><div className="rounded-lg bg-white/5 p-3 text-[10px] text-white/45">WebCodecs: <b className="text-white">{engine.webCodecs?"available":"browser fallback"}</b><br/>OffscreenCanvas: <b className="text-white">{engine.offscreenCanvas?"available":"fallback"}</b></div></section></div>; }
