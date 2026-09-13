"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type PlayerState = { id: string; name: string; x: number; y: number; z: number; ry: number; t: number; protected?: boolean };
type Babylon = any;

const CDN = "https://cdn.babylonjs.com/babylon.js";
const MAX_PLAYERS = 100;
const NEWCOMER_MS = 5 * 60 * 1000;
const randomName = () => `Runner-${Math.floor(1000 + Math.random() * 9000)}`;
const randomId = () => Math.random().toString(36).slice(2, 10);

export default function SkyfallArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Loading 3D world…");
  const [players, setPlayers] = useState(1);
  const [room, setRoom] = useState("");
  const [copied, setCopied] = useState(false);
  const [protectedUntil, setProtectedUntil] = useState<number | null>(null);
  const [protectionLeft, setProtectionLeft] = useState(0);
  const playerRef = useRef<PlayerState>({ id: randomId(), name: randomName(), x: 0, y: 2.1, z: 0, ry: 0, t: Date.now(), protected: true });
  const roomRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("room") || "SKY-" + Math.random().toString(36).slice(2, 6)).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
    const suppliedName = (params.get("name") || localStorage.getItem("skyfall-name") || randomName()).trim().slice(0, 18) || "Guest";
    roomRef.current = requested;
    playerRef.current.name = suppliedName;
    setRoom(requested);

    const storedProtection = Number(sessionStorage.getItem(`skyfall-newcomer:${requested}`) || 0);
    const until = storedProtection > Date.now() ? storedProtection : Date.now() + NEWCOMER_MS;
    sessionStorage.setItem(`skyfall-newcomer:${requested}`, String(until));
    setProtectedUntil(until);

    const timer = window.setInterval(() => {
      const left = Math.max(0, until - Date.now());
      setProtectionLeft(left);
      if (left === 0) playerRef.current.protected = false;
    }, 250);

    let disposed = false;
    let engine: any;
    let channel: any;
    const remote = new Map<string, any>();
    const keys = new Set<string>();
    let script: HTMLScriptElement | null = null;

    const start = async () => {
      try {
        if (!(window as any).BABYLON) {
          await new Promise<void>((resolve, reject) => {
            script = document.createElement("script"); script.src = CDN; script.async = true;
            script.onload = () => resolve(); script.onerror = () => reject(new Error("3D engine failed to load")); document.head.appendChild(script!);
          });
        }
        if (disposed) return;
        const B: Babylon = (window as any).BABYLON;
        const canvas = canvasRef.current; if (!canvas) return;
        engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, true);
        const scene = new B.Scene(engine);
        scene.clearColor = new B.Color4(0.025, 0.03, 0.045, 1);
        const camera = new B.UniversalCamera("camera", new B.Vector3(0, 5.8, -10), scene);
        camera.setTarget(new B.Vector3(0, 1.6, 0));
        camera.inputs.clear();
        const hemi = new B.HemisphericLight("sky", new B.Vector3(0, 1, 0), scene); hemi.intensity = 0.85;
        const key = new B.DirectionalLight("sun", new B.Vector3(-0.4, -1, 0.5), scene); key.intensity = 1.25;
        const glow = new B.GlowLayer("glow", scene); glow.intensity = 0.45;
        const mat = (name: string, hex: string, emissive = false) => { const m = new B.StandardMaterial(name, scene); m.diffuseColor = B.Color3.FromHexString(hex); if (emissive) m.emissiveColor = B.Color3.FromHexString(hex); return m; };
        const islandMat = mat("island", "#d8d8d8");
        const darkMat = mat("platform", "#15171b");
        const accentMat = mat("energy", "#ffffff", true);
        const playerMat = mat("player", "#ffffff", true);
        const otherMat = mat("other", "#8d8d8d", true);
        const protectedMat = mat("protected", "#bdbdbd", true);

        const ground = B.MeshBuilder.CreateCylinder("island", { diameter: 28, height: 1.8, tessellation: 48 }, scene); ground.position.y = 0; ground.material = islandMat;
        const lower = B.MeshBuilder.CreateCylinder("lower", { diameter: 21, height: 2.8, tessellation: 32 }, scene); lower.position.y = -1.9; lower.material = darkMat;
        for (let i = 0; i < 10; i++) { const angle = (Math.PI * 2 * i) / 10; const r = 9.5; const tower = B.MeshBuilder.CreateBox("tower", { width: 0.8, height: 3 + (i % 3), depth: 0.8 }, scene); tower.position.set(Math.cos(angle) * r, 1.6 + (i % 3) * 0.5, Math.sin(angle) * r); tower.material = i % 2 ? darkMat : accentMat; }
        for (let i = 0; i < 18; i++) { const angle = (Math.PI * 2 * i) / 18; const r = 5.2 + (i % 4) * 0.65; const crystal = B.MeshBuilder.CreatePolyhedron("crystal", { type: 1, size: 0.55 + (i % 3) * 0.15 }, scene); crystal.position.set(Math.cos(angle) * r, 1.1, Math.sin(angle) * r); crystal.material = accentMat; }
        const ring = B.MeshBuilder.CreateTorus("ring", { diameter: 9, thickness: 0.08, tessellation: 64 }, scene); ring.rotation.x = Math.PI / 2; ring.position.y = 0.95; ring.material = accentMat;
        const spawn = B.MeshBuilder.CreateCylinder("spawn", { diameter: 5.2, height: 0.16, tessellation: 48 }, scene); spawn.position.y = 0.96; spawn.material = protectedMat;
        const avatar = B.MeshBuilder.CreateCapsule("avatar", { height: 2.3, radius: 0.42, tessellation: 12 }, scene); avatar.position.set(playerRef.current.x, playerRef.current.y, playerRef.current.z); avatar.material = playerMat;
        const head = B.MeshBuilder.CreateSphere("head", { diameter: 0.62, segments: 16 }, scene); head.parent = avatar; head.position.y = 0.85; head.material = playerMat;

        const updateCamera = () => { const p = avatar.position; camera.position.x += (p.x - camera.position.x) * 0.08; camera.position.z += (p.z - 10 - camera.position.z) * 0.08; camera.position.y += (p.y + 4.2 - camera.position.y) * 0.08; camera.setTarget(new B.Vector3(p.x, p.y + 0.4, p.z)); };
        const onKeyDown = (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault(); };
        const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
        window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);

        let supabase: any = null;
        try { supabase = createClient(); } catch { supabase = null; }
        if (supabase) {
          channel = supabase.channel(`skyfall-arena:${roomRef.current}`, { config: { presence: { key: playerRef.current.id } } });
          channel.on("presence", { event: "sync" }, () => { const state = channel.presenceState(); setPlayers(Math.min(MAX_PLAYERS, Math.max(1, Object.keys(state).length))); });
          channel.on("broadcast", { event: "move" }, ({ payload }: any) => {
            if (!payload || payload.id === playerRef.current.id) return;
            let mesh = remote.get(payload.id);
            if (!mesh) { mesh = B.MeshBuilder.CreateCapsule(`remote-${payload.id}`, { height: 2.3, radius: 0.42, tessellation: 12 }, scene); remote.set(payload.id, mesh); }
            mesh.material = payload.protected ? protectedMat : otherMat;
            mesh.metadata = payload; mesh.position.set(payload.x, payload.y, payload.z); mesh.rotation.y = payload.ry || 0;
          });
          channel.subscribe(async (state: string) => { if (state === "SUBSCRIBED") { await channel.track(playerRef.current); setStatus("Live world · late joiners welcome"); } });
        } else setStatus("Solo preview · multiplayer needs Supabase configuration");

        let lastBroadcast = 0;
        engine.runRenderLoop(() => {
          const dt = Math.min(engine.getDeltaTime() / 1000, 0.05); const speed = 5.2;
          let dx = 0, dz = 0; if (keys.has("w") || keys.has("arrowup")) dz += 1; if (keys.has("s") || keys.has("arrowdown")) dz -= 1; if (keys.has("a") || keys.has("arrowleft")) dx -= 1; if (keys.has("d") || keys.has("arrowright")) dx += 1;
          const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
          avatar.position.x = Math.max(-12.2, Math.min(12.2, avatar.position.x + dx * speed * dt)); avatar.position.z = Math.max(-12.2, Math.min(12.2, avatar.position.z + dz * speed * dt));
          if (dx || dz) { avatar.rotation.y = Math.atan2(dx, dz); playerRef.current.ry = avatar.rotation.y; }
          playerRef.current.x = avatar.position.x; playerRef.current.y = avatar.position.y; playerRef.current.z = avatar.position.z; playerRef.current.t = Date.now(); playerRef.current.protected = Date.now() < until;
          if (channel && Date.now() - lastBroadcast > 100) { lastBroadcast = Date.now(); channel.send({ type: "broadcast", event: "move", payload: playerRef.current }); }
          remote.forEach(mesh => { const p = mesh.metadata as PlayerState; if (p) mesh.position.y += Math.sin(Date.now() / 500 + p.x) * 0.0005; });
          ring.rotation.z += dt * 0.2; updateCamera(); scene.render();
        });
        window.addEventListener("resize", () => engine?.resize());
      } catch (e) { console.error(e); setStatus("3D world could not load. Refresh to retry."); }
    };
    start();
    return () => { disposed = true; window.removeEventListener("keydown", () => {}); window.removeEventListener("keyup", () => {}); window.clearInterval(timer); channel?.unsubscribe(); engine?.dispose(); script?.remove(); };
  }, []);

  const share = async () => { const url = `${window.location.origin}/games/skyfall-arena?room=${encodeURIComponent(room)}`; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const touch = (key: string, down: boolean) => { const event = new KeyboardEvent(down ? "keydown" : "keyup", { key, bubbles: true }); window.dispatchEvent(event); };
  const minutes = Math.floor(protectionLeft / 60000); const seconds = Math.ceil((protectionLeft % 60000) / 1000);
  const protectedNow = !!protectedUntil && protectionLeft > 0;

  return <main id="main-content" className="min-h-[calc(100vh-56px)] bg-[#07090d] text-white">
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><Link href="/games" className="text-xs text-white/50 hover:text-white">← Games</Link><h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Skyfall Arena</h1></div>
        <div className="flex items-center gap-2 text-xs"><span className="rounded-full border border-white/15 px-3 py-1.5 text-white/70">● {players} / {MAX_PLAYERS}</span><button onClick={share} className="rounded-full bg-white px-3 py-1.5 font-bold text-black hover:bg-white/90">{copied ? "Copied" : "Invite players"}</button></div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
        <canvas ref={canvasRef} aria-label="Skyfall Arena 3D game world" className="block h-[62vh] min-h-[430px] w-full touch-none" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/70 backdrop-blur">ROOM <b className="text-white">{room}</b> · {status}</div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[11px] backdrop-blur"><b>{playerRef.current.name}</b>{protectedNow ? <span className="ml-2 text-white/60">Protected · {minutes}:{String(seconds).padStart(2, "0")}</span> : <span className="ml-2 text-white/40">Survivor</span>}</div>
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[11px] text-white/60 backdrop-blur">WASD / arrows to move · arrival zone is protected · late joiners can enter anytime</div>
        <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1.5 sm:hidden">
          <span /><button onTouchStart={() => touch("w", true)} onTouchEnd={() => touch("w", false)} className="grid size-12 place-items-center rounded-xl border border-white/20 bg-black/60 font-black">▲</button><span />
          <button onTouchStart={() => touch("a", true)} onTouchEnd={() => touch("a", false)} className="grid size-12 place-items-center rounded-xl border border-white/20 bg-black/60 font-black">◀</button><button onTouchStart={() => touch("s", true)} onTouchEnd={() => touch("s", false)} className="grid size-12 place-items-center rounded-xl border border-white/20 bg-black/60 font-black">▼</button><button onTouchStart={() => touch("d", true)} onTouchEnd={() => touch("d", false)} className="grid size-12 place-items-center rounded-xl border border-white/20 bg-black/60 font-black">▶</button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Status</p><p className="mt-1 text-sm font-bold">{protectedNow ? "Newcomer · protected" : "Survivor · normal risk"}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-white/40">World</p><p className="mt-1 text-sm font-bold">Live · {players} online</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Next build</p><p className="mt-1 text-sm font-bold">Collect → protect → steal</p></div>
      </div>
    </div>
  </main>;
}
