"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TARGET = 7000000;
const KEY = "targetbud-70l-goal";

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function GoalPage() {
  const [current, setCurrent] = useState(0);
  const [monthly, setMonthly] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof saved.current === "number") setCurrent(saved.current);
      if (typeof saved.monthly === "number") setMonthly(saved.monthly);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ current, monthly }));
  }, [current, monthly]);

  const remaining = Math.max(TARGET - current, 0);
  const progress = Math.min((current / TARGET) * 100, 100);
  const months = monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const targetDate = useMemo(() => {
    if (!months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [months]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-violet-300">← TargetBud</Link>

        <section className="mt-6 rounded-[2rem] border border-violet-400/20 bg-white/[.045] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold tracking-[.2em] text-violet-300">MY TARGET</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">₹70 lakh goal</h1>
          <p className="mt-2 text-slate-400">One simple number to track. No bank connection needed.</p>

          <div className="mt-8 rounded-2xl bg-black/20 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Progress</p>
                <p className="mt-1 text-3xl font-bold">{money(current)}</p>
              </div>
              <p className="text-2xl font-bold text-violet-300">{progress.toFixed(1)}%</p>
            </div>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>₹0</span><span>{money(TARGET)}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <span className="text-sm text-slate-400">Current amount</span>
              <div className="mt-2 flex items-center gap-2">
                <span>₹</span>
                <input type="number" min="0" value={current || ""} onChange={e => setCurrent(Math.max(0, Number(e.target.value) || 0))} placeholder="0" className="w-full bg-transparent text-xl font-semibold outline-none" />
              </div>
            </label>
            <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <span className="text-sm text-slate-400">Monthly addition</span>
              <div className="mt-2 flex items-center gap-2">
                <span>₹</span>
                <input type="number" min="0" value={monthly || ""} onChange={e => setMonthly(Math.max(0, Number(e.target.value) || 0))} placeholder="0" className="w-full bg-transparent text-xl font-semibold outline-none" />
              </div>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-rose-400/10 p-4">
              <p className="text-sm text-slate-400">Remaining</p>
              <p className="mt-1 text-2xl font-bold">{money(remaining)}</p>
            </div>
            <div className="rounded-2xl bg-sky-400/10 p-4">
              <p className="text-sm text-slate-400">Estimated completion</p>
              <p className="mt-1 text-2xl font-bold">{targetDate || "Add monthly amount"}</p>
              {months && <p className="mt-1 text-xs text-slate-500">About {months} month{months === 1 ? "" : "s"}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
