"use client";
import { useMemo, useState } from "react";

const money = (n:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const num = (v:string) => Math.max(0, Number(v) || 0);

export default function Calculator({kind}:{kind:string}) {
  const [principal,setPrincipal]=useState(kind==="sip"?5000:kind==="simple"||kind==="compound"?100000:kind==="fd"?100000:kind==="rd"?5000:3000000);
  const [rate,setRate]=useState(kind==="emi"?8.5:kind==="sip"?12:7);
  const [years,setYears]=useState(kind==="emi"?20:5);
  const [frequency,setFrequency]=useState(12);
  const [months,setMonths]=useState(60);
  const result=useMemo(()=>{
    if(kind==="emi") { const n=years*12, r=rate/1200, emi=r===0?principal/n:principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1); return {primary:emi,label:"Estimated monthly EMI",items:[["Principal",money(principal)],["Total interest",money(emi*n-principal)],["Total repayment",money(emi*n)],["Tenure",`${n} months`]]}; }
    if(kind==="sip") { const n=years*12,r=Math.pow(1+rate/100,1/12)-1,fv=r===0?principal*n:principal*((Math.pow(1+r,n)-1)/r)*(1+r); return {primary:fv,label:"Estimated future value",items:[["Invested",money(principal*n)],["Estimated gain",money(fv-principal*n)],["Duration",`${n} months`]]}; }
    if(kind==="fd") { const n=years*frequency, a=principal*Math.pow(1+rate/(100*frequency),n); return {primary:a,label:"Estimated maturity",items:[["Deposit",money(principal)],["Interest",money(a-principal)],["Tenure",`${years} years`]]}; }
    if(kind==="rd") { const r=rate/400,n=years*4,a=principal*((Math.pow(1+r,n)-1)/r)*(1+r); return {primary:a,label:"Estimated maturity",items:[["Monthly deposit",money(principal)],["Total deposits",money(principal*months)],["Interest",money(a-principal*n/4*3)]]}; }
    if(kind==="simple") { const interest=principal*rate*years/100; return {primary:principal+interest,label:"Maturity amount",items:[["Principal",money(principal)],["Interest",money(interest)],["Rate",`${rate}% p.a.`]]}; }
    const n=years*frequency,a=principal*Math.pow(1+rate/(100*frequency),n); return {primary:a,label:"Maturity amount",items:[["Principal",money(principal)],["Compound interest",money(a-principal)],["Compounds",`${n}`]]};
  },[kind,principal,rate,years,frequency,months]);
  const label=kind==="sip"||kind==="rd"?"Monthly amount":"Principal / deposit";
  return <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
    <section className="rounded-2xl border border-black/10 p-5 sm:p-6"><h2 className="text-base font-black">Enter assumptions</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label={label} value={principal} setValue={setPrincipal}/><Field label="Annual rate (%)" value={rate} setValue={setRate} step="0.01"/>
      <Field label="Years" value={years} setValue={setYears} step="1"/>
      {(kind==="fd"||kind==="compound")&&<label className="grid gap-1.5 text-xs font-bold text-black/60">Compounding<select value={frequency} onChange={e=>setFrequency(Number(e.target.value))} className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-black"><option value="1">Yearly</option><option value="2">Half-yearly</option><option value="4">Quarterly</option><option value="12">Monthly</option></select></label>}
    </div><p className="mt-5 text-xs leading-5 text-black/45">These are user-entered assumptions. No live bank rate is implied.</p></section>
    <section className="rounded-2xl border border-black bg-black p-5 text-white sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-white/55">Estimate</p><p className="mt-5 text-sm text-white/60">{result.label}</p><p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{money(result.primary)}</p><div className="mt-7 divide-y divide-white/15">{result.items.map(([k,v])=><div key={k} className="flex justify-between gap-4 py-3 text-sm"><span className="text-white/55">{k}</span><b>{v}</b></div>)}</div></section>
  </div>;
}
function Field({label,value,setValue,step="1"}:{label:string;value:number;setValue:(n:number)=>void;step?:string}) { return <label className="grid gap-1.5 text-xs font-bold text-black/60">{label}<input type="number" min="0" step={step} value={value} onChange={e=>setValue(num(e.target.value))} className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-black"/></label>; }
