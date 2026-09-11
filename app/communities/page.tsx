import Link from "next/link";
import { ArrowRight, Lock, Plus, Users } from "lucide-react";

export default function CommunitiesPage() {
  return <main className="min-h-[calc(100vh-56px)] bg-white text-black"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-black/45">Social</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">Communities</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Focused spaces for shared interests. Communities are created from real demand rather than a directory filled with artificial activity.</p></div><button className="inline-flex w-fit items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Create community</button></header>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {["Technology", "AI", "Programming", "Indian Markets", "Cricket", "Startups"].map((topic) => <div key={topic} className="rounded-2xl border border-black/10 p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-black text-white"><Users size={17}/></div><div><h2 className="text-sm font-bold">{topic}</h2><p className="text-xs text-black/45">Topic space</p></div></div><div className="mt-5 border-t border-black/10 pt-4 text-xs text-black/45">Community appears when real members create and join it.</div><Link href={`/discover?topic=${encodeURIComponent(topic)}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold">Explore topic <ArrowRight size={13}/></Link></div>)}
    </section>
    <section className="mt-10 rounded-2xl border border-dashed border-black/15 p-7"><div className="flex gap-3"><Lock size={17} className="mt-0.5"/><div><h2 className="text-sm font-bold">Privacy and moderation are foundational</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-black/50">Public and private communities will have explicit membership, moderation, reporting, blocking and ownership rules before user-generated activity is enabled.</p></div></div></section>
  </div></main>;
}
