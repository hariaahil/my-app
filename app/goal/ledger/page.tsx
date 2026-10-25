"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

type Entry = { id: string; name: string; amount: string; policy: string; mode: string; doc: string; note: string };
const STORAGE_KEY = "targetbud-finance-ledger-v1";
const initialRows: Entry[] = [
  {id:"1",name:"Deposit",amount:"98500",policy:"6.30 lakh",mode:"Deposit",doc:"",note:"From notebook; verify amount/balance"},
  {id:"2",name:"Deposit",amount:"95500",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"3",name:"Deposit",amount:"96500",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"4",name:"Deposit",amount:"18000",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"5",name:"Deposit",amount:"36300",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"6",name:"Deposit",amount:"18200",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"7",name:"Deposit",amount:"10300",policy:"6 lakh",mode:"Deposit",doc:"",note:""},
  {id:"8",name:"Deposit",amount:"1500",policy:"6.15 lakh",mode:"Deposit",doc:"",note:""},
  {id:"9",name:"Lent",amount:"50000",policy:"6.15 lakh",mode:"Savings",doc:"",note:"Lent; verify"},
  {id:"10",name:"Deposit",amount:"25000",policy:"6.15 lakh",mode:"Savings",doc:"",note:"Handwriting unclear; verify"},
  {id:"11",name:"Deposit",amount:"50000",policy:"6.15 lakh",mode:"Savings",doc:"",note:""},
  {id:"12",name:"Deposit",amount:"37000",policy:"6.15 lakh",mode:"Savings",doc:"",note:""},
  {id:"13",name:"Deposit",amount:"49000",policy:"6.15 lakh",mode:"Savings",doc:"",note:""},
  {id:"14",name:"Cash",amount:"10000",policy:"500",mode:"Cash",doc:"",note:""},
  {id:"15",name:"Cash",amount:"2800",policy:"200",mode:"Cash",doc:"",note:""},
  {id:"16",name:"Cash",amount:"5500",policy:"100",mode:"Cash",doc:"",note:""},
  {id:"17",name:"Deposit",amount:"25000",policy:"",mode:"Savings",doc:"",note:"Pending, as marked"},
  {id:"18",name:"",amount:"900",policy:"",mode:"Missing",doc:"",note:"Description unclear"},
  {id:"19",name:"Cash",amount:"500000",policy:"5 lakh",mode:"Cash",doc:"",note:"Large entry; verify"},
  {id:"20",name:"Lent",amount:"100000",policy:"From Excel",mode:"Savings",doc:"",note:"Lent"},
  {id:"21",name:"Lent",amount:"50000",policy:"In saving",mode:"Savings",doc:"",note:"Lent"},
  {id:"22",name:"Lent",amount:"50000",policy:"At Kabbadi",mode:"Savings",doc:"",note:"Lent"},
  {id:"23",name:"Lent",amount:"100000",policy:"At Kiran",mode:"Savings",doc:"",note:"Lent"},
  {id:"24",name:"Lent",amount:"500000",policy:"Gold loan",mode:"Savings",doc:"",note:"Lent"},
  {id:"25",name:"Lent",amount:"700000",policy:"Land",mode:"Lent",doc:"",note:"Lent"},
  {id:"26",name:"Deposit",amount:"473713",policy:"Savings",mode:"Savings",doc:"",note:""},
  {id:"27",name:"Lent",amount:"50000",policy:"Land",mode:"",doc:"",note:""},
  {id:"28",name:"Lent",amount:"100000",policy:"Stock/other",mode:"",doc:"",note:"Last row unclear"},
];

const money = (n:number) => "₹" + Math.round(n).toLocaleString("en-IN");
const parseAmount = (v:string) => Math.max(0, Number(v.replace(/[,₹\s]/g, "")) || 0);
const fmt = (v:string) => { const n=parseAmount(v); return n ? n.toLocaleString("en-IN") : v; };

