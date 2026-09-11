import Link from "next/link";
import { ArrowRight, BarChart3, Code2, Gamepad2, Newspaper, ShieldCheck, Target, Trophy } from "lucide-react";

const modules = [
  ["Markets", "NSE/BSE, indices, gainers, losers and charts", BarChart3, "/markets"],
  ["News", "India, world, business, technology and finance", Newspaper, "/news"],
  ["Sports", "Cricket, football, tennis and basketball", Trophy, "/sports"],
  ["Developer Tools", "JSON, Base64, UUID, Regex, JWT and API utilities", Code2, "/tools"],
  ["Games", "Fast browser games with clean ad placements", Gamepad2, "/games"],
  ["My Finance", "Private planning, expenses, loans and investments", ShieldCheck, "/finance"],
  ["₹70 Lakh Goal", "Simple progress tracker for your long-term target", Target, "/goal"],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-violet-500 font-black">T</span>
            <span>TargetBud</span>
          </Link>
          <nav className="hidden gap-7 text-sm text-slate-300 md:flex">
            <Link href="/markets">Markets</Link><Link href="/news">News</Link><Link href="/sports">Sports</Link><Link href="/tools">Tools</Link>
          </nav>
          <Link href="/finance" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10">My Finance</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-[.18em] text-violet-200">ONE PLATFORM · MANY TARGETS</div>
          <h1 className="text-5xl font-semibold tracking-[-.04em] sm:text-7xl">Everything you need.<br /><span className="text-violet-300">One TargetBud.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">A public platform for markets, news, sports and powerful tools — with your private finance workspace behind one account.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/markets" className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 font-semibold hover:bg-violet-400">Explore TargetBud <ArrowRight size={17} /></Link>
            <Link href="/goal" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10">Track ₹70 Lakh Goal</Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(([name, description, Icon, href]) => (
            <Link key={name} href={href} className="group rounded-2xl border border-white/10 bg-white/[.045] p-6 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[.07]">
              <div className="mb-10 grid size-11 place-items-center rounded-xl bg-white/10 text-violet-200"><Icon size={21} /></div>
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p>
              <div className="mt-5 text-sm font-medium text-violet-300">Open module →</div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-slate-500">© 2026 TargetBud · Built for the long term.</footer>
    </main>
  );
}
