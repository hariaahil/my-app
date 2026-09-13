"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

const MAX_PLAYERS = 100;
const makeRoom = () => `SKY-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const makeId = () => Math.random().toString(36).slice(2, 10);

export default function SkyfallLobbyPage() {
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState(0);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = useMemo(makeId, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoom((params.get("room") || makeRoom()).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12));
    setName(localStorage.getItem("skyfall-name") || "");
  }, []);

  useEffect(() => {
    if (!room) return;
    let channel: any;
    let cancelled = false;
    try {
      const supabase = createClient();
      channel = supabase.channel(`skyfall-lobby:${room}`, { config: { presence: { key: id } } });
      channel.on("presence", { event: "sync" }, () => {
        if (cancelled) return;
        const state = channel.presenceState();
        setPlayers(Math.min(MAX_PLAYERS, Object.keys(state).length));
      });
      channel.subscribe(async (state: string) => {
        if (state === "SUBSCRIBED") await channel.track({ id, name: name || "Guest" });
      });
    } catch { setPlayers(0); }
    return () => { cancelled = true; channel?.unsubscribe(); };
  }, [room, id, name]);

  const join = () => {
    const clean = name.trim().slice(0, 18) || "Guest";
    localStorage.setItem("skyfall-name", clean);
    setJoining(true);
    window.location.href = `/games/skyfall-arena?room=${encodeURIComponent(room)}&name=${encodeURIComponent(clean)}`;
  };

  const share = async () => {
    const url = `${window.location.origin}/games/skyfall-arena/lobby?room=${encodeURIComponent(room)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#07090d] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.03] shadow-2xl lg:grid-cols-[1.35fr_.85fr]">
          <div className="relative min-h-[440px] overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.16),transparent_42%),linear-gradient(145deg,#111722,#05070a)] p-7 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 opacity-30" aria-hidden="true"><div className="absolute left-[12%] top-[20%] size-24 rotate-12 rounded-3xl border border-white/30" /><div className="absolute right-[14%] top-[34%] size-36 -rotate-12 rounded-full border border-white/20" /><div className="absolute bottom-[12%] left-[35%] h-28 w-52 -skew-x-12 rounded-[3rem] border border-white/20" /></div>
            <div className="relative flex h-full flex-col justify-between">
              <div><Link href="/games" className="text-xs font-bold text-white/50 hover:text-white">← Games</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-white/45">TargetBud Multiplayer</p><h1 className="mt-2 max-w-xl text-4xl font-black tracking-tight sm:text-6xl">Skyfall Arena</h1><p className="mt-4 max-w-lg text-base leading-7 text-white/60">A social 3D arena built around a shared lobby. Gather your squad, enter the island together, and compete in the same match.</p></div>
              <div className="mt-10 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full border border-white/15 px-3 py-2">Up to 100 players</span><span className="rounded-full border border-white/15 px-3 py-2">Cross-device</span><span className="rounded-full border border-white/15 px-3 py-2">Room-based</span></div>
            </div>
          </div>
          <div className="p-7 sm:p-10">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Lobby</p><p className="mt-1 text-2xl font-black">{players} / {MAX_PLAYERS}</p><p className="text-xs text-white/45">players in room</p></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60">{players >= MAX_PLAYERS ? "Full" : "Open"}</span></div>
            <label htmlFor="skyfall-name" className="mt-8 block text-sm font-bold">Your display name</label>
            <input id="skyfall-name" value={name} onChange={e => setName(e.target.value)} maxLength={18} placeholder="Enter a name" className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-white" />
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Room code</p><p className="mt-1 text-2xl font-black tracking-[.16em]">{room || "—"}</p><p className="mt-1 text-xs text-white/40">Share this lobby link with friends.</p></div>
            <button onClick={join} disabled={joining || !room || players >= MAX_PLAYERS} className="mt-5 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40">{joining ? "Joining…" : players >= MAX_PLAYERS ? "Lobby full" : "Join game"}</button>
            <button onClick={share} className="mt-2 w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold hover:bg-white/[.05]">{copied ? "Lobby link copied" : "Invite players"}</button>
            <p className="mt-6 text-center text-[11px] leading-5 text-white/35">Everyone enters through the lobby. The match world loads after joining. Player capacity is designed for 100; real capacity depends on the realtime infrastructure and final server-authoritative architecture.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
