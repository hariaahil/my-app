"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, RefreshCw, Target } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Investment={id:string;name:string;investment_type:string;principal_amount:number;expected_rate:number;rate_period:"Monthly"|"Yearly";invested_on:string;maturity_on:string|null;compounding:string;monthly_addition:number;current_value:number|null;contribution_type:"Monthly"|"On maturity";expected_maturity_amount:number|null;funding_source:string|null;funding_activity_id:string|null};
type Row={date:Date;value:number;contributions:number;growth:number;unknown:boolean};
const TARGET=7000000;
const money=(n:number)=>`₹${Math.round(Math.max(0,n)).toLocaleString("en-IN")}`;
const shortMoney=(n:number)=>n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${Math.round(n/1000)}K`:money(n);
const day=(s:string)=>new Date(`${s}T00:00:00`);
const addMonths=(d:Date,n:number)=>{const x=new Date(d),dom=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);x.setDate(Math.min(dom,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));return x};
const fmt=(d:Date)=>d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
const monthFmt=(d:Date)=>d.toLocaleDateString("en-IN",{month:"short",year:"numeric"});
const rate=(i:Investment)=>{const r=Number(i.expected_rate||0)/100;return r>0?(i.rate_period==="Monthly"?r:Math.pow(1+r,1/12)-1):0};

function currentValue(i:Investment,today:Date){
 const start=day(i.invested_on), mat=i.maturity_on?day(i.maturity_on):null;
 if(start>today)return 0;
 if(mat&&mat<today&&i.current_value!=null)return Number(i.current_value);
 let v=Number(i.principal_amount||0), d=new Date(start);
 while(d<today){
  const next=new Date(d); next.setDate(next.getDate()+1);
  const r=rate(i); if(r)v+=v*r/((d.getMonth()===1)?new Date(d.getFullYear(),2,0).getDate():new Date(d.getFullYear(),d.getMonth()+1,0).getDate());
  if(i.contribution_type==="Monthly"&&next.getDate()===Math.min(start.getDate(),new Date(next.getFullYear(),next.getMonth()+1,0).getDate())&&(!mat||next<=mat))v+=Number(i.monthly_addition||0);
  d=next;
 }
 if(mat&&mat<=today&&i.expected_maturity_amount!=null)v=Number(i.expected_maturity_amount);
 return v;
}

function project(investments:Investment[],today:Date,horizon=600):Row[]{
 const states=investments.map(i=>({i,value:currentValue(i,today),unknown:false,matured:!!(i.maturity_on&&day(i.maturity_on)<=today)}));
 const rows:Row[]=[];
 for(let n=0;n<=horizon;n++){
  const d=addMonths(today,n); let added=0,unknown=false;
  if(n>0)states.forEach(s=>{
   if(s.matured)return;
   const mat=s.i.maturity_on?day(s.i.maturity_on):null;
   const maturityThisMonth=!!(mat&&mat<=d);
   if(maturityThisMonth){
    if(s.i.expected_maturity_amount!=null){s.value=Number(s.i.expected_maturity_amount);}
    else if(rate(s.i)>0){
      const r=rate(s.i); s.value*=1+r;
      if(s.i.contribution_type==="Monthly"&&(!mat||d<=mat)){s.value+=Number(s.i.monthly_addition||0);added+=Number(s.i.monthly_addition||0)}
    } else {s.unknown=true;unknown=true;}
    s.matured=true;
   } else {
    const r=rate(s.i); if(r)s.value*=1+r;
    if(s.i.contribution_type==="Monthly"){const c=Number(s.i.monthly_addition||0);s.value+=c;added+=c;}
   }
   if(s.unknown)unknown=true;
  });
  const value=states.reduce((a,s)=>a+s.value,0);
  rows.push({date:d,value,contributions:added,growth:Math.max(0,value-investments.reduce((a,i)=>a+Number(i.principal_amount||0),0)-rows.reduce((a,r)=>a+r.contributions,0)),unknown});
  if(value>=TARGET)break;
 }
 return rows;
}

function Chart({rows}:{rows:Row[]}){const W=1100,H=360,L=62,R=24,T=24,B=50;const max=Math.max(TARGET,...rows.map(r=>r.value),1),pw=W-L-R,ph=H-T-B;const pts=rows.map((r,i)=>({x:L+(rows.length===1?pw/2:i/(rows.length-1)*pw),y:T+ph-(r.value/max)*ph}));const path=pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");const ty=T+ph-(TARGET/max)*ph;return <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5"><svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px] w-full" role="img" aria-label="₹70 lakh target projection">{[0,.25,.5,.75,1].map(q=><g key={q}><line x1={L} x2={W-R} y1={T+ph*(1-q)} y2={T+ph*(1-q)} stroke="#e2e8f0"/><text x={L-10} y={T+ph*(1-q)+4} textAnchor="end" fontSize="12" fill="#64748b">{shortMoney(max*q)}</text></g>)}<line x1={L} x2={W-R} y1={ty} y2={ty} stroke="#7c3aed" strokeWidth="2" strokeDasharray="8 7"/><text x={W-R} y={ty-8} textAnchor="end" fontSize="12" fontWeight="800" fill="#7c3aed">₹70L target</text><path d={path} fill="none" stroke="#0f766e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><text x={L} y={H-15} fontSize="12" fill="#64748b">{monthFmt(rows[0].date)}</text><text x={W-R} y={H-15} textAnchor="end" fontSize="12" fill="#64748b">{monthFmt(rows[rows.length-1].date)}</text></svg></div>}
function Kpi({label,value,sub}:{label:string;value:string;sub?:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p>{sub&&<p className="mt-1 text-xs text-slate-500">{sub}</p>}</div>}

export default function GoalInsightsPage(){
 const [investments,setInvestments]=useState<Investment[]>([]);const [loading,setLoading]=useState(true);const today=new Date();
 useEffect(()=>{let dead=false;(async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){if(!dead)setLoading(false);return}const {data}=await s.from("goal_investments").select("*").eq("user_id",user.id).order("invested_on",{ascending:true});if(!dead){setInvestments((data??[])as Investment[]);setLoading(false)}})();return()=>{dead=true}},[]);
 const rows=useMemo(()=>project(investments,today,600),[investments,today.toDateString()]);
 const current=rows[0]?.value??0;const targetDate=current>=TARGET?today:rows.find(r=>r.value>=TARGET)?.date??null;const months=targetDate?Math.max(0,Math.round((targetDate.getFullYear()-today.getFullYear())*12+targetDate.getMonth()-today.getMonth())):null;const monthly=investments.reduce((a,i)=>a+(i.contribution_type==="Monthly"?Number(i.monthly_addition||0):0),0);const hasDriver=monthly>0||investments.some(i=>Number(i.expected_rate||0)>0)||investments.some(i=>i.expected_maturity_amount!=null);const status=current>=TARGET?"Already reached":targetDate?"Calculated from your entered data":hasDriver?"Not reached within 50 years":"Cannot calculate yet";
 if(loading)return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl py-24 text-center text-sm text-slate-500">Calculating your ₹70L path…</div></main>;
 if(!investments.length)return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><div className="mx-auto max-w-5xl"><a href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Back to Goal</a><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center"><Target className="mx-auto size-12 text-violet-600"/><h1 className="mt-4 text-2xl font-black">₹70L Goal Planner</h1><p className="mt-2 text-sm text-slate-500">Add investments first. The target date will then be calculated from your recorded amounts, contributions and entered rates.</p></div></div></main>;
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-7"><div className="mx-auto max-w-6xl"><div className="flex items-center justify-between gap-3"><a href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Goal</a><button type="button" onClick={()=>location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black"><RefreshCw size={15}/> Recalculate</button></div><header className="mt-5"><p className="text-xs font-black tracking-[.18em] text-violet-600">GOAL CONTROL CENTER</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">₹70 lakh Goal Planner</h1><p className="mt-2 text-sm text-slate-500">The target date is calculated month-by-month for up to 50 years using only your recorded investments, monthly contributions and entered return/maturity values.</p></header>
 <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Current value" value={money(current)}/><Kpi label="Progress" value={`${Math.min(100,current/TARGET*100).toFixed(1)}%`} sub={`${money(Math.max(0,TARGET-current))} remaining`}/><Kpi label="Target date" value={targetDate?fmt(targetDate):status} sub={months!==null?`${months} months from now`:status==="Not reached within 50 years"?"Beyond 50-year projection":"No valid date from current inputs"}/><Kpi label="Monthly contribution" value={money(monthly)} sub="Recorded investments only"/></div>
 <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-black">Path to ₹70L</h2><p className="mt-1 text-xs text-slate-500">The first projected month at or above ₹70L becomes the target date.</p></div><div className="rounded-2xl bg-violet-50 px-4 py-3"><p className="text-xs font-bold text-violet-700">Status</p><p className="mt-1 text-sm font-black text-violet-950">{status}</p></div></div><div className="mt-5"><Chart rows={rows}/></div></div>
 {!targetDate&&<div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><CircleAlert className="size-5 shrink-0 text-amber-700"/><div><p className="text-sm font-black text-amber-900">Target date is not available yet</p><p className="mt-1 text-xs leading-5 text-amber-800">{status==="Not reached within 50 years"?"Your current plan does not reach ₹70L within the 50-year calculation window.":status==="Cannot calculate yet"?"There is no positive monthly contribution, entered return rate, or known maturity amount that can create a future path to ₹70L.":"Some future inputs may be missing. No value is being guessed."}</p></div></div>}
 <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Calculation inputs</h2><div className="mt-4 divide-y divide-slate-100">{investments.map(i=><div key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-black">{i.name}</p><p className="mt-1 text-xs text-slate-500">{i.investment_type} · Principal {money(Number(i.principal_amount||0))} · {i.expected_rate?`${i.expected_rate}% ${i.rate_period.toLowerCase()}`:"No return entered"}</p></div><div className="text-right"><p className="text-sm font-black">{money(currentValue(i,today))}</p><p className="text-xs text-slate-500">{i.contribution_type==="Monthly"?`${money(Number(i.monthly_addition||0))}/month`:"No monthly contribution"}</p></div></div>)}</div></div>
 <p className="mt-5 text-center text-xs leading-5 text-slate-500">No salary, expense, or unrelated portfolio data is used to determine the ₹70L target date. Unknown future returns are never invented.</p></div></main>;
}
