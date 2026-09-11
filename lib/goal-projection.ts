export type GoalInvestment={
 id:string; name:string; investment_type:string; principal_amount:number; expected_rate:number;
 rate_period:"Monthly"|"Yearly"; invested_on:string; maturity_on:string|null; monthly_addition:number;
 current_value:number|null; contribution_type:"Monthly"|"On maturity"; expected_maturity_amount?:number|null;
};
export type GoalActivity={flow_type:"income"|"expense"; amount:number; recurrence?:string; recurrence_end:string|null; flow_date:string};
export type GoalSettlement={month_start:string; invest_amount:number; deposited:boolean};
export type GoalPoint={date:Date; value:number};
export const GOAL_TARGET=7000000;
export const AUTO_REINVEST_RATE=8.1;
const RETURN_TYPES=new Set(["FD","RD","SIP","Mutual Fund","PPF"]);
export const dateOnly=(s:string)=>new Date(`${s}T00:00:00`);
export const addMonths=(d:Date,n:number)=>{const x=new Date(d),day=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);x.setDate(Math.min(day,new Date(x.getFullYear(),x.getMonth()+1,0).getDate()));return x};
const monthsBetween=(a:Date,b:Date)=>Math.max(0,(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth());
export function monthlyRate(i:GoalInvestment){
 const r=Number(i.expected_rate||0)/100;
 if(!RETURN_TYPES.has(i.investment_type)||r<=0)return 0;
 return i.rate_period==="Monthly"?r:Math.pow(1+r,1/12)-1;
}
export function currentValue(i:GoalInvestment,today:Date){
 const start=dateOnly(i.invested_on);
 if(start>today)return 0;
 const mat=i.maturity_on?dateOnly(i.maturity_on):null;
 if(mat&&mat<=today&&i.current_value!=null)return Math.max(0,Number(i.current_value));
 const end=mat&&mat<today?mat:today;
 let value=Math.max(0,Number(i.principal_amount||0));
 const payment=Math.max(0,Number(i.monthly_addition||0));
 const months=monthsBetween(start,end);
 const r=monthlyRate(i);
 if(r)value*=Math.pow(1+r,months);
 if(i.contribution_type==="Monthly"&&payment)value+=payment*months;
 if(mat&&mat<=today&&i.expected_maturity_amount!=null)value=Math.max(0,Number(i.expected_maturity_amount));
 return value;
}
export function recurringMonthly(a:GoalActivity){
 const n=Math.max(0,Number(a.amount||0));
 if(a.recurrence==="Weekly")return n*52/12;
 if(a.recurrence==="Yearly")return n/12;
 return n;
}
export function isActive(a:GoalActivity,today:Date){
 const start=dateOnly(a.flow_date),end=a.recurrence_end?dateOnly(a.recurrence_end):null;
 return start<=today&&(!end||end>=today);
}
export function monthlySurplusAt(activities:GoalActivity[],d:Date){
 return activities.filter(a=>isActive(a,d)).reduce((sum,a)=>sum+(a.flow_type==="income"?1:-1)*recurringMonthly(a),0);
}
export function projectGoal(investments:GoalInvestment[],activities:GoalActivity[],settlements:GoalSettlement[],today:Date):GoalPoint[]{
 const states=investments.map(i=>({i,value:currentValue(i,today),matured:!!(i.maturity_on&&dateOnly(i.maturity_on)<=today)}));
 let pool=0;
 const points:GoalPoint[]=[{date:today,value:states.reduce((s,x)=>s+x.value,0)}];
 const saved=new Map(settlements.filter(s=>s.deposited).map(s=>[s.month_start.slice(0,7),Math.max(0,Number(s.invest_amount||0))]));
 const autoMonthly=Math.pow(1+AUTO_REINVEST_RATE/100,1/12)-1;
 for(let n=1;n<=600;n++){
  const d=addMonths(today,n);
  states.forEach(s=>{
   if(s.matured)return;
   const mat=s.i.maturity_on?dateOnly(s.i.maturity_on):null;
   if(mat&&mat<=d){
    const months=monthsBetween(today,mat),r=monthlyRate(s.i);
    let maturedValue=s.value;
    if(s.i.expected_maturity_amount!=null)maturedValue=Math.max(0,Number(s.i.expected_maturity_amount));
    else {if(r)maturedValue*=Math.pow(1+r,months);if(s.i.contribution_type==="Monthly")maturedValue+=Math.max(0,Number(s.i.monthly_addition||0))*months;}
    pool+=maturedValue;s.value=0;s.matured=true;
   }else{
    const r=monthlyRate(s.i);if(r)s.value*=1+r;
    if(s.i.contribution_type==="Monthly")s.value+=Math.max(0,Number(s.i.monthly_addition||0));
   }
  });
  pool=pool*(1+autoMonthly)+Math.max(0,monthlySurplusAt(activities,d))+(saved.get(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)??0);
  const value=states.reduce((s,x)=>s+x.value,0)+pool;
  points.push({date:d,value:Math.min(GOAL_TARGET,value)});
  if(value>=GOAL_TARGET)break;
 }
 return points;
}
