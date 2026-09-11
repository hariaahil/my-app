"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";

const items = [
  { name: "Finance", href: "/goal", keywords: "finance financial goal wallet investments income expenses insights" },
  { name: "Markets", href: "/markets", keywords: "markets stocks nse bse indices gainers losers charts" },
  { name: "News", href: "/news", keywords: "news india world business technology ai finance" },
  { name: "Sports", href: "/sports", keywords: "sports cricket football tennis basketball scores fixtures" },
  { name: "Developer Tools", href: "/tools", keywords: "developer tools json base64 uuid jwt regex api html css javascript seo" },
  { name: "Journal", href: "/blog", keywords: "journal blog ai stocks sports articles" },
  { name: "Games", href: "/games", keywords: "games browser games" },
] as const;

export default function SiteNavigation() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.keywords}`.includes(q));
  }, [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <>
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-black tracking-tight" aria-label="TargetBud home">
          <span className="grid size-8 place-items-center rounded-lg bg-black text-sm text-white">T</span><span className="hidden sm:inline">TargetBud</span>
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
          {items.slice(0, 6).map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-xs font-bold text-black/60 transition hover:bg-black/[.04] hover:text-black">{item.name}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/60 hover:bg-black/[.04]" aria-label="Search TargetBud">
            <Search size={15}/><span className="hidden sm:inline">Search</span><kbd className="hidden rounded-md border border-black/10 px-1.5 py-0.5 font-mono text-[10px] text-black/40 lg:inline">⌘K</kbd>
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)} className="grid size-9 place-items-center rounded-xl border border-black/10 md:hidden" aria-label="Open navigation"><Menu size={18}/></button>
        </div>
      </div>
      {open && <div className="border-t border-black/10 bg-white md:hidden"><div className="grid grid-cols-2 gap-1 p-2">{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold hover:bg-black/[.04]">{item.name}</Link>)}</div></div>}
    </header>
    {open && <div className="fixed inset-0 z-[60] bg-black/20 p-3 pt-20 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="TargetBud search">
        <div className="flex items-center gap-3 border-b border-black/10 px-4"><Search size={18} className="text-black/45"/><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Finance, Markets, JSON, Sports…" className="min-w-0 flex-1 py-4 text-base outline-none" aria-label="Search TargetBud"/><button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-black/[.05]" aria-label="Close search"><X size={17}/></button></div>
        <div className="max-h-[60vh] overflow-y-auto p-2">{results.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-black/[.04]"><span><span className="block text-sm font-bold">{item.name}</span><span className="block text-xs text-black/45">{item.href}</span></span><span className="text-black/30">→</span></Link>)}{!results.length && <p className="p-5 text-center text-sm text-black/45">No matching TargetBud section yet.</p>}</div>
        <div className="border-t border-black/10 px-4 py-2 text-[11px] text-black/40">Press <b>Esc</b> to close · <b>/</b> or <b>⌘K</b> to search</div>
      </section>
    </div>}
  </>;
}
