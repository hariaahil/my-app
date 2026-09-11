"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, CircleDollarSign, Edit3, LogIn, LogOut, Plus, TrendingUp, WalletCards, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Investment = {
  id: string;
  name: string;
  investment_type: string;
  principal_amount: number;
  expected_rate: number;
  rate_type: "Fixed" | "Expected" | "None";
  rate_period: "Monthly" | "Yearly";
  invested_on: string;
  maturity_on: string | null;
  compounding: "Monthly" | "Quarterly" | "Yearly" | "At maturity" | "None";
  monthly_addition: number;
  current_value: number | null;
  contribution_type: "Monthly" | "On maturity";
};

type Modal = "current" | "remaining" | "monthly" | "assets" | "add" | null;
const TARGET = 7000000;
const TYPES = ["Cash / Uninvested", "FD", "RD", "SIP", "Mutual Fund", "PPF", "Stock", "Other"];
const COMPOUNDING = ["Monthly", "Quarterly", "Yearly", "At maturity", "None"] as const;
const CONTRIBUTION_TYPES = ["Monthly", "On maturity"] as const;
const RATE_PERIODS = ["Monthly", "Yearly"] as const;

type FormState = {
  name: string;
  investment_type: string;
  principal_amount: string;
  expected_rate: string;
  rate_type: "Fixed" | "Expected" | "None";
  rate_period: "Monthly" | "Yearly";
  invested_on: string;
  maturity_on: string;
  compounding: (typeof COMPOUNDING)[number];
  monthly_addition: string;
  current_value: string;
  contribution_type: (typeof CONTRIBUTION_TYPES)[number];
};

function money(value: number) { return `₹${Math.round(Math.max(0, value)).toLocaleString("en-IN")}`; }
function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
function dayDiff(from: Date, to: Date) { return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000)); }
function daysInMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); }
function daysInYear(date: Date) { return new Date(date.getFullYear(), 1, 29).getDate() === 29 ? 366 : 365; }
function addMonthsSafe(date: Date, months: number) { const d = new Date(date); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months); d.setDate(Math.min(day, daysInMonth(d))); return d; }

/** Accrue interest/growth for every elapsed calendar day from the invested date to today. */
function calculateInvestment(inv: Investment, today: Date) {
  const start = new Date(`${inv.invested_on}T00:00:00`);
  const maturity = inv.maturity_on ? new Date(`${inv.maturity_on}T00:00:00`) : null;
  const end = maturity && maturity < today ? maturity : today;
  const principal = Number(inv.principal_amount || 0);
  const maturityContribution = Number(inv.monthly_addition || 0);

  if (inv.investment_type === "Cash / Uninvested" || inv.expected_rate <= 0 || inv.compounding === "None") {
    const value = maturity && maturity < today && inv.current_value != null ? Number(inv.current_value) : principal;
    const contributed = inv.contribution_type === "On maturity" && maturity && today >= maturity ? maturityContribution : 0;
    return { value: value + contributed, contributed, earned: 0, days: dayDiff(start, end), daily: 0 };
  }

  let balance = principal;
  let contributed = 0;
  let cursor = new Date(start);
  let nextContribution = inv.contribution_type === "Monthly" ? addMonthsSafe(start, 1) : null;

  while (cursor < end) {
    const nextDay = new Date(cursor);
    nextDay.setDate(nextDay.getDate() + 1);
    const dailyRate = inv.rate_period === "Monthly"
      ? inv.expected_rate / 100 / daysInMonth(cursor)
      : inv.expected_rate / 100 / daysInYear(cursor);
    balance += Math.max(0, balance * dailyRate);

    if (nextContribution && nextDay >= nextContribution && nextContribution <= end) {
      balance += Number(inv.monthly_addition || 0);
      contributed += Number(inv.monthly_addition || 0);
      nextContribution = addMonthsSafe(nextContribution, 1);
    }
    cursor = nextDay;
  }

  if (inv.contribution_type === "On maturity" && maturity && today >= maturity) {
    balance += maturityContribution;
    contributed += maturityContribution;
  }

  const staleOverride = maturity && maturity < today && inv.current_value != null ? Number(inv.current_value) : null;
  const value = staleOverride ?? balance;
  const earned = Math.max(0, value - principal - contributed);
  return { value, contributed, earned, days: dayDiff(start, end), daily: dayDiff(start, end) > 0 ? earned / dayDiff(start, end) : 0 };
}

function isStale(inv: Investment, today: Date) { return Boolean(inv.maturity_on && new Date(`${inv.maturity_on}T00:00:00`) < new Date(today.getFullYear(), today.getMonth(), today.getDate())); }
function emptyForm(): FormState { return { name: "", investment_type: "Cash / Uninvested", principal_amount: "", expected_rate: "", rate_type: "None", rate_period: "Monthly", invested_on: new Date().toISOString().slice(0, 10), maturity_on: "", compounding: "Monthly", monthly_addition: "", current_value: "", contribution_type: "Monthly" }; }