export default function FinanceLedgerPage() {
  const [rows,setRows] = useState<Entry[]>(initialRows);
  const [saved,setSaved] = useState(false);
  useEffect(()=>{ try { const raw=localStorage.getItem(STORAGE_KEY); if(raw){ const parsed=JSON.parse(raw); if(Array.isArray(parsed)) setRows(parsed); } } catch {} },[]);
  const running = useMemo(()=>{let total=0; return rows.map(r=>{ total+=parseAmount(r.amount); return total; });},[rows]);
  const total = rows.reduce((s,r)=>s+parseAmount(r.amount),0);
  const update = (id:string,key:keyof Entry,value:string)=>{setRows(old=>old.map(r=>r.id===id?{...r,[key]:value}:r));setSaved(false)};
  const add = ()=>{setRows(old=>[...old,{id:Date.now().toString(),name:"",amount:"",policy:"",mode:"",doc:"",note:""}]);setSaved(false)};
  const save = ()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));setSaved(true)};
  const reset = ()=>{if(confirm("Reset this ledger to the initial transcription? This replaces your saved local copy.")){setRows(initialRows);localStorage.removeItem(STORAGE_KEY);setSaved(false)}};
  const download = ()=>{const head=["Name","Amount (INR)","Policy No. / Reference","Mode","DOC","Notes","Running Total (INR)"];const csv=[head,...rows.map((r,i)=>[r.name,r.amount,r.policy,r.mode,r.doc,r.note,String(running[i])])].map(line=>line.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="targetbud-finance-ledger.csv";a.click();URL.revokeObjectURL(url)};
  return <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/goal" className="inline-flex items-center gap-2 text-sm font-bold text-black/55 hover:text-black"><ArrowLeft size={16}/> Finance overview</Link>
      <header className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-black/45">Finance · Records</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Deposit & lending ledger</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">A digital version of your notebook table. Edit the transcription, add rows, save it on this device, or export to CSV.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Add row</button><button onClick={save} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Save size={16}/>{saved?"Saved":"Save on device"}</button><button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-bold"><Download size={16}/> Export CSV</button></div>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Rows</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
        <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs font-bold text-black/45">Sum of entered amounts</p><p className="mt-1 text-2xl font-black">{money(total)}</p></div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">Transcription note</p><p className="mt-1 text-sm leading-5 text-amber-900">Some handwriting is unclear. Verify every amount and category before relying on totals.</p></div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3"><div><h2 className="font-black">Ledger table</h2><p className="text-xs text-black/45">Running total is calculated from the amounts in row order.</p></div><button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black/50 hover:bg-black/5"><RotateCcw size={14}/> Reset transcription</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f1ee] text-xs uppercase tracking-wider text-black/55"><tr>{["Name","Amount (₹)","Policy No. / Reference","Mode","Premium / Running total","DOC","Notes",""].map(h=><th key={h} className="border-b border-black/10 px-3 py-3 font-black">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id} className="border-b border-black/[.06] last:border-0 hover:bg-black/[.015]">
            <td className="px-2 py-2"><input aria-label="Name" value={r.name} onChange={e=>update(r.id,"name",e.target.value)} placeholder="Deposit / Lent" className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Amount in rupees" inputMode="decimal" value={r.amount} onChange={e=>update(r.id,"amount",e.target.value)} placeholder="0" className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 text-right font-semibold tabular-nums outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Policy or reference" value={r.policy} onChange={e=>update(r.id,"policy",e.target.value)} placeholder="Reference" className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><select aria-label="Mode" value={r.mode} onChange={e=>update(r.id,"mode",e.target.value)} className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"><option value="">—</option>{["Deposit","Savings","Cash","Lent","Insurance","Pending","Missing","Other"].map(x=><option key={x}>{x}</option>)}</select></td>
            <td className="px-3 py-2 text-right font-bold tabular-nums">{money(running[i])}</td>
            <td className="px-2 py-2"><input aria-label="DOC" value={r.doc} onChange={e=>update(r.id,"doc",e.target.value)} placeholder="Date" className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><input aria-label="Notes" value={r.note} onChange={e=>update(r.id,"note",e.target.value)} placeholder="Notes" className="w-40 rounded-lg border border-transparent bg-transparent px-2 py-2 outline-none focus:border-black/20 focus:bg-white"/></td>
            <td className="px-2 py-2"><button aria-label="Delete row" onClick={()=>{setRows(old=>old.filter(x=>x.id!==r.id));setSaved(false)}} className="grid size-8 place-items-center rounded-lg text-black/35 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button></td>
          </tr>)}</tbody>
          <tfoot className="bg-[#f7f7f5]"><tr><td colSpan={4} className="px-4 py-4 font-black">Total of all entered amounts</td><td className="px-3 py-4 text-right text-base font-black tabular-nums">{money(total)}</td><td colSpan={3} className="px-3 py-4 text-xs text-black/45">Not a verified bank balance or net-worth figure.</td></tr></tfoot>
        </table></div>
      </div>
      <p className="mt-4 text-xs leading-5 text-black/45">Privacy: this page saves to this browser/device only when you press “Save on device”. It is not synced to your TargetBud account. The initial rows are a best-effort transcription from your photo, not a verified accounting record.</p>
    </div>
  </main>;
}
