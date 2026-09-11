"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, CircleAlert, LineChart as LineIcon, RefreshCw, Target, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Investment={id:string;name:string;investment_type:string;principal_amount:number;expected_rate:number;rate_period:"Monthly"|"Yearly";invested_on:string;maturity_on:string|null;compounding:string;monthly_addition:number;current_value:number|null;contribution_type:"Monthly"|"On maturity";expected_maturity_amount:number|null;funding_source:string|null;funding_activity_id:string|null};
type Activity={id:string;flow_type:"income"|"expense";amount:number;flow_date:string;recurrence:string;recurrence_end:string|null;category:string|null;source:string|null};
type Event={date:Date;investment:Investment;amount:number;kind:"maturity"|"contribution";note:string};
type MonthRow={date:Date;value:number;principal:number;contributions:number;growth:number;events:Event[]};

const TARGET=7000000;
const money=(n:number)=>`₹${Math.round(Math.max(0,n)).toLocaleString("en-IN")}`;
const shortMoney=(n:number)=>n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${Math.round(n/1000)}K`:money(n);
const dateOnly=(s:string)=>new Date(`${s}T00:00:00`);
const addMonths=(d:Date,n:number)=>{const x=new Date(d),day=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);x.setDate(Math.min(day,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));return x};
const monthLabel=(d:Date)=>d.toLocaleDateString("en-IN",{month:"short",year:"numeric"});
const fullDate=(d:Date)=>d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
const daysInMonth=(d:Date)=>new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
const daysInYear=(d:Date)=>new Date(d.getFullYear()+1,0,0).getDate();
const recurrenceMonthly=(a:Activity)=>{const n=Number(a.amount||0);return a.recurrence==="Weekly"?n*52/12:a.recurrence==="Yearly"?n/12:n};

function ratePerMonth(i:Investment,d:Date){const r=Number(i.expected_rate||0)/100;if(r<=0)return 0;if(i.rate_period==="Monthly")return r;return Math.pow(1+r,1/12)-1}
function contributesOn(i:Investment,d:Date,start:Date){if(i.contribution_type!=="Monthly")return false;if(d<=start)return false;if(i.maturity_on&&d>dateOnly(i.maturity_on))return false;return d.getDate()===Math.min(start.getDate(),daysInMonth(d))}

function currentInvestmentValue(i:Investment,today:Date){
  const start=dateOnly(i.invested_on); const maturity=i.maturity_on?dateOnly(i.maturity_on):null;
  if(start>today)return 0;
  if(maturity&&maturity<today&&i.current_value!=null)return Number(i.current_value);
  let value=Number(i.principal_amount||0), contribution=0, cursor=new Date(start);
  while(cursor<today){
    const nextDay=new Date(cursor);nextDay.setDate(nextDay.getDate()+1);
    const monthlyRate=ratePerMonth(i,cursor);
    if(monthlyRate>0)value+=value*monthlyRate/daysInMonth(cursor);
    if(i.contribution_type==="Monthly"&&contributesOn(i,nextDay,start)){value+=Number(i.monthly_addition||0);contribution+=Number(i.monthly_addition||0)}
    cursor=nextDay;
  }
  return value;
}

function project(investments:Investment[],today:Date,horizon=240):MonthRow[]{
  type State={i:Investment;value:number;principal:number;contributions:number;growth:number;matured:boolean};
  const states:State[]=investments.map(i=>({i,value:currentInvestmentValue(i,today),principal:Number(i.principal_amount||0),contributions:0,growth:0,matured:!!(i.maturity_on&&dateOnly(i.maturity_on)<=today)}));
  const out:MonthRow[]=[];
  for(let n=0;n<=horizon;n++){
    const d=addMonths(today,n),events:Event[]=[];
    if(n>0){
      states.forEach(s=>{
        const mat=s.i.maturity_on?dateOnly(s.i.maturity_on):null;
        if(!s.matured){
          if(mat&&d>=mat){
            if(s.i.expected_maturity_amount!=null){const before=s.value;s.value=Number(s.i.expected_maturity_amount);s.growth+=Math.max(0,s.value-before);events.push({date:mat,investment:s.i,amount:s.value-before,kind:"maturity",note:`Known maturity amount ${money(s.value)}`})}
            else if(ratePerMonth(s.i,d)>0){const months=Math.max(0,Math.round((mat.getFullYear()-today.getFullYear())*12+mat.getMonth()-today.getMonth()));for(let k=0;k<months;k++){const rr=ratePerMonth(s.i,addMonths(today,k));const before=s.value;s.value*=1+rr;s.growth+=s.value-before;if(s.i.contribution_type==="Monthly"){s.value+=Number(s.i.monthly_addition||0);s.contributions+=Number(s.i.monthly_addition||0)}}events.push({date:mat,investment:s.i,amount:Math.max(0,s.value),kind:"maturity",note:`Calculated from entered rate`})}
            else events.push({date:mat,investment:s.i,amount:0,kind:"maturity",note:"Maturity amount not entered"});
            s.matured=true;
          } else {
            const rr=ratePerMonth(s.i,d); if(rr>0){const before=s.value;s.value*=1+rr;s.growth+=s.value-before}
            if(s.i.contribution_type==="Monthly"){const before=s.value;s.value+=Number(s.i.monthly_addition||0);s.contributions+=Number(s.i.monthly_addition||0);if(Number(s.i.monthly_addition||0)>0)events.push({date:d,investment:s.i,amount:s.value-before,kind:"contribution",note:"Monthly contribution"})}
          }
        }
      });
    }
    const value=states.reduce((s,x)=>s+x.value,0);
    const principal=states.reduce((s,x)=>s+x.principal,0);
    const contributions=states.reduce((s,x)=>s+x.contributions,0);
    const growth=Math.max(0,value-principal-contributions);
    out.push({date:d,value,principal,contributions,growth,events});
    if(value>=TARGET)break;
  }
  return out;
}

function projectScenario(investments:Investment[],today:Date,extraMonthly:number,reinvestMaturities:boolean){
  const cloned=investments.map(i=>({...i,monthly_addition:i.contribution_type==="Monthly"?Number(i.monthly_addition||0)+extraMonthly:Number(i.monthly_addition||0)}));
  const rows=project(cloned,today,240);
  if(!reinvestMaturities)return rows;
  // Reinvestment is intentionally a scenario only; base records are never changed.
  return rows;
}

function Sparkline({rows}:{rows:MonthRow[]}){const W=1100,H=360,L=58,R=24,T=24,B=52;const max=Math.max(TARGET,...rows.map(r=>r.value),1),pw=W-L-R,ph=H-T-B;const pts=rows.map((r,i)=>({x:L+(rows.length===1?pw/2:i/(rows.length-1)*pw),y:T+ph-(r.value/max)*ph}));const path=pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");const targetY=T+ph-(TARGET/max)*ph;const spikes=rows.flatMap((r,idx)=>r.events.filter(e=>e.kind==="maturity"&&e.amount>0).map(e=>({r,idx,e})));return <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5"><svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px] w-full" role="img" aria-label="Month by month ₹70 lakh goal projection">{[0,.25,.5,.75,1].map((q,i)=><g key={i}><line x1={L} x2={W-R} y1={T+ph*(1-q)} y2={T+ph*(1-q)} stroke="#e2e8f0"/><text x={L-10} y={T+ph*(1-q)+4} textAnchor="end" fontSize="12" fill="#64748b">{shortMoney(max*q)}</text></g>)}<line x1={L} x2={W-R} y1={targetY} y2={targetY} stroke="#7c3aed" strokeWidth="2" strokeDasharray="8 7"/><text x={W-R} y={targetY-8} textAnchor="end" fontSize="12" fontWeight="800" fill="#7c3aed">₹70L target</text><path d={path} fill="none" stroke="#0f766e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>{spikes.map(({r,e},i)=>{const x=L+(rows.indexOf(r)/(rows.length-1))*pw,y=T+ph-(r.value/max)*ph;return <g key={`${e.investment.id}-${i}`}><line x1={x} x2={x} y1={y-24} y2={y+12} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4"/><circle cx={x} cy={y} r="7" fill="#f59e0b" stroke="white" strokeWidth="3"/><text x={x} y={y-30} textAnchor="middle" fontSize="11" fontWeight="800" fill="#92400e">{e.investment.name}</text></g>})}<text x={L} y={H-16} fontSize="12" fill="#64748b">{monthLabel(rows[0].date)}</text><text x={W-R} y={H-16} textAnchor="end" fontSize="12" fill="#64748b">{monthLabel(rows[rows.length-1].date)}</text></svg></div>}

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-3xl border border-slate-200 bg-white ${className}`}>{children}</div>}
function Kpi({label,value,sub}:{label:string;value:string;sub?:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black tracking-tight text-slate-950">{value}</p>{sub&&<p className="mt-1 text-xs text-slate-500">{sub}</p>}</div>}

export default function GoalInsightsPage(){
 const [investments,setInvestments]=useState<Investment[]>([]); const [activities,setActivities]=useState<Activity[]>([]); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState<Event|null>(null); const [extra,setExtra]=useState(0);
 const today=new Date();
 useEffect(()=>{let dead=false;(async()=>{setLoading(true);const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){if(!dead)setLoading(false);return}const [{data:inv},{data:act}]=await Promise.all([s.from("goal_investments").select("*").eq("user_id",user.id).order("invested_on",{ascending:true}),s.from("cash_flows").select("*").eq("user_id",user.id).eq("is_recurring",true).order("flow_date",{ascending:true})]);if(!dead){setInvestments((inv??[])as Investment[]);setActivities((act??[])as Activity[]);setLoading(false)}})();return()=>{dead=true}},[]);
 const rows=useMemo(()=>project(investments,today,240),[investments,today.toDateString()]);
 const current=rows[0]?.value??0; const currentGrowth=Math.max(0,current-investments.reduce((s,i)=>s+Number(i.principal_amount||0),0));
 const targetRow=rows.find(r=>r.value>=TARGET); const targetDate=targetRow?.date??null;
 const totalMonthly=investments.reduce((s,i)=>s+(i.contribution_type==="Monthly"?Number(i.monthly_addition||0):0),0);
 const events=useMemo(()=>rows.flatMap(r=>r.events.filter(e=>e.kind==="maturity")),[rows]);
 const unknownMaturities=events.filter(e=>e.amount===0);
 const scenarioRows=useMemo(()=>projectScenario(investments,today,extra,false),[investments,today.toDateString(),extra]); const scenarioDate=scenarioRows.find(r=>r.value>=TARGET)?.date??null;
 const salary=activities.filter(a=>a.flow_type==="income"&&a.category==="Salary").reduce((s,a)=>s+recurrenceMonthly(a),0); const recurringExpenses=activities.filter(a=>a.flow_type==="expense").reduce((s,a)=>s+recurrenceMonthly(a),0);
 if(loading)return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl py-24 text-center text-sm text-slate-500">Building your goal projection…</div></main>;
 if(!investments.length)return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><div className="mx-auto max-w-5xl"><a href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Back to Goal</a><Card className="mt-8 p-8 text-center"><Target className="mx-auto size-12 text-violet-600"/><h1 className="mt-4 text-2xl font-black">Your ₹70L Goal Planner</h1><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Add your investments first. The planner will then calculate the month-by-month path, maturity events and target date from your recorded data.</p><a href="/goal" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Add investments</a></Card></div></main>;
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-7"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-3"><a href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17}/> Goal</a><button type="button" onClick={()=>location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black"><RefreshCw size={15}/> Recalculate</button></div><header className="mt-5"><p className="text-xs font-black tracking-[.18em] text-violet-600">GOAL CONTROL CENTER</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">₹70 lakh Goal Planner</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">A month-by-month projection from your recorded investments, contributions and known maturity information. No unknown return is invented.</p></header>
 <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Current portfolio" value={money(current)}/><Kpi label="Progress" value={`${Math.min(100,current/TARGET*100).toFixed(1)}%`} sub={`${money(Math.max(0,TARGET-current))} remaining`}/><Kpi label="Target date" value={targetDate?fullDate(targetDate):"Not calculable"} sub={targetDate?`${Math.max(0,Math.round((targetDate.getTime()-today.getTime())/(30.44*86400000)))} months from now`:"Insufficient future data"}/><Kpi label="Monthly contributions" value={money(totalMonthly)} sub="From recorded investments"/></div>
 <Card className="mt-5 overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div><div className="flex items-center gap-2"><LineIcon size={18} className="text-violet-600"/><h2 className="text-lg font-black">Month-by-month path to ₹70L</h2></div><p className="mt-1 text-xs text-slate-500">Orange markers are future maturity events. The line includes recurring contributions and entered return rates.</p></div><div className="text-right"><p className="text-xs font-bold text-slate-500">Current growth above principal</p><p className="text-lg font-black">{money(currentGrowth)}</p></div></div><div className="p-4 sm:p-6"><Sparkline rows={rows}/><div className="mt-4 flex flex-wrap gap-3 text-xs font-bold"><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-teal-700"/>Projected portfolio</span><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-amber-500"/>Maturity spike</span><span className="inline-flex items-center gap-2"><i className="h-0.5 w-5 bg-violet-600"/>₹70L target</span></div></div></Card>
 <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Card><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black">Future money events</h2><p className="mt-1 text-xs text-slate-500">These are the events that can materially change the path.</p></div><div className="divide-y divide-slate-100">{events.length?events.map((e,i)=><button type="button" key={`${e.investment.id}-${i}`} onClick={()=>setSelected(e)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"><div className="min-w-0"><p className="text-sm font-black text-slate-900">{e.investment.name}</p><p className="mt-1 text-xs text-slate-500">{fullDate(e.date)} · {e.investment.investment_type}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black">{e.amount?`+${money(e.amount)}`:"Amount missing"}</p><p className="mt-1 text-[11px] font-bold text-amber-700">Maturity</p></div></button>):<div className="p-6 text-sm text-slate-500">No future maturity dates are recorded.</div>}</div></Card>
 <Card><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black">How can you reach it sooner?</h2><p className="mt-1 text-xs text-slate-500">Scenario only. Your saved plan is not changed.</p></div><div className="p-5"><label className="text-xs font-black text-slate-600">Extra monthly contribution</label><select value={extra} onChange={e=>setExtra(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold"><option value={0}>₹0 extra</option><option value={2000}>₹2,000 extra</option><option value={5000}>₹5,000 extra</option><option value={10000}>₹10,000 extra</option><option value={20000}>₹20,000 extra</option></select><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Scenario target date</p><p className="mt-1 text-2xl font-black">{scenarioDate?fullDate(scenarioDate):"Not calculable"}</p>{targetDate&&scenarioDate&&<p className="mt-1 text-xs font-bold text-emerald-700">{scenarioDate<targetDate?`${Math.max(0,Math.round((targetDate.getTime()-scenarioDate.getTime())/(30.44*86400000)))} months earlier`:"No earlier date from this change"}</p>}</div></div></Card></div>
 <Card className="mt-5"><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black">Projection assumptions & data quality</h2></div><div className="grid gap-3 p-5 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">Known maturity amounts</p><p className="mt-1 text-lg font-black">{money(events.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0))}</p><p className="mt-1 text-xs text-slate-500">Explicitly entered or calculated from an entered rate.</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">Maturities needing data</p><p className="mt-1 text-lg font-black">{unknownMaturities.length}</p><p className="mt-1 text-xs text-slate-500">Chit/other maturity amounts are not guessed.</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">Salary capacity</p><p className="mt-1 text-lg font-black">{money(Math.max(0,salary-recurringExpenses-totalMonthly))}</p><p className="mt-1 text-xs text-slate-500">Salary − recurring expenses − recorded monthly investments.</p></div></div>{unknownMaturities.length>0&&<div className="mx-5 mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-700"/><div><p className="text-sm font-black text-amber-900">Some future events cannot be valued accurately</p><p className="mt-1 text-xs leading-5 text-amber-800">{unknownMaturities.map(e=>e.investment.name).join(", ")} has a maturity date but no maturity amount or usable rate. Add the expected maturity amount to remove the unknown.</p></div></div>}</Card>
 <Card className="mt-5"><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-black">Investment calculation detail</h2><p className="mt-1 text-xs text-slate-500">Tap an investment to see exactly what the projection knows about it.</p></div><div className="divide-y divide-slate-100">{investments.map(i=>{const v=currentInvestmentValue(i,today);const mat=i.maturity_on?dateOnly(i.maturity_on):null;return <details key={i.id} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm font-black">{i.name}</p><p className="mt-1 text-xs text-slate-500">{i.investment_type} · {i.expected_rate?`${i.expected_rate}% ${i.rate_period.toLowerCase()}`:"No return assumption"}</p></div><div className="flex items-center gap-3"><b className="text-sm">{money(v)}</b><ChevronDown size={17} className="text-slate-400 transition-transform group-open:rotate-180"/></div></summary><div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-4"><Kpi label="Principal" value={money(Number(i.principal_amount||0))}/><Kpi label="Monthly" value={i.contribution_type==="Monthly"?money(Number(i.monthly_addition||0)):"—"}/><Kpi label="Maturity" value={mat?fullDate(mat):"No date"}/><Kpi label="Maturity amount" value={i.expected_maturity_amount!=null?money(Number(i.expected_maturity_amount)):"Not entered"}/></div></details>})}</div></Card>
 <p className="mt-5 text-center text-xs leading-5 text-slate-500">Projection rule: known values and entered rates are calculated; unknown future returns are not invented. Maturity proceeds are held as portfolio value after maturity unless you create a different saved investment plan.</p>
 {selected&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-5" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[.16em] text-amber-600">MATURITY EVENT</p><h3 className="mt-1 text-2xl font-black">{selected.investment.name}</h3></div><button type="button" onClick={()=>setSelected(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Kpi label="Date" value={fullDate(selected.date)}/><Kpi label="Portfolio impact" value={selected.amount?`+${money(selected.amount)}`:"Unknown"}/><Kpi label="Type" value={selected.investment.investment_type}/><Kpi label="Maturity amount" value={selected.investment.expected_maturity_amount!=null?money(Number(selected.investment.expected_maturity_amount)):selected.amount?money(selected.amount):"Not entered"}/></div><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black">What to manage</p><p className="mt-1 text-xs leading-5 text-slate-600">This event is shown separately so you can decide whether the maturity proceeds should be reinvested, kept liquid, or assigned to another goal. The base projection does not assume a reinvestment you did not record.</p></div></div></div>}
 </div></main>;
}
