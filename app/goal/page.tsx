"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Investment = {
  id: string;
  name: string;
  investment_type: string;
  principal_amount: number;
  expected_rate: number;
  rate_type: "Fixed" | "Expected" | "None";
  invested_on: string;
  maturity_on: string | null;
  compounding: "Monthly" | "Quarterly" | "Yearly" | "At maturity" | "None";
  monthly_addition: number;
  current_value: number | null;
};

const TARGET = 7000000;
const TYPES = ["Cash / Uninvested", "FD", "RD", "SIP", "Mutual Fund", "PPF", "Stock", "Other"];
const COMPOUNDING = ["Monthly", "Quarterly", "Yearly", "At maturity", "None"] as const;

function money(value: number) { return `₹${Math.round(value).toLocaleString("en-IN")}`; }
function monthsBetween(from: Date, to: Date) { return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + (to.getDate() >= from.getDate() ? 0 : -1)); }
function projectedValue(inv: Investment, at: Date) {
  if (inv.investment_type === "Cash / Uninvested" || inv.compounding === "None" || inv.expected_rate <= 0) return inv.current_value ?? inv.principal_amount;
  const start = new Date(`${inv.invested_on}T00:00:00`);
  const months = monthsBetween(start, at);
  const monthlyRate = inv.expected_rate / 100 / 12;
  const principalGrowth = inv.principal_amount * Math.pow(1 + monthlyRate, months);
  const additions = inv.monthly_addition > 0 ? inv.monthly_addition * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) : 0;
  return principalGrowth + additions;
}

