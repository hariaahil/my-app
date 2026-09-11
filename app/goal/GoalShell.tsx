"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  Link2,
  LogIn,
  LogOut,
  Plus,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Investment = {
  id: string;
  name: string;
  investment_type: string;
  principal_amount: number;
  expected_rate: number;
  rate_period: "Monthly" | "Yearly";
  invested_on: string;
  maturity_on: string | null;
  monthly_addition: number;
  current_value: number | null;
  contribution_type: "Monthly" | "On maturity";
  funding_source: "Salary" | "Other";
  funding_activity_id: string | null;
};

type Activity = {
  id: string;
  flow_type: "income" | "expense";
  amount: number;
  source: string | null;
  flow_date: string;
  note: string | null;
  is_recurring: boolean;
  recurrence: string;
  recurrence_end: string | null;
  category: string | null;
};

type Modal = "projection" | "salary" | "addActivity" | "investments" | "addInvestment" | null;
type DurationUnit = "Days" | "Months" | "Years";

const TARGET = 7000000;
const INTEREST_TYPES = new Set(["FD", "RD", "SIP", "Mutual Fund", "PPF"]);
const INVESTMENT_TYPES = [
  "Cash / Uninvested",
  "FD",
  "RD",
  "SIP",
  "Mutual Fund",
  "PPF",
  "Stock",
  "Gold Scheme",
  "Physical Gold",
  "Chit Fund",
  "Other",
];
const INCOME_CATEGORIES = ["Salary", "Business income", "Freelance", "Rental income", "Other income"];
const EXPENSE_CATEGORIES = [
  "EMI",
  "Rent",
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Mobile",
  "Insurance",
  "School / Education",
  "Groceries",
  "Fuel / Transport",
  "Medical",
  "Subscriptions",
  "Other expense",
];

function money(value: number) {
  return `₹${Math.round(Math.max(0, value)).toLocaleString("en-IN")}`;
}
function dateText(value: string | null) {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
function dayDiff(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}
function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function daysInYear(date: Date) {
  return new Date(date.getFullYear(), 1, 29).getDate() === 29 ? 366 : 365;
}
function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + months);
  copy.setDate(Math.min(day, daysInMonth(copy)));
  return copy;
}
function addDuration(start: string, count: number, unit: DurationUnit) {
  const d = new Date(`${start}T00:00:00`);
  if (!Number.isFinite(count) || count <= 0) return "";
  if (unit === "Days") d.setDate(d.getDate() + count);
  else if (unit === "Months") return addMonths(d, count).toISOString().slice(0, 10);
  else d.setFullYear(d.getFullYear() + count);
  return d.toISOString().slice(0, 10);
}
function monthlyEquivalent(activity: Activity) {
  const amount = Number(activity.amount || 0);
  if (activity.recurrence === "Weekly") return (amount * 52) / 12;
  if (activity.recurrence === "Yearly") return amount / 12;
  return amount;
}
function dailyAccrualInvestment(inv: Investment, today: Date) {
  const start = new Date(`${inv.invested_on}T00:00:00`);
  const maturity = inv.maturity_on ? new Date(`${inv.maturity_on}T00:00:00`) : null;
  const end = maturity && maturity < today ? maturity : today;
  let value = Number(inv.current_value ?? inv.principal_amount ?? 0);
  const principal = Number(inv.principal_amount || 0);
  const payment = Number(inv.monthly_addition || 0);
  const days = dayDiff(start, end);

  if (!INTEREST_TYPES.has(inv.investment_type) || Number(inv.expected_rate || 0) <= 0) {
    return {
      value,
      earned: Math.max(0, value - principal),
      days,
      daily: days ? Math.max(0, value - principal) / days : 0,
    };
  }

  value = principal;
  let cursor = new Date(start);
  let nextContribution = inv.contribution_type === "Monthly" ? addMonths(start, 1) : null;
  while (cursor < end) {
    const nextDay = new Date(cursor);
    nextDay.setDate(nextDay.getDate() + 1);
    const rate = inv.rate_period === "Monthly"
      ? Number(inv.expected_rate) / 100 / daysInMonth(cursor)
      : Number(inv.expected_rate) / 100 / daysInYear(cursor);
    value += value * rate;
    if (nextContribution && nextDay >= nextContribution && nextContribution <= end) {
      value += payment;
      const day = nextContribution.getDate();
      nextContribution.setDate(1);
      nextContribution.setMonth(nextContribution.getMonth() + 1);
      nextContribution.setDate(Math.min(day, daysInMonth(nextContribution)));
    }
    cursor = nextDay;
  }
  return {
    value,
    earned: Math.max(0, value - principal),
    days,
    daily: days ? Math.max(0, value - principal) / days : 0,
  };
}
function monthlyReturnRate(inv: Investment) {
  if (!INTEREST_TYPES.has(inv.investment_type) || Number(inv.expected_rate || 0) <= 0) return 0;
  const rate = Number(inv.expected_rate) / 100;
  return inv.rate_period === "Monthly" ? rate : Math.pow(1 + rate, 1 / 12) - 1;
}
function emptyActivity() {
  return {
    flow_type: "income" as "income" | "expense",
    category: "Salary",
    source: "Salary",
    amount: "",
    flow_date: new Date().toISOString().slice(0, 10),
    recurrence: "Monthly",
    recurrence_end: "",
    note: "",
  };
}
function emptyInvestment() {
  return {
    name: "",
    investment_type: "FD",
    principal_amount: "",
    expected_rate: "",
    rate_period: "Yearly" as "Monthly" | "Yearly",
    invested_on: new Date().toISOString().slice(0, 10),
    duration: "",
    duration_unit: "Months" as DurationUnit,
    monthly_addition: "",
    contribution_type: "Monthly" as "Monthly" | "On maturity",
    current_value: "",
    funding_source: "Salary" as "Salary" | "Other",
    funding_activity_id: "",
  };
}

