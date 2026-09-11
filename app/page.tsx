import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpen, Code2, Compass, Gamepad2, MessageCircle, Newspaper, Search, Trophy, Users, WalletCards } from "lucide-react";
import AuthButton from "@/components/auth-button";

const workspaces = [
  { name: "Finance", description: "Goals, wallet, investments, income, expenses and insights.", icon: WalletCards, href: "/goal" },
  { name: "Markets", description: "Stocks, indices, charts, watchlists and market intelligence.", icon: BarChart3, href: "/markets" },
  { name: "News", description: "India, world, business, technology, finance and more.", icon: Newspaper, href: "/news" },
  { name: "Sports", description: "Scores, fixtures, standings and conversations around the games.", icon: Trophy, href: "/sports" },
  { name: "Developer Tools", description: "A focused workspace for JSON, encoding, JWT, UUID, web and API utilities.", icon: Code2, href: "/tools" },
  { name: "Journal", description: "Original TargetBud editorial content across technology, markets and sports.", icon: BookOpen, href: "/blog" },
];

const social = [
  { name: "Discover", description: "Explore topics, people and communities as the network grows.", icon: Compass, href: "/discover" },
  { name: "Communities", description: "Find and build focused spaces around shared interests.", icon: Users, href: "/communities" },
  { name: "Messages", description: "Private conversations and shared TargetBud content.", icon: MessageCircle, href: "/messages" },
];

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-white text-black">
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
            <div>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-black/45">Your internet workspace</p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-.045em] sm:text-6xl lg:text-7xl">Do more. Stay informed. Find your people.</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">TargetBud brings useful tools, live information, personal workspaces and interest-based connections into one calm, consistent platform.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/discover" className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-black/85">Explore TargetBud <ArrowUpRight size={16} /></Link>
                <Link href="/tools" className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-5 py-3 text-sm font-bold hover:bg-black/[.04]"><Search size={16} /> Find a tool</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/[.025] p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-black/45">Built around you</p>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-black" /><span><b>Useful without an account.</b><br /><span className="text-black/55">Explore public tools, information and content first.</span></span></div>
                <div className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-black" /><span><b>Personal when you sign in.</b><br /><span className="text-black/55">Goals, wallet, watchlists, saves and activity stay yours.</span></span></div>
                <div className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-black" /><span><b>Social by interest.</b><br /><span className="text-black/55">Follow topics, people and communities—not just accounts.</span></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-black/45">Workspaces</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Everything in one system</h2></div><Link href="/discover" className="hidden text-sm font-bold text-black/55 hover:text-black sm:block">Explore all →</Link></div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map(({ name, description, icon: Icon, href }) => <Link key={name} href={href} className="group bg-white p-5 transition hover:bg-black/[.025] sm:p-6"><div className="flex items-start justify-between"><div className="grid size-9 place-items-center rounded-lg bg-black text-white"><Icon size={17} /></div><ArrowUpRight size={16} className="text-black/25 transition group-hover:text-black" /></div><h3 className="mt-8 text-base font-bold">{name}</h3><p className="mt-2 text-sm leading-6 text-black/55">{description}</p></Link>)}
        </div>
      </section>

      <section className="border-y border-black/10 bg-black/[.018]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-black/45">Social layer</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Connect through what you care about</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">TargetBud is designed to work with zero users and become more valuable as real people, discussions and communities grow.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {social.map(({ name, description, icon: Icon, href }) => <Link key={name} href={href} className="group rounded-2xl border border-black/10 bg-white p-5 hover:border-black/25"><div className="flex items-center gap-3"><Icon size={18} /><h3 className="font-bold">{name}</h3><ArrowUpRight size={15} className="ml-auto text-black/25 group-hover:text-black" /></div><p className="mt-3 text-sm leading-6 text-black/55">{description}</p></Link>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="rounded-2xl bg-black p-6 text-white sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">Start anywhere</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Search, explore or get something done.</h2></div><Link href="/discover" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black">Open Discover <ArrowUpRight size={16} /></Link></div></div></section>
    </main>
  );
}
