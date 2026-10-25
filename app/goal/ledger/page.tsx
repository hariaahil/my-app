"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Plus, RotateCcw, Save, Trash2, Cloud } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Direction = "inflow" | "outflow";
type Entry = { id: string; availableIn: string; amount: string; policy: string; mode: string; interestRate: string; investedDate: string; note: string; recurrenceMonths?: string; customMonths?: string; direction?: Direction };
const normalizeRows = (items:Entry[]):Entry[] => items.map(r=>{
  if (r.recurrenceMonths === "custom") return {...r, customMonths:r.customMonths||"", direction:r.direction||"inflow"};
  const n=Number(r.recurrenceMonths)||0;
  const custom=n>0&&![1,3,6,12].includes(n);
  return {...r,recurrenceMonths:custom?"custom":String(n),customMonths:custom?String(n):(r.customMonths||""),direction:r.direction||"inflow"};
});
const STORAGE_KEY = "targetbud-finance-ledger-v2";
const initialRows: Entry[] = [
  {id:"1",availableIn:"Bank",amount:"98500",policy:"6.30 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:"From notebook; verify amount/balance"},
  {id:"2",availableIn:"Bank",amount:"95500",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"3",availableIn:"Bank",amount:"96500",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"4",availableIn:"Bank",amount:"18000",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"5",availableIn:"Bank",amount:"36300",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"6",availableIn:"Bank",amount:"18200",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"7",availableIn:"Bank",amount:"10300",policy:"6 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"8",availableIn:"Bank",amount:"1500",policy:"6.15 lakh",mode:"Deposit",interestRate:"",investedDate:"",note:""},
  {id:"9",availableIn:"Lended",amount:"50000",policy:"6.15 lakh",mode:"Savings",interestRate:"",investedDate:"",note:"Lent; verify"},
  {id:"10",availableIn:"Bank",amount:"25000",policy:"6.15 lakh",mode:"Savings",interestRate:"",investedDate:"",note:"Handwriting unclear; verify"},
  {id:"11",availableIn:"Bank",amount:"50000",policy:"6.15 lakh",mode:"Savings",interestRate:"",investedDate:"",note:""},
  {id:"12",availableIn:"Bank",amount:"37000",policy:"6.15 lakh",mode:"Savings",interestRate:"",investedDate:"",note:""},
  {id:"13",availableIn:"Bank",amount:"49000",policy:"6.15 lakh",mode:"Savings",interestRate:"",investedDate:"",note:""},
  {id:"14",availableIn:"Cash",amount:"10000",policy:"500",mode:"Cash",interestRate:"",investedDate:"",note:""},
  {id:"15",availableIn:"Cash",amount:"2800",policy:"200",mode:"Cash",interestRate:"",investedDate:"",note:""},
  {id:"16",availableIn:"Cash",amount:"5500",policy:"100",mode:"Cash",interestRate:"",investedDate:"",note:""},
  {id:"17",availableIn:"Bank",amount:"25000",policy:"",mode:"Savings",interestRate:"",investedDate:"",note:"Pending, as marked"},
  {id:"18",availableIn:"Cash",amount:"900",policy:"",mode:"Missing",interestRate:"",investedDate:"",note:"Description unclear"},
  {id:"19",availableIn:"Cash",amount:"500000",policy:"5 lakh",mode:"Cash",interestRate:"",investedDate:"",note:"Large entry; verify"},
  {id:"20",availableIn:"Lended",amount:"100000",policy:"From Excel",mode:"Savings",interestRate:"",investedDate:"",note:"Lent"},
  {id:"21",availableIn:"Lended",amount:"50000",policy:"In saving",mode:"Savings",interestRate:"",investedDate:"",note:"Lent"},
  {id:"22",availableIn:"Lended",amount:"50000",policy:"At Kabbadi",mode:"Savings",interestRate:"",investedDate:"",note:"Lent"},
  {id:"23",availableIn:"Lended",amount:"100000",policy:"At Kiran",mode:"Savings",interestRate:"",investedDate:"",note:"Lent"},
  {id:"24",availableIn:"Lended",amount:"500000",policy:"Gold loan",mode:"Savings",interestRate:"",investedDate:"",note:"Lent"},
  {id:"25",availableIn:"Lended",amount:"700000",policy:"Land",mode:"Lent",interestRate:"",investedDate:"",note:"Lent"},
  {id:"26",availableIn:"Bank",amount:"473713",policy:"Savings",mode:"Savings",interestRate:"",investedDate:"",note:""},
  {id:"27",availableIn:"Lended",amount:"50000",policy:"Land",mode:"",interestRate:"",investedDate:"",note:""},
  {id:"28",availableIn:"Lended",amount:"100000",policy:"Stock/other",mode:"",interestRate:"",investedDate:"",note:"Last row unclear"},
];

const money = (n:number) => "₹" + Math.round(n).toLocaleString("en-IN");
const parseAmount = (v:string) => Math.max(0, Number(v.replace(/[,₹\s]/g, "")) || 0);
const fmt = (v:string) => { const n=parseAmount(v); return n ? n.toLocaleString("en-IN") : v; };

export default function FinanceLedgerPage() {
  const [rows,setRows] = useState<Entry[]>(normalizeRows(initialRows));
  const [saved,setSaved] = useState(false);
  const [hydrated,setHydrated] = useState(false);
  const [userId,setUserId] = useState<string|null>(null);
  const [dbReady,setDbReady] = useState(false);
  const [dbMessage,setDbMessage] = useState("Connecting to database…");
  useEffect(()=>{
    let active=true;
    async function load(){
      try {
        const supabase=createClient();
        const auth=await supabase.auth.getUser();
        if(auth.error) throw auth.error;
        if(!auth.data.user){
          if(active) setDbMessage("Please log in to save records to the database.");
          return;
        }
        const uid=auth.data.user.id;
        if(active) setUserId(uid);
        const result=await supabase.from("finance_ledger_entries").select("id,available_in,amount,reference,interest_rate,invested_date,note,sort_order,recurrence_months,direction").eq("user_id",uid).order("sort_order");
        if(result.error) throw result.error;
        let loaded:Entry[]=(result.data||[]).map((r:any)=>({id:String(r.id),availableIn:r.available_in,amount:String(r.amount||""),policy:String(r.reference||""),mode:"",interestRate:String(r.interest_rate||""),investedDate:String(r.invested_date||""),note:String(r.note||""),recurrenceMonths:String(r.recurrence_months||0),direction:(r.direction||"inflow") as Direction}));
        if(!loaded.length){
          let local:Entry[]=[];
          try {
            const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem("targetbud-finance-ledger-v1");
            if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))local=parsed.map((r:any)=>({id:String(r.id||Date.now()),availableIn:r.availableIn||"Bank",amount:String(r.amount||""),policy:String(r.policy||""),mode:String(r.mode||""),interestRate:String(r.interestRate||""),investedDate:String(r.investedDate||""),note:String(r.note||""),recurrenceMonths:String(r.recurrenceMonths??"0"),customMonths:String(r.customMonths||""),direction:(r.direction||"inflow") as Direction}));}
          } catch {}
          loaded=local.length?local:initialRows;
          const seed=await supabase.from("finance_ledger_entries").upsert(loaded.map((r,i)=>({user_id:uid,id:r.id,available_in:r.availableIn,amount:r.amount,reference:r.policy,interest_rate:r.interestRate,invested_date:r.investedDate||null,note:r.note,sort_order:i,recurrence_months:(r.recurrenceMonths==="custom"?Number(r.customMonths)||0:Number(r.recurrenceMonths)||0),direction:r.direction})),{onConflict:"user_id,id"});
          if(seed.error) throw seed.error;
        }
        if(active){setRows(normalizeRows(loaded));setDbReady(true);setSaved(true);setDbMessage("Connected · saved to database");}
      } catch(error:any) {
        if(active) setDbMessage("Database error: "+(error?.message||"connection failed"));
      } finally {
        if(active) setHydrated(true);
      }
    }
    load();
    return ()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!hydrated||!userId||!dbReady) return;
    const timer=window.setTimeout(async()=>{
      try{
        const supabase=createClient();
        const payload=rows.map((r,i)=>({user_id:userId,id:r.id,available_in:r.availableIn,amount:r.amount,reference:r.policy,interest_rate:r.interestRate,invested_date:r.investedDate||null,note:r.note,sort_order:i,recurrence_months:(r.recurrenceMonths==="custom"?Number(r.customMonths)||0:Number(r.recurrenceMonths)||0),direction:r.direction,updated_at:new Date().toISOString()}));
        if(payload.length){
          const result=await supabase.from("finance_ledger_entries").upsert(payload,{onConflict:"user_id,id"});
          if(result.error) throw result.error;
        }
        localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
        setSaved(true);setDbMessage("All changes saved to database");
      }catch(error:any){setSaved(false);setDbMessage("Save failed: "+(error?.message||"please try again"));}
    },600);
    return ()=>window.clearTimeout(timer);
  },[rows,hydrated,userId,dbReady]);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const intervalFor = (r: Entry) => r.recurrenceMonths === "custom" ? Math.max(0, Math.floor(Number(r.customMonths) || 0)) : Math.max(0, Math.floor(Number(r.recurrenceMonths) || 0));
  const invalidCustom = (r: Entry) => r.recurrenceMonths === "custom" && intervalFor(r) < 1;
  const startDateFor = (r: Entry) => r.investedDate ? new Date(r.investedDate + "T00:00:00") : currentMonth;
  const startMonthFor = (r: Entry) => { const d=startDateFor(r); return new Date(d.getFullYear(),d.getMonth(),1); };
  const monthOffset = (r: Entry, d: Date) => { const s=startMonthFor(r); return (d.getFullYear()-s.getFullYear())*12+d.getMonth()-s.getMonth(); };
  const annualRate = (r: Entry) => Math.max(0,Number(r.interestRate)||0)/100;
  const balanceToDate = (r: Entry) => {
    const amount=parseAmount(r.amount), interval=intervalFor(r), start=startDateFor(r);
    if(!amount||invalidCustom(r)||Number.isNaN(start.getTime())||start>today)return 0;
    let balance=0;
    const mr=annualRate(r)/12, elapsed=Math.max(0,monthOffset(r,currentMonth));
    if(interval===0){
      balance=r.direction==="outflow"?-amount:amount;
      if(r.direction==="outflow")return balance;
      for(let n=1;n<=elapsed;n++)balance*=1+mr;
      return balance;
    }
    for(let n=0;n<=elapsed;n++){
      if(n%interval===0)balance += r.direction==="outflow" ? -amount : amount;
      if(balance>0)balance*=1+mr;
    }
    return balance;
  };
  const interestFor = (r: Entry) => {
    if(r.direction==="outflow"||invalidCustom(r)||!parseAmount(r.amount)||annualRate(r)<=0)return 0;
    const interval=intervalFor(r), elapsed=Math.max(0,monthOffset(r,currentMonth)); const count=interval===0?1:Math.floor(elapsed/interval)+1; const principal=parseAmount(r.amount)*count;
    return Math.max(0,balanceToDate(r)-principal);
  };
  const totalInterest=rows.reduce((sum,r)=>sum+interestFor(r),0);
  const forecastValue=(months:number)=>rows.reduce((sum,r)=>{
    const amount=parseAmount(r.amount),interval=intervalFor(r);
    if(!amount||invalidCustom(r))return sum;
    let balance=balanceToDate(r);
    const mr=annualRate(r)/12;
    for(let step=1;step<=months;step++){
      const d=new Date(today.getFullYear(),today.getMonth()+step,1);
      if(interval>0){
        const offset=monthOffset(r,d);
        if(offset>=0&&offset%interval===0)balance += r.direction==="outflow" ? -amount : amount;
      }
      if(r.direction!=="outflow"&&balance>0)balance*=1+mr;
    }
    return sum+balance;
  },0);
  const monthlyForecast=Array.from({length:12},(_,i)=>({period:i+1,value:forecastValue(i+1)}));
  const yearlyForecast=Array.from({length:12},(_,i)=>({period:i+1,value:forecastValue((i+1)*12)}));
  let runningTotal=0;
  const running=rows.map(r=>{runningTotal+=balanceToDate(r);return runningTotal;});
  const total=rows.reduce((sum,r)=>sum+balanceToDate(r),0);
  const update = (id:string,key:keyof Entry,value:string)=>{setRows(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));setSaved(false)};
  const add = ()=>{setRows(old=>[...old,{id:Date.now().toString(),availableIn:"Bank",amount:"",policy:"",mode:"",interestRate:"",investedDate:"",note:"",recurrenceMonths:"0",customMonths:"",direction:"inflow"}]);setSaved(false)};
  const save = async ()=>{if(!userId){setDbMessage("Please log in to save to the database.");return;}try{const payload=rows.map((r,i)=>({user_id:userId,id:r.id,available_in:r.availableIn,amount:r.amount,reference:r.policy,interest_rate:r.interestRate,invested_date:r.investedDate||null,note:r.note,sort_order:i,recurrence_months:(r.recurrenceMonths==="custom"?Number(r.customMonths)||0:Number(r.recurrenceMonths)||0),direction:r.direction}));if(payload.length){const result=await createClient().from("finance_ledger_entries").upsert(payload,{onConflict:"user_id,id"});if(result.error)throw result.error;}localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));setSaved(true);setDbMessage("All changes saved to database");}catch(error:any){setSaved(false);setDbMessage("Save failed: "+(error?.message||"please try again"));}};
  const reset = async ()=>{if(!confirm("Reset this ledger to the initial transcription? This replaces your saved database records."))return;try{if(userId){const result=await createClient().from("finance_ledger_entries").delete().eq("user_id",userId);if(result.error)throw result.error;}setRows(normalizeRows(initialRows));localStorage.removeItem(STORAGE_KEY);localStorage.removeItem("targetbud-finance-ledger-v1");setSaved(false);setDbMessage("Resetting ledger…");}catch(error:any){setDbMessage("Reset failed: "+(error?.message||"please try again"));}};
  const download = ()=>{const head=["Available In","Amount (INR)","Reference","Interest Rate (% p.a.)","Invested Date","Repeat every (months)","Direction","Interest Earned (INR, estimated monthly compounding)","Running Total (INR)","Notes"];const csv=[head,...rows.map((r,i)=>[r.availableIn,r.amount,r.policy,r.interestRate,r.investedDate,r.recurrenceMonths==="custom"?r.customMonths:r.recurrenceMonths,r.direction,String(interestFor(r).toFixed(2)),String(running[i]),r.note])].map(line=>line.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="targetbud-finance-ledger.csv";a.click();URL.revokeObjectURL(url)};
  return <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-black/55 hover:text-black"><ArrowLeft size={16}/> Finance overview</Link>
      <header className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-black/45">Finance · Records</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Deposit & lending ledger</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">A digital version of your notebook table. Edit the transcription, add rows, changes save to your account database automatically, or export to CSV.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Add row</button><button onClick={save} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Cloud size={16}/>{saved?"Saved to DB":"Save to database"}</button><button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Download size={16}/> Export CSV</button></div>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Rows</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Sum of entered amounts</p><p className="mt-1 text-2xl font-black">{money(total)}</p><p className="mt-2 text-xs text-black/50">Estimated interest: {money(totalInterest)}</p></div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">Transcription note</p><p className="mt-1 text-sm leading-5 text-amber-900">Some handwriting is unclear. Verify every amount and category before relying on totals.</p></div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3"><div><h2 className="font-black">Ledger table</h2><p className="text-xs text-black/45">{dbMessage} · {!userId && <Link href="/login" className="font-bold underline">Log in</Link>} · The existing Invested date is used as the recurrence start date. Choose a repeat interval in months; Custom lets you enter any number of months.</p></div><button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black/50 hover:bg-black/5"><RotateCcw size={14}/> Reset transcription</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1850px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f1ee] text-xs uppercase tracking-wider text-black/55"><tr>{["Available In","Monthly amount / principal (₹)","Reference","Interest rate (% p.a.)","Invested date","Repeat every (months)","Direction","Interest earned to date","Balance to date","Notes",""].map(h=><th key={h} className="border-b border-black/10 px-3 py-3 font-black">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id} className="border-b border-black/[.06] last:border-0 hover:bg-black/[.015]">
            <td className="px-2 py-2"><select aria-label="Available in" value={r.availableIn} onChange={e=>update(r.id,"availableIn",e.target.value)} className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white">{["Bank","Cash","Lended"].map(x=><option key={x}>{x}</option>)}</select></td>
            <td className="px-2 py-2"><input aria-label="Amount in rupees" inputMode="decimal" value={r.amount} onChange={e=>update(r.id,"amount",e.target.value)} placeholder="0" className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 text-right font-semibold tabular-nums outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Reference" value={r.policy} onChange={e=>update(r.id,"policy",e.target.value)} placeholder="Where the money came from / description" className="w-48 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Interest rate percentage per annum" type="number" min="0" step="0.01" value={r.interestRate} onChange={e=>update(r.id,"interestRate",e.target.value)} placeholder="e.g. 7.5" className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Invested date" type="date" value={r.investedDate} onChange={e=>update(r.id,"investedDate",e.target.value)} className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><select aria-label="Repeat interval in months" value={r.recurrenceMonths||"0"} onChange={e=>{const value=e.target.value;setRows(old=>old.map(x=>x.id===r.id?{...x,recurrenceMonths:value,customMonths:value==="custom"?(x.customMonths||"1"):x.customMonths}:x));setSaved(false)}} className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"><option value="0">One-time</option><option value="1">Every 1 month</option><option value="3">Every 3 months</option><option value="6">Every 6 months</option><option value="12">Every 12 months</option><option value="custom">Custom…</option></select>{r.recurrenceMonths==="custom"&&<input aria-label="Custom recurrence months" type="number" min="1" max="1200" value={r.customMonths||""} onChange={e=>{setRows(old=>old.map(x=>x.id===r.id?{...x,customMonths:String(Math.max(1,Math.floor(Number(e.target.value)||1)))}:x));setSaved(false)}} placeholder="Months" className="mt-1 w-24 rounded-lg border border-black/15 px-2 py-1"/>}</td>
            <td className="px-2 py-2"><select aria-label="Cash flow direction" value={r.direction||"inflow"} onChange={e=>update(r.id,"direction",e.target.value as Direction)} className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"><option value="inflow">Add money</option><option value="outflow">Withdraw</option></select></td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">{money(interestFor(r))}</td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">{money(running[i])}</td>
            <td className="px-2 py-2"><input aria-label="Notes" value={r.note} onChange={e=>update(r.id,"note",e.target.value)} placeholder="Notes" className="w-40 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><button aria-label="Delete row" onClick={async()=>{setRows(old=>old.filter(x=>x.id!==r.id));setSaved(false);if(userId){const result=await createClient().from("finance_ledger_entries").delete().eq("user_id",userId).eq("id",r.id);if(result.error)setDbMessage("Delete failed: "+result.error.message);else setDbMessage("Record deleted from database");}}} className="grid size-8 place-items-center rounded-lg text-black/35 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button></td>
          </tr>)}</tbody>
          <tfoot className="bg-[#f7f7f5]"><tr><td colSpan={7} className="px-4 py-4 font-black">Total current balance</td><td className="px-3 py-4 text-right text-base font-black tabular-nums">{money(totalInterest)}</td><td className="px-3 py-4 text-right text-base font-black tabular-nums">{money(total)}</td><td className="px-3 py-4 text-xs text-black/45">Estimated interest; verify rates and dates.</td><td></td></tr></tfoot>
        </table></div>
      </div>
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[.16em] text-black/45">Projection A</p>
            <h2 className="mt-1 text-xl font-black">Next 12 months</h2>
            <p className="mt-1 text-xs text-black/50">Estimated ledger value month by month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f1ee] text-left text-xs uppercase text-black/50"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3 text-right">Forecast value</th><th className="px-4 py-3 text-right">Growth from today</th></tr></thead>
              <tbody>{monthlyForecast.map(item=><tr key={item.period} className="border-t border-black/[.06]"><td className="px-4 py-3 font-semibold">Month {item.period}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{money(item.value)}</td><td className="px-4 py-3 text-right tabular-nums">{money(item.value-(total+totalInterest))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[.16em] text-black/45">Projection B</p>
            <h2 className="mt-1 text-xl font-black">Next 12 years</h2>
            <p className="mt-1 text-xs text-black/50">Estimated ledger value year by year</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f1ee] text-left text-xs uppercase text-black/50"><tr><th className="px-4 py-3">Year</th><th className="px-4 py-3 text-right">Forecast value</th><th className="px-4 py-3 text-right">Growth from today</th></tr></thead>
              <tbody>{yearlyForecast.map(item=><tr key={item.period} className="border-t border-black/[.06]"><td className="px-4 py-3 font-semibold">Year {item.period}</td><td className="px-4 py-3 text-right font-bold tabular-nums">{money(item.value)}</td><td className="px-4 py-3 text-right tabular-nums">{money(item.value-(total+totalInterest))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
      <p className="mt-3 text-xs leading-5 text-black/45">Forecast assumptions: Interest compounds monthly at the annual rate divided by 12. One-time rows are counted once; recurring deposits or withdrawals occur on each scheduled month from the Invested date (or current month if no date is set). Withdrawals reduce the total ledger balance and do not earn interest themselves. Each row is calculated independently, so a withdrawal does not change interest on a separate deposit row. Taxes, fees, and rate changes are excluded.</p>
      <p className="mt-4 text-xs leading-5 text-black/45">Interest earned is estimated using monthly compounding (annual rate divided by 12). Actual bank interest may differ based on deposit timing, balance rules, taxes, fees, and rate changes. Privacy: ledger records are stored in your signed-in Supabase account with row-level access controls. The initial rows are a best-effort transcription from your photo, not a verified accounting record.</p>
    </div>
  </main>;
}
