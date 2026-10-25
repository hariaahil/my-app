"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

type Entry = { id: string; availableIn: string; amount: string; policy: string; mode: string; interestRate: string; investedDate: string; note: string };
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
  const [rows,setRows] = useState<Entry[]>(initialRows);
  const [saved,setSaved] = useState(false);
  useEffect(()=>{ try { const raw=localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("targetbud-finance-ledger-v1"); if(raw){ const parsed=JSON.parse(raw); if(Array.isArray(parsed)) setRows(parsed.map((r:any)=>({id:String(r.id ?? Date.now()),availableIn:r.availableIn ?? (String(r.name ?? "").toLowerCase().includes("lent") ? "Lended" : (String(r.mode ?? "").toLowerCase()==="cash" || String(r.name ?? "").toLowerCase()==="cash" ? "Cash" : "Bank")),amount:String(r.amount ?? ""),policy:String(r.policy ?? ""),mode:String(r.mode ?? ""),interestRate:String(r.interestRate ?? ""),investedDate:String(r.investedDate ?? ""),note:String(r.note ?? "")}))); } } catch {} },[]);
  const today = new Date();
  const interestFor = (r: Entry) => {
    const principal = parseAmount(r.amount);
    const rate = Math.max(0, Number(r.interestRate) || 0);
    if (!r.investedDate || !principal || !rate) return 0;
    const start = new Date(r.investedDate + "T00:00:00");
    if (Number.isNaN(start.getTime()) || start > today) return 0;
    const days = Math.max(0, Math.floor((new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime()-start.getTime())/86400000));
    return principal * (rate/100) * (days/365);
  };
  const totalInterest = rows.reduce((sum,r)=>sum+interestFor(r),0);
  const running = useMemo(()=>{let total=0; return rows.map(r=>{ total+=parseAmount(r.amount); return total; });},[rows]);
  const total = rows.reduce((s,r)=>s+parseAmount(r.amount),0);
  const update = (id:string,key:keyof Entry,value:string)=>{setRows(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));setSaved(false)};
  const add = ()=>{setRows(old=>[...old,{id:Date.now().toString(),availableIn:"Bank",amount:"",policy:"",mode:"",interestRate:"",investedDate:"",note:""}]);setSaved(false)};
  const save = ()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));setSaved(true)};
  const reset = ()=>{if(confirm("Reset this ledger to the initial transcription? This replaces your saved local copy.")){setRows(initialRows);localStorage.removeItem(STORAGE_KEY);setSaved(false)}};
  const download = ()=>{const head=["Available In","Amount (INR)","Policy No. / Reference","Mode","Interest Rate (% p.a.)","Invested Date","Interest Earned (INR, simple annual)","Notes","Running Total (INR)"];const csv=[head,...rows.map((r,i)=>[r.availableIn,r.amount,r.policy,r.mode,r.interestRate,r.investedDate,String(interestFor(r).toFixed(2)),r.note,String(running[i])])].map(line=>line.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="targetbud-finance-ledger.csv";a.click();URL.revokeObjectURL(url)};
  return <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-black/55 hover:text-black"><ArrowLeft size={16}/> Finance overview</Link>
      <header className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-black/45">Finance · Records</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Deposit & lending ledger</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">A digital version of your notebook table. Edit the transcription, add rows, save it on this device, or export to CSV.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Add row</button><button onClick={save} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Save size={16}/>{saved?"Saved":"Save on device"}</button><button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Download size={16}/> Export CSV</button></div>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Rows</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Sum of entered amounts</p><p className="mt-1 text-2xl font-black">{money(total)}</p><p className="mt-2 text-xs text-black/50">Estimated interest: {money(totalInterest)}</p></div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">Transcription note</p><p className="mt-1 text-sm leading-5 text-amber-900">Some handwriting is unclear. Verify every amount and category before relying on totals.</p></div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3"><div><h2 className="font-black">Ledger table</h2><p className="text-xs text-black/45">Interest is estimated using simple annual interest from each invested date through today. Enter a rate and date to calculate it.</p></div><button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black/50 hover:bg-black/5"><RotateCcw size={14}/> Reset transcription</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1500px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f1ee] text-xs uppercase tracking-wider text-black/55"><tr>{["Available In","Amount (₹)","Policy No. / Reference","Mode","Interest rate (% p.a.)","Invested date","Interest earned","Running total","Notes",""].map(h=><th key={h} className="border-b border-black/10 px-3 py-3 font-black">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id} className="border-b border-black/[.06] last:border-0 hover:bg-black/[.015]">
            <td className="px-2 py-2"><select aria-label="Available in" value={r.availableIn} onChange={e=>update(r.id,"availableIn",e.target.value)} className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white">{["Bank","Cash","Lended"].map(x=><option key={x}>{x}</option>)}</select></td>
            <td className="px-2 py-2"><input aria-label="Amount in rupees" inputMode="decimal" value={r.amount} onChange={e=>update(r.id,"amount",e.target.value)} placeholder="0" className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 text-right font-semibold tabular-nums outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Policy or reference" value={r.policy} onChange={e=>update(r.id,"policy",e.target.value)} placeholder="Reference" className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><select aria-label="Mode" value={r.mode} onChange={e=>update(r.id,"mode",e.target.value)} className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"><option value="">—</option>{["Deposit","Savings","Cash","Lent","Insurance","Pending","Missing","Other"].map(x=><option key={x}>{x}</option>)}</select></td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">{money(running[i])}</td>
            <td className="px-2 py-2"><input aria-label="Interest rate percentage per annum" type="number" min="0" step="0.1" value={r.interestRate} onChange={e=>update(r.id,"interestRate",e.target.value)} placeholder="e.g. 7.5" className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Invested date" type="date" value={r.investedDate} onChange={e=>update(r.id,"investedDate",e.target.value)} className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">{money(interestFor(r))}</td>
            <td className="px-2 py-2"><input aria-label="Notes" value={r.note} onChange={e=>update(r.id,"note",e.target.value)} placeholder="Notes" className="w-40 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><button aria-label="Delete row" onClick={()=>{setRows(old=>old.filter(x=>x.id!==r.id));setSaved(false)}} className="grid size-8 place-items-center rounded-lg text-black/35 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button></td>
          </tr>)}</tbody>
          <tfoot className="bg-[#f7f7f5]"><tr><td colSpan={3} className="px-4 py-4 font-black">Totals</td><td></td><td></td><td></td><td className="px-3 py-4 text-right text-base font-black tabular-nums">{money(totalInterest)}</td><td className="px-3 py-4 text-right text-base font-black tabular-nums">{money(total)}</td><td className="px-3 py-4 text-xs text-black/45">Estimated interest only; verify rates and dates.</td><td></td></tr></tfoot>
        </table></div>
      </div>
      <p className="mt-4 text-xs leading-5 text-black/45">Interest earned is an estimate of simple interest (principal × annual rate × elapsed days ÷ 365); it is not compound interest and does not account for tax, fees, withdrawals, or changing rates. Privacy: this page saves to this browser/device only when you press “Save on device”. The initial rows are a best-effort transcription from your photo, not a verified accounting record.</p>
    </div>
  </main>;
}
