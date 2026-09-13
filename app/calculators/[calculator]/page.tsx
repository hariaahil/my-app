import type { Metadata } from "next";
import Calculator from "./Calculator";

const catalog: Record<string,{title:string;description:string;kind:string}> = {
  "home-loan-emi": { title:"Home Loan EMI Calculator", description:"Calculate home-loan EMI, total interest and total repayment.", kind:"emi" },
  "personal-loan-emi": { title:"Personal Loan EMI Calculator", description:"Estimate personal-loan monthly repayment and interest.", kind:"emi" },
  "car-loan-emi": { title:"Car Loan EMI Calculator", description:"Estimate car-loan EMI and total repayment.", kind:"emi" },
  "two-wheeler-loan-emi": { title:"Two-Wheeler Loan EMI Calculator", description:"Estimate bike or scooter loan EMI and repayment.", kind:"emi" },
  "education-loan-emi": { title:"Education Loan EMI Calculator", description:"Estimate education-loan EMI and total repayment.", kind:"emi" },
  "sip": { title:"SIP Calculator", description:"Project the future value of a monthly SIP using an assumed return.", kind:"sip" },
  "fd": { title:"FD Calculator", description:"Estimate fixed-deposit maturity using your entered annual rate.", kind:"fd" },
  "rd": { title:"RD Calculator", description:"Estimate recurring-deposit maturity from monthly deposits and an entered rate.", kind:"rd" },
  "simple-interest": { title:"Simple Interest Calculator", description:"Calculate simple interest and maturity amount.", kind:"simple" },
  "compound-interest": { title:"Compound Interest Calculator", description:"Calculate compound interest using your chosen compounding frequency.", kind:"compound" },
};

export function generateStaticParams() { return Object.keys(catalog).map(calculator => ({ calculator })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{calculator:string}> }): Promise<Metadata> {
  const { calculator } = await params; const item = catalog[calculator];
  return { title:item.title, description:item.description, alternates:{canonical:`https://targetbud.vercel.app/calculators/${calculator}`}, openGraph:{title:item.title,description:item.description,url:`https://targetbud.vercel.app/calculators/${calculator}`} };
}

export default async function CalculatorPage({ params }: { params: Promise<{calculator:string}> }) {
  const { calculator } = await params; const item = catalog[calculator];
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8"><p className="text-xs font-black uppercase tracking-[.18em] text-black/45">TargetBud / Calculators</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{item.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">{item.description} Enter your own assumptions. TargetBud does not present unverified bank rates as current rates.</p></div><Calculator kind={item.kind} /><section className="mt-10 rounded-2xl border border-black/10 p-6"><h2 className="text-lg font-black">About this calculation</h2><p className="mt-2 text-sm leading-6 text-black/55">Results are estimates for planning. Actual lender terms, taxes, fees, deposit rules and returns can differ. Verify product terms with the relevant provider before making a financial decision.</p></section></main>;
}
