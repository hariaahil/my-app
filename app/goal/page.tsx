"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, CircleDollarSign, Clock3, LogIn, LogOut, Plus, TrendingUp, WalletCards, X } from "lucide-react";
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

type Modal = "current" | "remaining" | "monthly" | "assets" | "add" | null;

const TARGET = 7000000;
const TYPES = ["Cash / Uninvested", "FD", "RD", "SIP", "Mutual Fund", "PPF", "Stock", "Other"];
const COMPOUNDING = ["Monthly", "Quarterly", "Yearly", "At maturity", "None"] as const;

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function monthsBetween(from: Date, to: Date) {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + (to.getDate() >= from.getDate() ? 0 : -1));
}

function projectedValue(inv: Investment, at: Date) {
  if (inv.investment_type === "Cash / Uninvested" || inv.expected_rate <= 0 || inv.compounding === "None") return inv.current_value ?? inv.principal_amount;
  const start = new Date(`${inv.invested_on}T00:00:00`);
  const months = monthsBetween(start, at);
  const rate = inv.expected_rate / 100;
  const periodsPerYear = inv.compounding === "Monthly" ? 12 : inv.compounding === "Quarterly" ? 4 : 1;
  const periods = Math.max(0, Math.floor(months / (12 / periodsPerYear)));
  const periodRate = rate / periodsPerYear;
  const principalGrowth = inv.principal_amount * Math.pow(1 + periodRate, periods);
  const additions = inv.monthly_addition > 0 && periodRate > 0
    ? inv.monthly_addition * ((Math.pow(1 + periodRate, periods) - 1) / periodRate)
    : inv.monthly_addition * periods;
  return principalGrowth + additions;
}