export default function GoalPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", investment_type: "Cash / Uninvested", principal_amount: "", expected_rate: "", rate_type: "None", invested_on: new Date().toISOString().slice(0, 10), maturity_on: "", compounding: "None", monthly_addition: "", current_value: "" });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase.from("goal_investments").select("*").order("invested_on", { ascending: true });
        if (mounted) setInvestments((data ?? []) as Investment[]);
      }
      setLoading(false);
    }
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session?.user) { setUserId(session.user.id); setUserEmail(session.user.email ?? null); load(); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  const today = new Date();
  const currentTotal = investments.reduce((sum, inv) => sum + projectedValue(inv, today), 0);
  const progress = Math.min((currentTotal / TARGET) * 100, 100);
  const remaining = Math.max(TARGET - currentTotal, 0);
  const monthlyTotal = investments.reduce((sum, inv) => sum + Number(inv.monthly_addition || 0), 0);
  const completion = useMemo(() => {
    if (remaining <= 0) return "Goal reached";
    if (monthlyTotal <= 0) return "Add monthly contributions";
    let value = currentTotal;
    let months = 0;
    while (value < TARGET && months < 1200) { value += monthlyTotal; months++; }
    const d = new Date(); d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [currentTotal, monthlyTotal, remaining]);

  async function addInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form.name.trim() || Number(form.principal_amount) < 0) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      investment_type: form.investment_type,
      principal_amount: Number(form.principal_amount) || 0,
      expected_rate: Number(form.expected_rate) || 0,
      rate_type: form.investment_type === "Cash / Uninvested" ? "None" : form.rate_type,
      invested_on: form.invested_on,
      maturity_on: form.maturity_on || null,
      compounding: form.investment_type === "Cash / Uninvested" ? "None" : form.compounding,
      monthly_addition: Number(form.monthly_addition) || 0,
      current_value: form.current_value ? Number(form.current_value) : null,
    };
    const { data, error } = await supabase.from("goal_investments").insert(payload).select().single();
    setSaving(false);
    if (!error && data) {
      setInvestments(prev => [...prev, data as Investment]);
      setForm({ ...form, name: "", principal_amount: "", expected_rate: "", monthly_addition: "", current_value: "", maturity_on: "" });
    }
  }

  async function removeInvestment(id: string) {
    await supabase.from("goal_investments").delete().eq("id", id);
    setInvestments(prev => prev.filter(item => item.id !== id));
  }

  if (loading) return <main className="min-h-screen p-8 text-slate-400">Loading your goal…</main>;
  if (!userId) return <main className="min-h-screen px-4 py-12"><div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[.045] p-8 text-center"><p className="text-xs font-bold tracking-[.2em] text-violet-300">MY TARGET</p><h1 className="mt-3 text-3xl font-semibold">₹70 lakh goal</h1><p className="mt-3 text-slate-400">Login to save your cash and investment details privately to your account.</p><Link href="/login" className="mt-7 inline-block rounded-xl bg-violet-500 px-6 py-3 font-semibold">Login / Sign up</Link></div></main>;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between"><Link href="/" className="text-sm text-violet-300">← TargetBud</Link><span className="text-xs text-slate-500">{userEmail}</span></div>
        <section className="mt-6 rounded-[2rem] border border-violet-400/20 bg-white/[.045] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold tracking-[.2em] text-violet-300">MY TARGET</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">₹70 lakh goal</h1>
          <p className="mt-2 text-slate-400">Add each cash holding or investment separately. Interest and maturity are calculated from the details you enter.</p>

          <div className="mt-8 rounded-2xl bg-black/20 p-5">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-slate-400">Current projected value</p><p className="mt-1 text-3xl font-bold">{money(currentTotal)}</p></div><p className="text-2xl font-bold text-violet-300">{progress.toFixed(1)}%</p></div>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>₹0</span><span>{money(TARGET)}</span></div>
          </div>

          <form onSubmit={addInvestment} className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
            <h2 className="text-xl font-semibold">Add money / investment</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className="text-sm text-slate-400">Name</span><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="HDFC FD / Cash / SIP" className="field" /></label>
              <label><span className="text-sm text-slate-400">Type</span><select value={form.investment_type} onChange={e => setForm({...form,investment_type:e.target.value})} className="field">{TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span className="text-sm text-slate-400">Principal invested / amount</span><input required type="number" min="0" value={form.principal_amount} onChange={e => setForm({...form,principal_amount:e.target.value})} placeholder="100000" className="field" /></label>
              <label><span className="text-sm text-slate-400">Interest / expected return %</span><input type="number" min="0" step="0.01" value={form.expected_rate} onChange={e => setForm({...form,expected_rate:e.target.value})} placeholder="7.5" className="field" /></label>
              <label><span className="text-sm text-slate-400">Rate</span><select value={form.rate_type} onChange={e => setForm({...form,rate_type:e.target.value})} className="field"><option>None</option><option>Fixed</option><option>Expected</option></select></label>
              <label><span className="text-sm text-slate-400">Invested on</span><input required type="date" value={form.invested_on} onChange={e => setForm({...form,invested_on:e.target.value})} className="field" /></label>
              <label><span className="text-sm text-slate-400">Maturity date</span><input type="date" value={form.maturity_on} onChange={e => setForm({...form,maturity_on:e.target.value})} className="field" /></label>
              <label><span className="text-sm text-slate-400">Compounding</span><select value={form.compounding} onChange={e => setForm({...form,compounding:e.target.value as typeof form.compounding})} className="field">{COMPOUNDING.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span className="text-sm text-slate-400">Monthly addition</span><input type="number" min="0" value={form.monthly_addition} onChange={e => setForm({...form,monthly_addition:e.target.value})} placeholder="0" className="field" /></label>
              <label><span className="text-sm text-slate-400">Current value (optional)</span><input type="number" min="0" value={form.current_value} onChange={e => setForm({...form,current_value:e.target.value})} placeholder="Leave blank to calculate" className="field" /></label>
            </div>
            <button disabled={saving} className="mt-5 rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{saving ? "Saving…" : "Add to ₹70 lakh goal"}</button>
          </form>

          <div className="mt-6 space-y-3">
            {investments.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-500">No entries yet. Add your cash, FD, SIP, mutual funds or other investments above.</p>}
            {investments.map(inv => { const value = projectedValue(inv, today); const maturity = inv.maturity_on ? projectedValue(inv, new Date(`${inv.maturity_on}T00:00:00`)) : null; return <div key={inv.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{inv.name}</h3><p className="mt-1 text-xs text-slate-500">{inv.investment_type} · Invested {new Date(`${inv.invested_on}T00:00:00`).toLocaleDateString("en-IN")}</p></div><button onClick={()=>removeInvestment(inv.id)} className="text-xs text-rose-300">Remove</button></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-slate-500">Principal</p><p className="font-semibold">{money(inv.principal_amount)}</p></div><div><p className="text-slate-500">Current value</p><p className="font-semibold">{money(value)}</p></div><div><p className="text-slate-500">Return</p><p className="font-semibold">{inv.expected_rate ? `${inv.expected_rate}% ${inv.rate_type.toLowerCase()}` : "None"}</p></div><div><p className="text-slate-500">Monthly addition</p><p className="font-semibold">{money(inv.monthly_addition)}</p></div></div>{inv.maturity_on && <p className="mt-3 text-xs text-slate-400">Matures {new Date(`${inv.maturity_on}T00:00:00`).toLocaleDateString("en-IN")} · Projected maturity value {money(maturity ?? value)}</p>}</div>; })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-rose-400/10 p-4"><p className="text-sm text-slate-400">Remaining</p><p className="mt-1 text-2xl font-bold">{money(remaining)}</p></div><div className="rounded-2xl bg-emerald-400/10 p-4"><p className="text-sm text-slate-400">Monthly additions</p><p className="mt-1 text-2xl font-bold">{money(monthlyTotal)}</p></div><div className="rounded-2xl bg-sky-400/10 p-4"><p className="text-sm text-slate-400">Estimated completion</p><p className="mt-1 text-xl font-bold">{completion}</p></div></div>
        </section>
      </div>
      <style jsx global>{`.field{margin-top:.5rem;width:100%;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);padding:.7rem 1rem;outline:none;color:inherit}.field:focus{border-color:rgb(167 139 250)}select.field option{background:#07111f}`}</style>
    </main>
  );
}
