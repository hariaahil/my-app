"use client";

import { useEffect } from "react";

export default function GoalInsightsRedirect(){
  useEffect(()=>{
    const handler=(e:MouseEvent)=>{
      const el=(e.target as HTMLElement)?.closest("button");
      if(el?.textContent?.includes("VIEW ₹70L PLAN")){
        e.preventDefault();
        e.stopPropagation();
        window.location.assign("/goal/insights");
      }
    };
    document.addEventListener("click",handler,true);
    return()=>document.removeEventListener("click",handler,true);
  },[]);
  return null;
}