function ProgressRing({ value }: { value: number }) {
  const radius = 58, circumference = 2 * Math.PI * radius, dash = circumference * Math.min(value, 100) / 100;
  return <div className="relative size-36 shrink-0"><svg viewBox="0 0 144 144" className="size-36 -rotate-90"><circle cx="72" cy="72" r={radius} fill="none" stroke="#e8eaf1" strokeWidth="12" /><circle cx="72" cy="72" r={radius} fill="none" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} /></svg><div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-extrabold text-slate-900">{value.toFixed(1)}%</div><div className="text-[11px] font-semibold text-slate-400">complete</div></div></div></div>;
}

export default function GoalPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const today = new Date();

  async function loadUserData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null); setUserEmail(user?.email ?? null);
    if (user) { const { data } = await supabase.from("goal_investments").select("*").order("invested_on", { ascending: true }); setInvestments((data ?? []) as Investment[]); }
    else setInvestments([]);
    setLoading(false);
  }

  useEffect(() => { let mounted = true; const supabase = createClient(); loadUserData(); const { data: listener } = supabase.auth.onAuthStateChange(() => { if (mounted) loadUserData(); }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);

  const calculated = useMemo(() => investments.map(inv => ({ inv, calc: calculateInvestment(inv, today) })), [investments, today.toDateString()]);
  const currentTotal = calculated.reduce((s, x) => s + x.calc.value, 0);
  const principalTotal = investments.reduce((s, i) => s + Number(i.principal_amount || 0), 0);
  const interestTotal = calculated.reduce((s, x) => s + x.calc.earned, 0);
  const progress = Math.min(currentTotal / TARGET * 100, 100);
  const remaining = Math.max(TARGET - currentTotal, 0);
  const monthlyTotal = investments.reduce((s, i) => s + (i.contribution_type === "Monthly" ? Number(i.monthly_addition || 0) : 0), 0);
  const staleCount = investments.filter(i => isStale(i, today)).length;
  const completion = useMemo(() => { if (remaining <= 0) return "Goal reached"; if (monthlyTotal <= 0) return "Set a monthly addition"; const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(remaining / monthlyTotal)); return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }); }, [remaining, monthlyTotal]);

  function openEdit(inv: Investment) {
    setEditingId(inv.id);
    setForm({ name: inv.name, investment_type: inv.investment_type, principal_amount: String(inv.principal_amount), expected_rate: String(inv.expected_rate), rate_type: inv.rate_type, rate_period: inv.rate_period ?? "Yearly", invested_on: inv.invested_on, maturity_on: inv.maturity_on ?? "", compounding: inv.compounding, monthly_addition: String(inv.monthly_addition || ""), current_value: inv.current_value == null ? "" : String(inv.current_value), contribution_type: inv.contribution_type ?? "Monthly" });
    setModal("add");
  }

  async function saveInvestment(e: FormEvent) {
    e.preventDefault(); if (!userId || !form.name.trim()) return; setSaving(true);
    const supabase = createClient();
    const payload = { user_id: userId, name: form.name.trim(), investment_type: form.investment_type, principal_amount: Number(form.principal_amount) || 0, expected_rate: Number(form.expected_rate) || 0, rate_type: form.investment_type === "Cash / Uninvested" ? "None" : form.rate_type, rate_period: form.rate_period, invested_on: form.invested_on, maturity_on: form.maturity_on || null, compounding: form.investment_type === "Cash / Uninvested" ? "None" : form.compounding, monthly_addition: Number(form.monthly_addition) || 0, current_value: form.current_value ? Number(form.current_value) : null, contribution_type: form.contribution_type };
    const result = editingId ? await supabase.from("goal_investments").update(payload).eq("id", editingId).eq("user_id", userId).select().single() : await supabase.from("goal_investments").insert(payload).select().single();
    setSaving(false);
    if (!result.error && result.data) { if (editingId) setInvestments(p => p.map(i => i.id === editingId ? result.data as Investment : i)); else setInvestments(p => [...p, result.data as Investment]); setEditingId(null); setForm(emptyForm()); setModal("assets"); }
  }

  async function removeInvestment(id: string) { const { error } = await createClient().from("goal_investments").delete().eq("id", id).eq("user_id", userId); if (!error) setInvestments(p => p.filter(i => i.id !== id)); }
  async function logout() { await createClient().auth.signOut(); window.location.href = "/goal"; }

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading your goal…</main>;
  if (!userId) return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><div className="mx-auto flex min-h-[82vh] max-w-md items-center justify-center"><section className="w-full rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-600"><CircleDollarSign size={30} /></div><p className="mt-6 text-xs font-bold tracking-[.22em] text-violet-600">TARGETBUD</p><h1 className="mt-2 text-3xl font-extrabold">Your ₹70 lakh goal</h1><p className="mt-3 text-slate-500">Login to save your goal and investments privately.</p><Link href="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white"><LogIn size={18} /> Login / Sign up</Link><Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Back</Link></section></div></main>;

  return <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6"><div className="mx-auto max-w-6xl">
    <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200"><Link href="/" className="flex items-center gap-2 font-extrabold"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">T</span>TargetBud</Link><div className="flex items-center gap-2"><span className="hidden max-w-48 truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">{userEmail}</span><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><LogOut size={16} /> Logout</button></div></header>
    <section className="rounded-[2rem] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,.08)] ring-1 ring-slate-200 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4 sm:gap-6"><ProgressRing value={progress} /><div className="min-w-0"><p className="text-xs font-bold tracking-[.18em] text-violet-600">MY TARGET</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">₹70 lakh</h1><p className="mt-1 text-sm text-slate-500">Interest and growth calculated day-by-day from each invested date.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{investments.length} asset{investments.length === 1 ? "" : "s"}</span>{staleCount > 0 && <button onClick={() => setModal("assets")} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{staleCount} stale</button>}</div></div></div><button onClick={() => { setEditingId(null); setForm(emptyForm()); setModal("add"); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-violet-200"><Plus size={19} /> Add investment</button></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><MetricButton label="Current value" value={money(currentTotal)} hint="Calculated till today" icon={<WalletCards size={18} />} onClick={() => setModal("current")} /><MetricButton label="Interest / growth" value={money(interestTotal)} hint="Earned till today" icon={<TrendingUp size={18} />} onClick={() => setModal("current")} /><MetricButton label="Remaining" value={money(remaining)} hint="Gap to ₹70 lakh" icon={<TrendingUp size={18} />} onClick={() => setModal("remaining")} /><MetricButton label="Monthly addition" value={money(monthlyTotal)} hint="Monthly contributions" icon={<CircleDollarSign size={18} />} onClick={() => setModal("monthly")} /><MetricButton label="Est. completion" value={completion} hint="Based on monthly additions" icon={<CalendarDays size={18} />} onClick={() => setModal("monthly")} /></div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Principal {money(principalTotal)}</p><p className="mt-1 text-xs text-slate-500">Interest / growth earned till today: {money(interestTotal)}</p></div><button onClick={() => setModal("assets")} className="inline-flex items-center gap-1 text-sm font-bold text-violet-600">View investments <ChevronRight size={17} /></button></div>
    </section><p className="mt-3 text-center text-xs text-slate-400">Detailed values stay inside pop-ups so the main screen stays compact.</p>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><section className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-violet-600">{modal === "add" ? (editingId ? "EDIT INVESTMENT" : "NEW INVESTMENT") : modal === "assets" ? "YOUR ASSETS" : "GOAL DETAILS"}</p><h2 className="mt-1 text-2xl font-black">{modal === "add" ? (editingId ? "Edit investment" : "Add investment") : modal === "current" ? money(currentTotal) : modal === "remaining" ? `${money(remaining)} left` : modal === "monthly" ? `${money(monthlyTotal)} / month` : "Where your goal money is"}</h2><p className="mt-1 text-sm text-slate-500">{modal === "current" ? "Interest and growth are accrued for each elapsed calendar day." : modal === "assets" ? "Edit any asset and see what it has earned till today." : "Your ₹70 lakh plan."}</p></div><button onClick={() => setModal(null)} className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><X size={19} /></button></div>
      {modal === "add" && <form onSubmit={saveInvestment} className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="My FD / SIP" className="tb-field" /></Field><Field label="Type"><select value={form.investment_type} onChange={e=>setForm({...form,investment_type:e.target.value})} className="tb-field">{TYPES.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Principal invested"><input required type="number" min="0" value={form.principal_amount} onChange={e=>setForm({...form,principal_amount:e.target.value})} className="tb-field" /></Field><Field label="Interest / growth rate"><input type="number" min="0" step="0.01" value={form.expected_rate} onChange={e=>setForm({...form,expected_rate:e.target.value})} placeholder="2.50" className="tb-field" /></Field><Field label="Rate period"><select value={form.rate_period} onChange={e=>setForm({...form,rate_period:e.target.value as FormState["rate_period"]})} className="tb-field">{RATE_PERIODS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Return type"><select value={form.rate_type} onChange={e=>setForm({...form,rate_type:e.target.value as FormState["rate_type"]})} className="tb-field"><option>None</option><option>Fixed</option><option>Expected</option></select></Field><Field label="Invested on"><input required type="date" value={form.invested_on} onChange={e=>setForm({...form,invested_on:e.target.value})} className="tb-field" /></Field><Field label="Maturity date"><input type="date" value={form.maturity_on} onChange={e=>setForm({...form,maturity_on:e.target.value})} className="tb-field" /></Field><Field label="Payment type"><select value={form.contribution_type} onChange={e=>setForm({...form,contribution_type:e.target.value as FormState["contribution_type"]})} className="tb-field"><option>Monthly</option><option>On maturity</option></select></Field><Field label={form.contribution_type === "Monthly" ? "Monthly contribution" : "Maturity contribution"}><input type="number" min="0" value={form.monthly_addition} onChange={e=>setForm({...form,monthly_addition:e.target.value})} placeholder="0" className="tb-field" /></Field><Field label="Compounding"><select value={form.compounding} onChange={e=>setForm({...form,compounding:e.target.value as FormState["compounding"]})} className="tb-field">{COMPOUNDING.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Recorded current value (optional)"><input type="number" min="0" value={form.current_value} onChange={e=>setForm({...form,current_value:e.target.value})} placeholder="Used for matured/stale assets" className="tb-field" /></Field><div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-slate-200 px-4 py-3 font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">{saving ? "Saving…" : editingId ? "Save changes" : "Add to goal"}</button></div></form>}
      {modal === "assets" && <div className="mt-5 space-y-3">{investments.length===0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Nothing added yet.</div>}{calculated.map(({inv,calc})=>{const stale=isStale(inv,today); return <div key={inv.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{inv.name}</h3><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">{inv.investment_type}</span>{stale&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Stale</span>}</div><p className="mt-1 text-xs text-slate-500">Invested {formatDate(inv.invested_on)} · {inv.expected_rate}% / {inv.rate_period.toLowerCase()} · {inv.contribution_type === "Monthly" ? `${money(inv.monthly_addition)} monthly` : `${money(inv.monthly_addition)} on maturity`}</p></div><button onClick={()=>openEdit(inv)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-violet-600 ring-1 ring-slate-200"><Edit3 size={14}/> Edit</button></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="Principal" value={money(inv.principal_amount)} /><Mini label="Current value" value={money(calc.value)} /><Mini label="Earned till today" value={money(calc.earned)} /><Mini label="Daily avg." value={money(calc.daily)} /></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span>Age: {calc.days} days</span><span>•</span><span>Maturity: {formatDate(inv.maturity_on)}</span><span>•</span><span>Compounding: {inv.compounding}</span></div><div className="mt-3 flex justify-end"><button onClick={()=>removeInvestment(inv.id)} className="text-xs font-bold text-red-500">Delete</button></div></div>})}</div>}
      {modal === "current" && <div className="mt-5 space-y-3">{calculated.map(({inv,calc})=><div key={inv.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex justify-between gap-3"><span className="font-bold">{inv.name}</span><span className="font-black">{money(calc.value)}</span></div><div className="mt-2 flex flex-wrap gap-4 text-sm"><span>Principal: {money(inv.principal_amount)}</span><span>Earned till today: <b className="text-emerald-600">{money(calc.earned)}</b></span><span>Days: {calc.days}</span></div></div>)}<div className="rounded-2xl bg-violet-50 p-4"><p className="text-sm font-bold text-violet-900">Total interest / growth earned till today</p><p className="mt-1 text-2xl font-black text-violet-700">{money(interestTotal)}</p></div></div>}
      {modal === "remaining" && <div className="mt-5 rounded-2xl bg-slate-50 p-5"><div className="flex justify-between"><span>₹70 lakh target</span><b>{money(TARGET)}</b></div><div className="mt-3 flex justify-between"><span>Current value</span><b>{money(currentTotal)}</b></div><div className="my-4 border-t border-slate-200"/><div className="flex justify-between text-lg"><span className="font-bold">Remaining</span><b className="text-violet-700">{money(remaining)}</b></div></div>}
      {modal === "monthly" && <div className="mt-5 space-y-3">{investments.filter(i=>i.contribution_type==="Monthly").map(i=><div key={i.id} className="flex justify-between rounded-2xl bg-slate-50 p-4"><span className="font-bold">{i.name}</span><b>{money(i.monthly_addition)} / month</b></div>)}{monthlyTotal===0&&<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No monthly contributions set. On-maturity payments are excluded from the monthly total.</p>}</div>}
    </section></div>}
  </div></main>;
}

function MetricButton({ label, value, hint, icon, onClick }: { label: string; value: string; hint: string; icon: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} className="rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-400">{label}</p><span className="text-violet-500">{icon}</span></div><p className="mt-1 text-xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">{hint}</p></button>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