export default function GoalShell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState(emptyActivity());
  const [investmentForm, setInvestmentForm] = useState(emptyInvestment());

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    setEmail(user?.email ?? null);
    if (user) {
      const [{ data: inv }, { data: act }] = await Promise.all([
        supabase.from("goal_investments").select("*").order("invested_on", { ascending: true }),
        supabase.from("cash_flows").select("*").eq("is_recurring", true).order("flow_date", { ascending: true }),
      ]);
      setInvestments((inv ?? []) as Investment[]);
      setActivities((act ?? []) as Activity[]);
    } else {
      setInvestments([]);
      setActivities([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const today = new Date();
  const calculated = useMemo(
    () => investments.map((investment) => ({ investment, calc: dailyAccrualInvestment(investment, today) })),
    [investments, today.toDateString()],
  );
  const current = calculated.reduce((sum, row) => sum + row.calc.value, 0);
  const monthlyContribution = investments.reduce(
    (sum, investment) => sum + (investment.contribution_type === "Monthly" ? Number(investment.monthly_addition || 0) : 0),
    0,
  );
  const interestEarned = calculated.reduce((sum, row) => sum + row.calc.earned, 0);
  const remaining = Math.max(TARGET - current, 0);
  const progress = Math.min((current / TARGET) * 100, 100);

  const salaryActivities = activities.filter(
    (activity) => activity.flow_type === "income" && activity.category === "Salary",
  );
  const recurringIncome = activities
    .filter((activity) => activity.flow_type === "income")
    .reduce((sum, activity) => sum + monthlyEquivalent(activity), 0);
  const recurringExpense = activities
    .filter((activity) => activity.flow_type === "expense")
    .reduce((sum, activity) => sum + monthlyEquivalent(activity), 0);
  const salaryIncome = salaryActivities.reduce((sum, activity) => sum + monthlyEquivalent(activity), 0);
  const salaryInvested = investments
    .filter((investment) => investment.funding_source === "Salary" && investment.contribution_type === "Monthly")
    .reduce((sum, investment) => sum + Number(investment.monthly_addition || 0), 0);
  const salaryAfterExpenses = salaryIncome - recurringExpense;
  const salaryAfterInvesting = salaryAfterExpenses - salaryInvested;

  const projection = useMemo(() => {
    if (current >= TARGET) return { rows: [{ month: monthLabel(today), value: TARGET }], months: 0, canCalculate: true };
    if (monthlyContribution <= 0) return { rows: [{ month: monthLabel(today), value: current }], months: null, canCalculate: false };

    const rows = [{ month: monthLabel(today), value: current }];
    let balances = investments.map((investment) => ({
      value: dailyAccrualInvestment(investment, today).value,
      contribution:
        investment.contribution_type === "Monthly" ? Number(investment.monthly_addition || 0) : 0,
      rate: monthlyReturnRate(investment),
    }));
    for (let m = 1; m <= 600; m += 1) {
      const d = addMonths(today, m);
      balances = balances.map((balance) => ({
        value: balance.value * (1 + balance.rate) + balance.contribution,
        contribution: balance.contribution,
        rate: balance.rate,
      }));
      const value = Math.min(TARGET, balances.reduce((sum, balance) => sum + balance.value, 0));
      rows.push({ month: monthLabel(d), value });
      if (value >= TARGET) return { rows, months: m, canCalculate: true };
    }
    return { rows, months: null, canCalculate: true };
  }, [current, monthlyContribution, investments, today.toDateString()]);
  const completion = projection.months === 0 ? "Goal reached" : projection.months ? projection.rows[projection.rows.length - 1].month : "Cannot calculate";

  const openAddInvestment = () => {
    setEditingInvestmentId(null);
    setInvestmentForm(emptyInvestment());
    setModal("addInvestment");
  };
  const openEditInvestment = (investment: Investment) => {
    const maturity = investment.maturity_on ? new Date(`${investment.maturity_on}T00:00:00`) : null;
    const start = new Date(`${investment.invested_on}T00:00:00`);
    let duration = "";
    let durationUnit: DurationUnit = "Months";
    if (maturity) {
      const months = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
      if (months > 0 && addMonths(start, months).toDateString() === maturity.toDateString()) {
        duration = String(months);
        durationUnit = months % 12 === 0 ? "Years" : "Months";
        if (durationUnit === "Years") duration = String(months / 12);
      } else {
        duration = String(dayDiff(start, maturity));
        durationUnit = "Days";
      }
    }
    setEditingInvestmentId(investment.id);
    setInvestmentForm({
      name: investment.name,
      investment_type: investment.investment_type,
      principal_amount: String(investment.principal_amount),
      expected_rate: String(investment.expected_rate || ""),
      rate_period: investment.rate_period ?? "Yearly",
      invested_on: investment.invested_on,
      duration,
      duration_unit: durationUnit,
      monthly_addition: String(investment.monthly_addition || ""),
      contribution_type: investment.contribution_type ?? "Monthly",
      current_value: investment.current_value == null ? "" : String(investment.current_value),
      funding_source: investment.funding_source ?? "Other",
      funding_activity_id: investment.funding_activity_id ?? "",
    });
    setModal("addInvestment");
  };

  async function saveInvestment(event: FormEvent) {
    event.preventDefault();
    if (!userId || !investmentForm.name.trim() || !Number(investmentForm.principal_amount)) return;
    setSaving(true);
    const typeSupportsReturn = INTEREST_TYPES.has(investmentForm.investment_type);
    const maturity = addDuration(investmentForm.invested_on, Number(investmentForm.duration), investmentForm.duration_unit);
    const payload = {
      user_id: userId,
      name: investmentForm.name.trim(),
      investment_type: investmentForm.investment_type,
      principal_amount: Number(investmentForm.principal_amount) || 0,
      expected_rate: typeSupportsReturn ? Number(investmentForm.expected_rate) || 0 : 0,
      rate_period: investmentForm.rate_period,
      invested_on: investmentForm.invested_on,
      maturity_on: maturity || null,
      monthly_addition: Number(investmentForm.monthly_addition) || 0,
      current_value: investmentForm.current_value ? Number(investmentForm.current_value) : null,
      contribution_type: investmentForm.contribution_type,
      funding_source: investmentForm.funding_source,
      funding_activity_id:
        investmentForm.funding_source === "Salary" && investmentForm.funding_activity_id
          ? investmentForm.funding_activity_id
          : null,
    };
    const supabase = createClient();
    const result = editingInvestmentId
      ? await supabase.from("goal_investments").update(payload).eq("id", editingInvestmentId).eq("user_id", userId).select().single()
      : await supabase.from("goal_investments").insert(payload).select().single();
    setSaving(false);
    if (!result.error && result.data) {
      setInvestments((previous) =>
        editingInvestmentId
          ? previous.map((investment) => (investment.id === editingInvestmentId ? (result.data as Investment) : investment))
          : [...previous, result.data as Investment],
      );
      setModal("investments");
      setEditingInvestmentId(null);
    }
  }

  async function saveActivity(event: FormEvent) {
    event.preventDefault();
    if (!userId || !Number(activityForm.amount)) return;
    setSaving(true);
    const supabase = createClient();
    const result = await supabase
      .from("cash_flows")
      .insert({
        user_id: userId,
        flow_type: activityForm.flow_type,
        amount: Number(activityForm.amount),
        source: activityForm.source.trim() || activityForm.category,
        flow_date: activityForm.flow_date,
        note: activityForm.note.trim() || null,
        is_recurring: true,
        recurrence: activityForm.recurrence,
        recurrence_end: activityForm.recurrence_end || null,
        category: activityForm.category,
      })
      .select()
      .single();
    setSaving(false);
    if (!result.error && result.data) {
      setActivities((previous) => [...previous, result.data as Activity].sort((a, b) => a.flow_date.localeCompare(b.flow_date)));
      setActivityForm(emptyActivity());
      setModal("salary");
    }
  }

  async function removeActivity(id: string) {
    const { error } = await createClient().from("cash_flows").delete().eq("id", id).eq("user_id", userId);
    if (!error) setActivities((previous) => previous.filter((activity) => activity.id !== id));
  }
  async function removeInvestment(id: string) {
    const { error } = await createClient().from("goal_investments").delete().eq("id", id).eq("user_id", userId);
    if (!error) setInvestments((previous) => previous.filter((investment) => investment.id !== id));
  }
  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/goal";
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading your goal…</main>;
  }
  if (!userId) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 p-4">
        <section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-600"><CircleDollarSign /></div>
          <p className="mt-5 text-xs font-bold tracking-[.2em] text-violet-600">TARGETBUD</p>
          <h1 className="mt-2 text-3xl font-black">Your ₹70 lakh goal</h1>
          <p className="mt-3 text-slate-500">Login to keep your goal private.</p>
          <Link href="/login" className="mt-7 inline-flex w-full justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white"><LogIn size={18}/>Login / Sign up</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <Link href="/" className="flex items-center gap-2 font-black"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">T</span>TargetBud</Link>
          <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:block">{email}</span><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><LogOut size={16}/>Logout</button></div>
        </header>

        <section className="rounded-[2rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,.08)] ring-1 ring-slate-200 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <button onClick={() => setModal("projection")} aria-label="Open ₹70 lakh projection" className="grid size-32 shrink-0 place-items-center rounded-full bg-violet-50 transition hover:scale-[1.03] hover:shadow-lg">
                <div className="text-center"><b className="text-2xl">{progress.toFixed(1)}%</b><p className="text-[11px] font-bold text-slate-400">complete</p><p className="mt-1 text-[10px] font-bold text-violet-600">View graph</p></div>
              </button>
              <div><p className="text-xs font-bold tracking-[.18em] text-violet-600">MY TARGET</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">₹70 lakh</h1><p className="mt-1 text-sm text-slate-500">Your investment path to ₹70 lakh.</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{investments.length} investments</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Growth {money(interestEarned)}</span></div></div>
            </div>
            <div className="flex flex-wrap gap-2"><button onClick={() => setModal("salary")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-bold"><CalendarClock size={19}/>Salary & recurring activity</button><button onClick={() => setModal("investments")} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 font-bold text-violet-700"><WalletCards size={19}/>Investments</button></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Current value" value={money(current)} hint="Calculated till today"/><Metric label="Remaining" value={money(remaining)} hint="To ₹70 lakh"/><Metric label="Monthly contribution" value={money(monthlyContribution)} hint="Across investments"/><Metric label="Est. completion" value={completion} hint="From current plan"/></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Summary label="Monthly salary" value={money(salaryIncome)}/><Summary label="Invested from salary" value={money(salaryInvested)}/><Summary label="Salary after expenses + investments" value={money(salaryAfterInvesting)}/></div>
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm sm:items-center" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
            <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:rounded-[2rem] sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-violet-600">{modal === "projection" ? "70 LAKH PROJECTION" : modal === "salary" || modal === "addActivity" ? "SALARY MANAGEMENT" : "INVESTMENTS"}</p><h2 className="mt-1 text-2xl font-black">{modal === "projection" ? "How you reach ₹70 lakh" : modal === "salary" ? "Salary, EMI & bills" : modal === "addActivity" ? "Add recurring activity" : modal === "addInvestment" ? (editingInvestmentId ? "Edit investment" : "Add investment") : "Your investments"}</h2></div><button onClick={() => setModal(null)} className="grid size-10 place-items-center rounded-xl bg-slate-100"><X size={19}/></button></div>

              {modal === "projection" && (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3"><Summary label="Current" value={money(current)}/><Summary label="Monthly contribution" value={money(monthlyContribution)}/><Summary label="Estimated reach" value={completion}/></div>
                  {projection.canCalculate ? <ProjectionGraph rows={projection.rows} target={TARGET}/> : <div className="rounded-2xl bg-amber-50 p-5 text-center text-sm text-amber-800">Cannot calculate yet — add a monthly investment contribution.</div>}
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Only your recorded investment values, monthly contributions and entered return rates are used. Salary and expenses do not alter this graph.</p>
                </div>
              )}

              {modal === "salary" && (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4"><Summary label="Salary" value={money(salaryIncome)}/><Summary label="All recurring income" value={money(recurringIncome)}/><Summary label="Recurring expenses" value={money(recurringExpense)}/><Summary label="Invested from salary" value={money(salaryInvested)}/></div>
                  <div className="flex flex-wrap gap-2"><button onClick={() => { setActivityForm({ ...emptyActivity(), flow_type: "income", category: "Salary", source: "Salary" }); setModal("addActivity"); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white"><Plus size={18}/>Add income</button><button onClick={() => { setActivityForm({ ...emptyActivity(), flow_type: "expense", category: "EMI", source: "EMI" }); setModal("addActivity"); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold"><Plus size={18}/>Add expense</button></div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-violet-600">SALARY ALLOCATION</p><p className="mt-1 text-sm font-bold text-slate-900">{money(salaryIncome)} salary → {money(recurringExpense)} recurring expenses → {money(salaryInvested)} invested → {money(salaryAfterInvesting)} left</p></div><Link href="/goal/activity" className="text-sm font-bold text-violet-700">Manage all</Link></div></div>
                  <div className="space-y-2">{activities.length===0?<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No recurring activity recorded yet.</p>:activities.map((activity)=><article key={activity.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div><div className="flex flex-wrap items-center gap-2"><b>{activity.source||activity.category||"Activity"}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{activity.category||"Other"}</span><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">{activity.recurrence}</span></div><p className="mt-1 text-xs text-slate-500">Starts {dateText(activity.flow_date)}{activity.recurrence_end?` · Ends ${dateText(activity.recurrence_end)}`:""}</p></div><div className="flex items-center gap-3"><b className={activity.flow_type==="income"?"text-emerald-600":"text-rose-600"}>{activity.flow_type==="income"?"+":"−"}{money(activity.amount)}</b><button onClick={() => removeActivity(activity.id)} className="text-xs font-bold text-rose-600">Delete</button></div></article>)}</div>
                </div>
              )}

              {modal === "addActivity" && (
                <form onSubmit={saveActivity} className="mt-6 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setActivityForm((form) => ({ ...form, flow_type: "income", category: "Salary", source: "Salary" }))} className={`rounded-2xl p-4 text-left ring-1 ${activityForm.flow_type === "income" ? "bg-violet-50 ring-violet-200" : "bg-slate-50 ring-slate-200"}`}><b>Income</b><p className="mt-1 text-xs text-slate-500">Salary, business, freelance or rental</p></button><button type="button" onClick={() => setActivityForm((form) => ({ ...form, flow_type: "expense", category: "EMI", source: "EMI" }))} className={`rounded-2xl p-4 text-left ring-1 ${activityForm.flow_type === "expense" ? "bg-violet-50 ring-violet-200" : "bg-slate-50 ring-slate-200"}`}><b>Expense</b><p className="mt-1 text-xs text-slate-500">EMI, rent, bills and regular spending</p></button></div>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select value={activityForm.category} onChange={(event) => setActivityForm((form) => ({ ...form, category: event.target.value, source: event.target.value }))} className="tb-field">{(activityForm.flow_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Name / source"><input required value={activityForm.source} onChange={(event) => setActivityForm((form) => ({ ...form, source: event.target.value }))} className="tb-field"/></Field><Field label="Amount"><input required type="number" min="0" value={activityForm.amount} onChange={(event) => setActivityForm((form) => ({ ...form, amount: event.target.value }))} className="tb-field"/></Field><Field label="Repeats"><select value={activityForm.recurrence} onChange={(event) => setActivityForm((form) => ({ ...form, recurrence: event.target.value }))} className="tb-field"><option>Monthly</option><option>Weekly</option><option>Yearly</option></select></Field><Field label="Starts"><input required type="date" value={activityForm.flow_date} onChange={(event) => setActivityForm((form) => ({ ...form, flow_date: event.target.value }))} className="tb-field"/></Field><Field label="Ends on (optional)"><input type="date" min={activityForm.flow_date} value={activityForm.recurrence_end} onChange={(event) => setActivityForm((form) => ({ ...form, recurrence_end: event.target.value }))} className="tb-field"/></Field></div>
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal("salary")} className="rounded-xl border px-4 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">{saving?"Saving…":"Save activity"}</button></div>
                </form>
              )}

              {modal === "investments" && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap gap-2"><button onClick={openAddInvestment} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white"><Plus size={18}/>Add investment</button><span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">{money(monthlyContribution)} monthly contributions</span></div>
                  {investments.length===0?<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No investments recorded yet.</p>:investments.map((investment)=>{const row=calculated.find((item)=>item.investment.id===investment.id);return <article key={investment.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b>{investment.name}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{investment.investment_type}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${investment.funding_source==="Salary"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{investment.funding_source==="Salary"?"From salary":"Other money"}</span></div><p className="mt-1 text-xs text-slate-500">Invested {dateText(investment.invested_on)} · {investment.contribution_type} · {investment.rate_period}</p></div><button onClick={()=>openEditInvestment(investment)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-violet-700"><Edit3 size={14}/>Edit</button></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="Current" value={money(row?.calc.value??investment.current_value??investment.principal_amount)}/><Mini label="Principal" value={money(investment.principal_amount)}/><Mini label="Earned" value={money(row?.calc.earned??0)}/><Mini label="Monthly" value={money(investment.monthly_addition)}/></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{investment.funding_source==="Salary"?"Counts in Invested from salary":"Not counted against salary"}</span><button onClick={()=>removeInvestment(investment.id)} className="font-bold text-rose-600">Delete</button></div></article>})}
                </div>
              )}

              {modal === "addInvestment" && (
                <form onSubmit={saveInvestment} className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-bold tracking-[.16em] text-violet-600">WHAT IS THIS?</p><Field label="Investment type"><select value={investmentForm.investment_type} onChange={(event)=>setInvestmentForm((form)=>({...form,investment_type:event.target.value}))} className="tb-field mt-1">{INVESTMENT_TYPES.map((type)=><option key={type}>{type}</option>)}</select></Field></div>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input required value={investmentForm.name} onChange={(event)=>setInvestmentForm((form)=>({...form,name:event.target.value}))} placeholder="e.g. Home FD" className="tb-field"/></Field><Field label="Principal / amount invested"><input required type="number" min="0" value={investmentForm.principal_amount} onChange={(event)=>setInvestmentForm((form)=>({...form,principal_amount:event.target.value}))} className="tb-field"/></Field></div>
                  {INTEREST_TYPES.has(investmentForm.investment_type)&&<div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold tracking-[.16em] text-slate-400">RETURN</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Rate"><input type="number" min="0" step="0.01" value={investmentForm.expected_rate} onChange={(event)=>setInvestmentForm((form)=>({...form,expected_rate:event.target.value}))} placeholder="e.g. 7.5" className="tb-field"/></Field><Field label="Rate period"><select value={investmentForm.rate_period} onChange={(event)=>setInvestmentForm((form)=>({...form,rate_period:event.target.value as "Monthly"|"Yearly"}))} className="tb-field"><option>Yearly</option><option>Monthly</option></select></Field></div></div>}
                  <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold tracking-[.16em] text-slate-400">CONTRIBUTION</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Payment pattern"><select value={investmentForm.contribution_type} onChange={(event)=>setInvestmentForm((form)=>({...form,contribution_type:event.target.value as "Monthly"|"On maturity"}))} className="tb-field"><option>Monthly</option><option>On maturity</option></select></Field><Field label="Monthly / maturity amount"><input type="number" min="0" value={investmentForm.monthly_addition} onChange={(event)=>setInvestmentForm((form)=>({...form,monthly_addition:event.target.value}))} className="tb-field"/></Field></div></div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-xs font-bold tracking-[.16em] text-slate-400">WHEN?</p><div className="mt-3 grid gap-4 sm:grid-cols-3"><Field label="Start date"><input required type="date" value={investmentForm.invested_on} onChange={(event)=>setInvestmentForm((form)=>({...form,invested_on:event.target.value}))} className="tb-field"/></Field><Field label="Duration"><input type="number" min="1" value={investmentForm.duration} onChange={(event)=>setInvestmentForm((form)=>({...form,duration:event.target.value}))} className="tb-field"/></Field><Field label="Unit"><select value={investmentForm.duration_unit} onChange={(event)=>setInvestmentForm((form)=>({...form,duration_unit:event.target.value as DurationUnit}))} className="tb-field"><option>Days</option><option>Months</option><option>Years</option></select></Field></div>{investmentForm.duration&&<p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-violet-700 ring-1 ring-slate-200">Matures {dateText(addDuration(investmentForm.invested_on,Number(investmentForm.duration),investmentForm.duration_unit))}</p>}</div>
                  <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold tracking-[.16em] text-slate-400">WHERE DOES THE MONTHLY MONEY COME FROM?</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setInvestmentForm((form)=>({...form,funding_source:"Salary",funding_activity_id:form.funding_activity_id||salaryActivities[0]?.id||""}))} className={`rounded-2xl p-4 text-left ring-1 ${investmentForm.funding_source==="Salary"?"bg-emerald-50 ring-emerald-200":"bg-slate-50 ring-slate-200"}`}><div className="flex items-center gap-2 font-bold"><Link2 size={18}/>Salary</div><p className="mt-1 text-xs text-slate-500">Show this amount as invested from salary.</p></button><button type="button" onClick={()=>setInvestmentForm((form)=>({...form,funding_source:"Other",funding_activity_id:""}))} className={`rounded-2xl p-4 text-left ring-1 ${investmentForm.funding_source==="Other"?"bg-violet-50 ring-violet-200":"bg-slate-50 ring-slate-200"}`}><div className="flex items-center gap-2 font-bold"><WalletCards size={18}/>Other money</div><p className="mt-1 text-xs text-slate-500">Not deducted from salary.</p></button></div>{investmentForm.funding_source==="Salary"&&salaryActivities.length>0&&<Field label="Link to salary"><select value={investmentForm.funding_activity_id} onChange={(event)=>setInvestmentForm((form)=>({...form,funding_activity_id:event.target.value}))} className="tb-field mt-3"><option value="">Salary (general)</option>{salaryActivities.map((salary)=><option value={salary.id} key={salary.id}>{salary.source||"Salary"} · {money(monthlyEquivalent(salary))}/month</option>)}</select></Field>}</div>
                  <div className="flex justify-end gap-2"><button type="button" onClick={()=>setModal("investments")} className="rounded-xl border px-4 py-3 font-bold">Back</button><button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">{saving?"Saving…":editingInvestmentId?"Save changes":"Add investment"}</button></div>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({label,value,hint}:{label:string;value:string;hint:string}){return <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p><p className="text-[11px] text-slate-400">{hint}</p></div>}
function Summary({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>}
function monthLabel(date:Date){return date.toLocaleDateString("en-IN",{month:"short",year:"numeric"})}
function ProjectionGraph({rows,target}:{rows:{month:string;value:number}[];target:number}){const width=1000,height=430,padX=55,padY=35,plotW=width-padX*2,plotH=height-padY-55,points=rows.map((row,index)=>({x:padX+(rows.length===1?plotW/2:(index/(rows.length-1))*plotW),y:padY+plotH-(row.value/target)*plotH,...row})),line=points.map((point,index)=>`${index===0?"M":"L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),last=points[points.length-1];return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-violet-600">₹70 LAKH PATH</p><p className="mt-1 text-sm text-slate-500">Current value → target</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-slate-200">{money(last?.value??0)}</span></div><div className="mt-5 overflow-x-auto"><div className="min-w-[720px]"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full"><line x1={padX} x2={width-padX} y1={padY} y2={padY} stroke="currentColor" strokeDasharray="8 8" className="text-violet-300"/><text x={width-padX} y={padY+18} textAnchor="end" className="fill-violet-600 text-[16px] font-bold">₹70L target</text><line x1={padX} x2={padX} y1={padY} y2={padY+plotH} stroke="currentColor" className="text-slate-200"/><line x1={padX} x2={width-padX} y1={padY+plotH} y2={padY+plotH} stroke="currentColor" className="text-slate-200"/><path d={`${line} L${last?.x??padX},${padY+plotH} L${points[0]?.x??padX},${padY+plotH} Z`} className="fill-violet-100"/><path d={line} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600"/><circle cx={points[0]?.x??padX} cy={points[0]?.y??padY+plotH} r="7" className="fill-violet-600 stroke-white" strokeWidth="3"/><circle cx={last?.x??padX} cy={last?.y??padY+plotH} r="7" className="fill-violet-600 stroke-white" strokeWidth="3"/><text x={padX} y={height-14} className="fill-slate-400 text-[15px] font-bold">{rows[0]?.month}</text><text x={width-padX} y={height-14} textAnchor="end" className="fill-slate-400 text-[15px] font-bold">{rows[rows.length-1]?.month}</text></svg></div></div></div>}
