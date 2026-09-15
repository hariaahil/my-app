import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Bell, BookOpen, Calculator, Film, Search, Trophy, WalletCards, CloudSun, Coins, Bitcoin, Newspaper } from "lucide-react";
import LocalPriceSnapshot from "@/components/local-price-snapshot";

export const metadata: Metadata = {
  title: "TargetBud Today — Live information, tools, news & markets",
  description: "Open TargetBud and understand what's happening right now: weather, markets, currency, gold, Bitcoin, sports and current news.",
  alternates: { canonical: "https://targetbud.vercel.app/" },
};

const FALLBACK = "Unavailable right now";
type Snapshot = { label: string; value: string; detail?: string; icon: typeof CloudSun; href: string; live?: boolean };

async function getJson(url: string) {
  try { const r = await fetch(url, { next: { revalidate: 300 } }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function getSnapshot(): Promise<Snapshot[]> {
  const [weather, fx, crypto] = await Promise.all([
    getJson("https://api.open-meteo.com/v1/forecast?latitude=17.3850&longitude=78.4867&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FKolkata"),
    getJson("https://api.frankfurter.app/latest?from=USD&to=INR"),
    getJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr&include_24hr_change=true"),
  ]);
  const temp = weather?.current?.temperature_2m;
  const feels = weather?.current?.apparent_temperature;
  const inr = fx?.rates?.INR;
  const btc = crypto?.bitcoin?.inr;
  const btcChange = crypto?.bitcoin?.inr_24h_change;
  return [
    { label: "Weather · Hyderabad", value: temp != null ? `${Math.round(temp)}°C` : FALLBACK, detail: feels != null ? `Feels ${Math.round(feels)}°C` : "Live local forecast", icon: CloudSun, href: "/search?q=Weather%20Hyderabad", live: temp != null },
    { label: "USD / INR", value: inr != null ? `₹${Number(inr).toFixed(2)}` : FALLBACK, detail: "Latest free FX reference", icon: Coins, href: "/search?q=USD%20INR", live: inr != null },
    { label: "Bitcoin", value: btc != null ? `₹${Number(btc).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : FALLBACK, detail: btcChange != null ? `${btcChange >= 0 ? "+" : ""}${btcChange.toFixed(2)}% · 24h` : "Live market reference", icon: Bitcoin, href: "/markets", live: btc != null },
    { label: "Nifty / Sensex", value: "Open markets", detail: "Live market workspace", icon: BarChart3, href: "/markets" },
  ];
}

async function getTrending() {
  const data = await getJson("https://news.google.com/rss/search?q=India%20when:1d&hl=en-IN&gl=IN&ceid=IN:en");
  if (!data) return ["India today", "Technology", "Markets", "Sports", "Weather", "Bitcoin"];
  return ["India today", "Technology", "Markets", "Sports", "Business", "World news"];
}

const tools = [
  ["Finance", "Goals, wallet and money insights.", WalletCards, "/goal"],
  ["Markets", "Stocks, indices, charts and watchlists.", BarChart3, "/markets"],
  ["News", "Original current India & world reporting.", Newspaper, "/news"],
  ["Sports", "Scores, fixtures and standings.", Trophy, "/sports"],
  ["Calculators", "Loans, money and everyday decisions.", Calculator, "/calculators"],
  ["Video Studio", "Create and edit browser-based video.", Film, "/video-studio"],
  ["Journal", "Original explainers and useful articles.", BookOpen, "/blog"],
] as const;

export default async function Home() {
  const [snapshot, trending] = await Promise.all([getSnapshot(), getTrending()]);
  return <main className="min-h-[calc(100vh-56px)] bg-white text-black">
    <section className="border-b border-black/10"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="mx-auto max-w-4xl text-center">
      <p className="text-[11px] font-black uppercase tracking-[.24em] text-black/45">TargetBud Today</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl">Understand what’s happening right now.</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/55">Search anything useful. See live information. Read what matters. Track what you care about.</p>
      <form action="/search" className="mx-auto mt-7 flex max-w-3xl items-center rounded-2xl border-2 border-black bg-white p-2 shadow-sm"><Search className="ml-2 shrink-0" size={21} /><input name="q" aria-label="Search TargetBud" placeholder="What do you want to know today?  Gold price · Nifty · Weather Hyderabad · Bitcoin" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none sm:text-base" /><button className="rounded-xl bg-black px-4 py-3 text-sm font-black text-white">Search</button></form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">{["Gold price", "Nifty", "Weather Hyderabad", "Bitcoin", "iPhone 18"].map(q => <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-black/60 hover:border-black/25 hover:text-black">{q}</Link>)}</div>
    </div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Live snapshot</p><h2 className="mt-1 text-2xl font-black tracking-tight">Right now</h2></div><span className="text-xs font-bold text-black/40">Auto-refresh · 5 min</span></div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
        {snapshot.map(({ label, value, detail, icon: Icon, href, live }) => <Link key={label} href={href} className="group bg-white p-5 transition hover:bg-black/[.025]"><div className="flex items-center gap-2"><Icon size={17} /><span className="text-xs font-bold text-black/50">{label}</span>{live && <span className="ml-auto size-1.5 rounded-full bg-black" aria-label="Live data" />}</div><p className="mt-5 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-black/45">{detail}</p></Link>)}
        <LocalPriceSnapshot />
      </div>
    </section>

    <section className="border-y border-black/10 bg-black/[.018]"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Trending today</p><h2 className="mt-1 text-2xl font-black">What people are looking for</h2></div><span className="text-xs text-black/40">Current themes</span></div><div className="mt-4 flex flex-wrap gap-2">{trending.map(topic => <Link key={topic} href={`/search?q=${encodeURIComponent(topic)}`} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold hover:border-black/25">{topic} <ArrowUpRight className="ml-1 inline" size={14} /></Link>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Today’s important stories</p><h2 className="mt-1 text-2xl font-black">The Daily</h2><p className="mt-1 text-sm text-black/50">Original TargetBud editorial, with source attribution for verification.</p></div><Link href="/news" className="text-sm font-black">Open newspaper →</Link></div><div className="mt-5 rounded-2xl border border-black/10 p-5 sm:p-7"><div className="grid gap-5 md:grid-cols-3"><div><p className="text-xs font-black uppercase tracking-wider text-black/40">News</p><h3 className="mt-2 text-xl font-black">Fresh India & world coverage</h3><p className="mt-2 text-sm leading-6 text-black/50">Read the full zoomable-style digital newspaper edition.</p></div><div><p className="text-xs font-black uppercase tracking-wider text-black/40">Markets</p><h3 className="mt-2 text-xl font-black">Follow the market pulse</h3><p className="mt-2 text-sm leading-6 text-black/50">Open market tools for indices, stocks and watchlists.</p></div><div><p className="text-xs font-black uppercase tracking-wider text-black/40">Sports</p><h3 className="mt-2 text-xl font-black">What’s next in sport</h3><p className="mt-2 text-sm leading-6 text-black/50">Scores, fixtures and standings in one place.</p></div></div></div></section>

    <section className="border-y border-black/10"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><Bell size={18}/><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Track & alert</p><h2 className="mt-1 text-xl font-black">Build your personal command center</h2></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">Track stocks, teams, prices, topics and events as you use TargetBud. Sign in to keep your watchlist across devices.</p><Link href="/markets" className="mt-4 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white">Start tracking →</Link></div></section>

    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-4"><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Explore</p><h2 className="mt-1 text-2xl font-black">Everything else, one system</h2></div><div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">{tools.map(([name, description, Icon, href]) => <Link key={name} href={href} className="group bg-white p-5 hover:bg-black/[.025]"><Icon size={18}/><h3 className="mt-6 font-black">{name}</h3><p className="mt-2 text-sm leading-6 text-black/50">{description}</p></Link>)}</div></section>
  </main>;
}
