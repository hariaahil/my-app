"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Target, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { AUTO_REINVEST_RATE, DEFAULT_GOAL_TARGET, currentValue, projectGoal, recurringMonthly, isActive, type GoalActivity, type GoalInvestment } from "@/lib/goal-projection";

const money=(n:number)=>`₹${Math.round(Math.max(0,n)).toLocaleString("en-IN")}`;
const short=(n:number)=>n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:money(n);
const fmt=(d:Date)=>d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

function AdvancedChart({points,target}:{points:{date:Date;value:number}[];target:number}){
 const [hover,setHover]=useState<number|null>(null);
 const data=points.slice(0,37);
 const W=1100,H=390,L=62,R=24,T=24,B=52,max=Math.max(target,...data.map(p=>p.value),1),pw=W-L-R,ph=H-T-B;
 const xy=(p:{date:Date;value:number},i:number)=>({x:L+(data.length<2?pw/2:i/(data.length-1)*pw),y:T+ph-p.value/max*ph});
 const coords=data.map(xy);
 const line=coords.map((p,i)=>`${i?"L":"M"}${p.x},${p.y}`).join(" ");
 const area=`M${coords[0]?.x??L},${T+ph} ${line.slice(1)} L${coords.at(-1)?.x??W-R},${T+ph} Z`;
 const ty=T+ph-target/max*ph;
 return <div className="relative overflow-x-auto rounded-3xl bg-slate-50 p-3 sm:p-5"><div className="min-w-[760px]"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={()=>setHover(null)}>
   {[0,.25,.5,.75,1].map(q=><g key={q}><line x1={L} x2={W-R} y1={T+ph*(1-q)} y2={T+ph*(1-q)} stroke="#e2e8f0"/><text x={L-10} y={T+ph*(1-q)+4} textAnchor="end" fontSize="11" fill="#64748b">{short(max*q)}</text></g>)}
   <line x1={L} x2={W-R} y1={ty} y2={ty} stroke="#7c3aed" strokeWidth="2" strokeDasharray="8 7"/><text x={W-R} y={ty-9} textAnchor="end" fontSize="12" fontWeight="700" fill="#7c3aed">Target {short(target)}</text>
   <path d={area} fill="#111827" opacity=".06"/><path d={line} fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
   {coords.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={hover===i?7:3.5} fill="#111827" onMouseEnter={()=>setHover(i)}/>{(i===0||i===data.length-1||i%6===0)&&<text x={p.x} y={H-22} textAnchor="middle" fontSize="10" fill="#64748b">{data[i].date.toLocaleDateString("en-IN",{month:"short",year:"2-digit"})}</text>}</g>)}
 </svg>{hover!==null&&data[hover]&&<div className="pointer-events-none absolute right-5 top-5 rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200"><p className="font-bold">{fmt(data[hover].date)}</p><p className="mt-0.5 text-slate-600">{money(data[hover].value)}</p><p className="text-slate-400">{(data[hover].value/target*100).toFixed(1)}% of target</p></div>}</div></div>
}

export default function EditableGoalInsights(){
 const [investments,setInvestments]=useState<GoalInvestment[]>([]),[activities,setActivities]=useState<GoalActivity[]>([]),[target,setTarget]=useState(DEFAULT_GOAL_TARGET),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const today=new Date();
 async function load(){setLoading(true);const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user){setLoading(false);return}const[{data:inv,error:ie},{data:act,error:ae},{data:goal,error:ge}]=await Promise.all([s.from("goal_investments").select("*").eq("user_id",user.id).order("invested_on"),s.from("cash_flows").select("*").eq("user_id",user.id).eq("is_recurring",true).order("flow_date"),s.from("financial_goals").select("target_amount").eq("user_id",user.id).maybeSingle()]);if(ie||ae||ge)setError(ie?.message||ae?.message||ge?.message||"Unable to load goal data.");setInvestments((inv??[])as GoalInvestment[]);setActivities((act??[])as GoalActivity[]);setTarget(Math.max(1,Number(goal?.target_amount)||DEFAULT_GOAL_TARGET));setLoading(false)}
 useEffect(()=>{load()},[]);
 const current=useMemo(()=>investments.reduce((s,i)=>s+currentValue(i,today),0),[investments,today.toDateString()]);
 const surplus=Math.max(0,activities.filter(a=>isActive(a,today)).reduce((s,a)=>s+(a.flow_type==="income"?1:-1)*recurringMonthly(a),0));
 const points=useMemo(()=>projectGoal(investments,activities,[],today,target),[investments,activities,target,today.toDateString()]);
 const reach=points.find(p=>p.value>=target), progress=Math.min(100,current/target*100), projectionRows=points.slice(0,13);
 if(loading)return <main className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading…</main>;
 return <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><Link href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Finance · Goal</Link><button onClick={load} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200"><RefreshCw size={16}/></button></header>{error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 <section className="mt-4 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Financial Goal</p><h1 className="mt-1 text-3xl font-black">Path to {money(target)}</h1><p className="mt-2 text-sm text-slate-500">Projection uses your saved investments, recurring activity and the existing reinvestment model.</p></div><div className="grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Target/></div></div><div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Current</p><p className="mt-1 text-xl font-black">{money(current)}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Progress</p><p className="mt-1 text-xl font-black">{progress.toFixed(1)}%</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Monthly surplus</p><p className="mt-1 text-xl font-black">{money(surplus)}</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs text-violet-600">Target date</p><p className="mt-1 text-xl font-black text-violet-900">{current>=target?"Reached":reach?fmt(reach.date):"Not reached"}</p></div></div></section>
 <section className="mt-4 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Projection</p><h2 className="mt-1 text-xl font-black">Growth path</h2><p className="mt-1 text-sm text-slate-500">Hover the curve to inspect each projected month.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><TrendingUp size={14}/> {AUTO_REINVEST_RATE}% reinvestment</span></div><div className="mt-5"><AdvancedChart points={points} target={target}/></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>● Current trajectory</span><span>— — Target line</span><span>Hover points for exact value</span></div></section>
 <section className="mt-4 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Month-by-month</p><h2 className="mt-1 text-xl font-black">Projected goal value</h2></div><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[680px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Projected value</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{projectionRows.map((p,i)=><tr key={i} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{fmt(p.date)}</td><td className="px-4 py-3 font-black">{money(p.value)}</td><td className="px-4 py-3">{Math.min(100,p.value/target*100).toFixed(1)}%</td><td className="px-4 py-3">{money(Math.max(target-p.value,0))}</td><td className="px-4 py-3">{p.value>=target?<span className="font-bold text-emerald-700">Target reached</span>:<span className="text-slate-500">In progress</span>}</td></tr>)}</tbody></table></div></section>
 <p className="mt-3 text-xs leading-5 text-slate-500">Target is editable from the main Goal page. Existing entered rates apply through maturity; maturity proceeds and recurring surplus use the {AUTO_REINVEST_RATE}% reinvestment model. These are projections, not guaranteed returns.</p>
 </div></main>
}