function isStale(inv: Investment, today: Date) {
  return Boolean(inv.maturity_on && new Date(`${inv.maturity_on}T00:00:00`) < new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}

function valueForDashboard(inv: Investment, today: Date) {
  if (isStale(inv, today)) return inv.current_value ?? inv.principal_amount;
  return inv.current_value ?? projectedValue(inv, today);
}

function ProgressRing({ value }: { value: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(value, 100) / 100;
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 144 144" className="size-36 -rotate-90">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e8eaf1" strokeWidth="12" />
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">{value.toFixed(1)}%</div>
          <div className="text-[11px] font-semibold text-slate-400">complete</div>
        </div>
      </div>
    </div>
  );
}

export default function GoalPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState({
    name: "",
    investment_type: "Cash / Uninvested",
    principal_amount: "",
    expected_rate: "",
    rate_type: "None",
    invested_on: new Date().toISOString().slice(0, 10),
    maturity_on: "",
    compounding: "None" as (typeof COMPOUNDING)[number],
    monthly_addition: "",
    current_value: "",
  });

  const supabase = useMemo(() => createClient(), []);

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    setUserEmail(user?.email ?? null);
    if (user) {
      const { data } = await supabase.from("goal_investments").select("*").order("invested_on", { ascending: true });
      setInvestments((data ?? []) as Investment[]);
    } else {
      setInvestments([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    loadUserData();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      if (mounted) loadUserData();
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const today = new Date();
  const currentTotal = investments.reduce((sum, inv) => sum + valueForDashboard(inv, today), 0);
  const progress = Math.min((currentTotal / TARGET) * 100, 100);
  const remaining = Math.max(TARGET - currentTotal, 0);
  const monthlyTotal = investments.reduce((sum, inv) => sum + Number(inv.monthly_addition || 0), 0);
  const staleCount = investments.filter(inv => isStale(inv, today)).length;
  const projectedInterest = Math.max(currentTotal - investments.reduce((sum, inv) => sum + Number(inv.principal_amount || 0), 0), 0);
  const completion = useMemo(() => {
    if (remaining <= 0) return "Goal reached";
    if (monthlyTotal <= 0) return "Set a monthly addition";
    const months = Math.ceil(remaining / monthlyTotal);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }, [remaining, monthlyTotal]);

  async function addInvestment(e: FormEvent) {
    e.preventDefault();
    if (!userId || !form.name.trim()) return;
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
      setModal(null);
    }
  }

  async function removeInvestment(id: string) {
    await supabase.from("goal_investments").delete().eq("id", id);
    setInvestments(prev => prev.filter(item => item.id !== id));
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/goal";
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading your goal…</main>;

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto flex min-h-[82vh] max-w-md items-center justify-center">
          <section className="w-full rounded-[2rem] bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,.10)] ring-1 ring-slate-200">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-600"><CircleDollarSign size={30} /></div>
            <p className="mt-6 text-xs font-bold tracking-[.22em] text-violet-600">TARGETBUD</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your ₹70 lakh goal</h1>
            <p className="mt-3 text-slate-500">Login to save your goal, cash and investments privately.</p>
            <Link href="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-violet-200"><LogIn size={18} /> Login / Sign up</Link>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Back to TargetBud</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 sm:px-5">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">T</span>TargetBud</Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">{userEmail}</span>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut size={16} /> Logout</button>
          </div>
        </header>

        <section className="rounded-[2rem] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,.08)] ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <ProgressRing value={progress} />
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[.18em] text-violet-600">MY TARGET</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">₹70 lakh</h1>
                <p className="mt-1 text-sm text-slate-500">One number. Everything important in one view.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{investments.length} asset{investments.length === 1 ? "" : "s"}</span>
                  {staleCount > 0 && <button onClick={() => setModal("assets")} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{staleCount} stale</button>}
                </div>
              </div>
            </div>
            <button onClick={() => setModal("add")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"><Plus size={19} /> Add investment</button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricButton label="Current value" value={money(currentTotal)} hint="What counts toward your goal" icon={<WalletCards size={18} />} onClick={() => setModal("current")} />
            <MetricButton label="Remaining" value={money(remaining)} hint="Tap for the full gap" icon={<TrendingUp size={18} />} onClick={() => setModal("remaining")} />
            <MetricButton label="Monthly addition" value={money(monthlyTotal)} hint="Your planned contribution" icon={<CircleDollarSign size={18} />} onClick={() => setModal("monthly")} />
            <MetricButton label="Est. completion" value={completion} hint="Based on current monthly addition" icon={<CalendarDays size={18} />} onClick={() => setModal("monthly")} />
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Your plan at a glance</p>
                <p className="mt-1 text-xs text-slate-500">Principal {money(investments.reduce((s, i) => s + Number(i.principal_amount || 0), 0))} · Projected/entered growth {money(projectedInterest)}</p>
              </div>
              <button onClick={() => setModal("assets")} className="inline-flex items-center gap-1 text-sm font-bold text-violet-600">View investments <ChevronRight size={17} /></button>
            </div>
          </div>
        </section>

        <p className="mt-3 text-center text-xs text-slate-400">Detailed investments, returns and maturity dates stay inside pop-ups so the main screen remains clean.</p>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,.20)] ring-1 ring-slate-200 sm:p-7 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                {modal === "add" && <><p className="text-xs font-bold tracking-[.18em] text-violet-600">NEW ENTRY</p><h2 className="mt-1 text-2xl font-black">Add money to your ₹70 lakh goal</h2><p className="mt-1 text-sm text-slate-500">Cash stays cash. Investments grow only when you give the return details.</p></>}
                {modal === "assets" && <><p className="text-xs font-bold tracking-[.18em] text-violet-600">YOUR ASSETS</p><h2 className="mt-1 text-2xl font-black">Where your goal money is</h2><p className="mt-1 text-sm text-slate-500">Each item remains separate, including stale investments.</p></>}
                {modal === "current" && <><p className="text-xs font-bold tracking-[.18em] text-violet-600">CURRENT VALUE</p><h2 className="mt-1 text-2xl font-black">{money(currentTotal)}</h2><p className="mt-1 text-sm text-slate-500">This is the amount currently reflected toward ₹70 lakh.</p></>}
                {modal === "remaining" && <><p className="text-xs font-bold tracking-[.18em] text-violet-600">THE GAP</p><h2 className="mt-1 text-2xl font-black">{money(remaining)} left</h2><p className="mt-1 text-sm text-slate-500">A simple view of how much more you need.</p></>}
                {modal === "monthly" && <><p className="text-xs font-bold tracking-[.18em] text-violet-600">PLAN</p><h2 className="mt-1 text-2xl font-black">{money(monthlyTotal)} / month</h2><p className="mt-1 text-sm text-slate-500">Your additions determine the current completion estimate.</p></>}
              </div>
              <button onClick={() => setModal(null)} className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={19} /></button>
            </div>

            {modal === "add" && (
              <form onSubmit={addInvestment} className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Name"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My FD / Cash / SIP" className="tb-field" /></Field>
                <Field label="Type"><select value={form.investment_type} onChange={e => setForm({ ...form, investment_type: e.target.value })} className="tb-field">{TYPES.map(x => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Principal / current amount"><input required type="number" min="0" value={form.principal_amount} onChange={e => setForm({ ...form, principal_amount: e.target.value })} placeholder="100000" className="tb-field" /></Field>
                <Field label="Interest / expected return %"><input type="number" min="0" step="0.01" value={form.expected_rate} onChange={e => setForm({ ...form, expected_rate: e.target.value })} placeholder="7.5" className="tb-field" /></Field>
                <Field label="Return type"><select value={form.rate_type} onChange={e => setForm({ ...form, rate_type: e.target.value })} className="tb-field"><option>None</option><option>Fixed</option><option>Expected</option></select></Field>
                <Field label="Invested on"><input required type="date" value={form.invested_on} onChange={e => setForm({ ...form, invested_on: e.target.value })} className="tb-field" /></Field>
                <Field label="Maturity date"><input type="date" value={form.maturity_on} onChange={e => setForm({ ...form, maturity_on: e.target.value })} className="tb-field" /></Field>
                <Field label="Compounding"><select value={form.compounding} onChange={e => setForm({ ...form, compounding: e.target.value as (typeof COMPOUNDING)[number] })} className="tb-field">{COMPOUNDING.map(x => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Monthly addition"><input type="number" min="0" value={form.monthly_addition} onChange={e => setForm({ ...form, monthly_addition: e.target.value })} placeholder="0" className="tb-field" /></Field>
                <Field label="Actual current value (optional)"><input type="number" min="0" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} placeholder="Leave blank to calculate" className="tb-field" /></Field>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Add to goal"}</button></div>
              </form>
            )}

            {modal === "assets" && (
              <div className="mt-5 space-y-3">
                {investments.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Nothing added yet.</div>}
                {investments.map(inv => {
                  const stale = isStale(inv, today);
                  const value = valueForDashboard(inv, today);
                  const maturityValue = inv.maturity_on ? projectedValue(inv, new Date(`${inv.maturity_on}T00:00:00`)) : null;
                  return (
                    <div key={inv.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{inv.name}</h3>{stale ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-700">STALE</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-700">ACTIVE</span>}</div><p className="mt-1 text-xs text-slate-500">{inv.investment_type} · Invested {formatDate(inv.invested_on)}{inv.maturity_on ? ` · Matures ${formatDate(inv.maturity_on)}` : ""}</p></div>
                        <button onClick={() => removeInvestment(inv.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50">Remove</button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-4"><Mini label="Principal" value={money(inv.principal_amount)} /><Mini label="Current value" value={money(value)} /><Mini label="Return" value={inv.expected_rate ? `${inv.expected_rate}% ${inv.rate_type.toLowerCase()}` : "None"} /><Mini label="Monthly add" value={money(inv.monthly_addition)} /></div>
                      {inv.maturity_on && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 size={14} /> {stale ? "Maturity passed — kept stale" : `Projected maturity ${money(maturityValue ?? value)}`}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {(modal === "current" || modal === "remaining" || modal === "monthly") && (
              <div className="mt-6 space-y-3">
                {investments.length === 0 && <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Add an investment to start seeing the breakdown here.</div>}
                {investments.map(inv => {
                  const value = valueForDashboard(inv, today);
                  const share = currentTotal > 0 ? (value / currentTotal) * 100 : 0;
                  return <button key={inv.id} onClick={() => setModal("assets")} className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-violet-200 hover:bg-violet-50/40"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{inv.name}</p><p className="text-xs text-slate-500">{inv.investment_type}</p></div><p className="font-extrabold">{modal === "monthly" ? money(inv.monthly_addition) : money(value)}</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(share, 100)}%` }} /></div></button>;
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <style jsx global>{`.tb-field{margin-top:.5rem;width:100%;border-radius:.85rem;border:1px solid #e2e8f0;background:#fff;padding:.8rem 1rem;outline:none;color:#0f172a}.tb-field:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}select.tb-field option{background:#fff;color:#0f172a}`}</style>
    </main>
  );
}

function MetricButton({ label, value, hint, icon, onClick }: { label: string; value: string; hint: string; icon: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">{icon}</span><ChevronRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-extrabold text-slate-800">{value}</p></div>;
}
