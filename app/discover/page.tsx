import Link from "next/link";
import { ArrowRight, Compass, MessageCircle, Search, Users } from "lucide-react";

const areas = [
  ["Topics", "Follow interests and build a personal information graph.", "/discover#topics"],
  ["People", "Connect through shared interests rather than empty follower counts.", "/discover#people"],
  ["Communities", "Find focused spaces around real shared interests.", "/communities"],
  ["Discussions", "Conversations attached to articles, markets, sports and topics.", "/discover#discussions"],
];

const topics = ["Technology", "AI", "Programming", "Indian Markets", "Cricket", "Startups", "Gaming", "Travel", "Movies", "Photography"];

export default function DiscoverPage() {
  return <main className="min-h-[calc(100vh-56px)] bg-white text-black"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-black/45">Discovery</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Find what matters to you.</h1><p className="mt-4 text-base leading-7 text-black/55">TargetBud's discovery layer connects useful information with people, topics and communities. It starts useful before the social graph exists and becomes more personal as you use it.</p></header>
    <div className="mt-8 flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3"><Search size={18} className="text-black/40"/><span className="text-sm text-black/45">Search people, topics, communities and content…</span></div>
    <section className="mt-10 grid gap-3 sm:grid-cols-2">{areas.map(([title, description, href]) => <Link key={title} href={href} className="group rounded-2xl border border-black/10 p-5 hover:border-black/25"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-black text-white">{title === "People" ? <Users size={17}/> : title === "Communities" ? <Users size={17}/> : title === "Discussions" ? <MessageCircle size={17}/> : <Compass size={17}/>}</div><h2 className="font-bold">{title}</h2><ArrowRight size={15} className="ml-auto text-black/25 group-hover:text-black"/></div><p className="mt-4 text-sm leading-6 text-black/55">{description}</p></Link>)}</section>
    <section id="topics" className="mt-12 border-t border-black/10 pt-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-black/45">Starting points</p><h2 className="mt-1 text-2xl font-semibold">Topics</h2><p className="mt-2 text-sm text-black/50">These are discovery categories, not fake activity. Real posts and communities appear as people create them.</p><div className="mt-5 flex flex-wrap gap-2">{topics.map((topic) => <Link key={topic} href={`/discover?topic=${encodeURIComponent(topic)}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold hover:bg-black/[.04]">{topic}</Link>)}</div></section>
    <section id="people" className="mt-12 border-t border-black/10 pt-8"><h2 className="text-2xl font-semibold">People</h2><div className="mt-4 rounded-2xl border border-dashed border-black/15 p-8 text-center"><p className="text-sm font-bold">Your people graph starts here.</p><p className="mt-1 text-sm text-black/50">As real users join and choose interests, TargetBud can recommend relevant people without manufacturing accounts or engagement.</p></div></section>
    <section id="discussions" className="mt-12 border-t border-black/10 pt-8"><h2 className="text-2xl font-semibold">Discussions</h2><div className="mt-4 rounded-2xl border border-dashed border-black/15 p-8 text-center"><p className="text-sm font-bold">No discussions yet.</p><p className="mt-1 text-sm text-black/50">TargetBud will attach conversations to real content and topics as users participate.</p></div></section>
  </div></main>;
}
