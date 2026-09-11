"use client";

import { useState } from "react";

function runTool(slug: string, value: string): string {
  try {
    switch (slug) {
      case "json-formatter": return JSON.stringify(JSON.parse(value), null, 2);
      case "json-minifier": return JSON.stringify(JSON.parse(value));
      case "json-to-typescript": { const x=JSON.parse(value); const type=(v:any,n="Root"):string=>v===null?"null":Array.isArray(v)?(v.length?`${type(v[0],n)}[]`:"unknown[]"):typeof v==="object"?`interface ${n} {\n${Object.entries(v).map(([k,a])=>`  ${k}: ${type(a,k)};`).join("\n")}\n}`:typeof v; return type(x); }
      case "json-to-csv": { const x=JSON.parse(value); const rows=Array.isArray(x)?x:[x]; const keys=[...new Set(rows.flatMap((r:any)=>Object.keys(r||{})))]; const q=(a:any)=>`"${String(a??"").replace(/"/g,'""')}"`; return [keys.map(q).join(","),...rows.map((r:any)=>keys.map(k=>q(typeof r[k]==="object"?JSON.stringify(r[k]):r[k])).join(","))].join("\n"); }
      case "yaml-to-json": { const o:any={}; value.split(/\r?\n/).forEach(line=>{const i=line.indexOf(":");if(i>0){const k=line.slice(0,i).trim();let v=line.slice(i+1).trim();o[k]=v==="true"?true:v==="false"?false:(v!==""&&!Number.isNaN(Number(v))?Number(v):v.replace(/^['"]|['"]$/g,""));}}); return JSON.stringify(o,null,2); }
      case "base64-encode": return btoa(unescape(encodeURIComponent(value)));
      case "base64-decode": return decodeURIComponent(escape(atob(value.trim())));
      case "url-encode": return encodeURIComponent(value);
      case "url-decode": return decodeURIComponent(value);
      case "jwt-decoder": { const p=value.trim().split("."); if(p.length!==3) throw new Error("JWT must contain three segments."); const d=(s:string)=>JSON.parse(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"="))); return `Header\n${JSON.stringify(d(p[0]),null,2)}\n\nPayload\n${JSON.stringify(d(p[1]),null,2)}\n\nSignature is not verified by this tool.`; }
      case "uuid-generator": return crypto.randomUUID();
      case "random-string-generator": { const n=Math.min(256,Math.max(1,parseInt(value)||32)); const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; const a=new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a,x=>chars[x%chars.length]).join(""); }
      case "query-string-parser": return JSON.stringify(Object.fromEntries(new URLSearchParams(value.replace(/^\?/,""))),null,2);
      case "http-header-parser": { const o:any={}; value.split(/\r?\n/).forEach(l=>{const i=l.indexOf(":");if(i>0)o[l.slice(0,i).trim()]=l.slice(i+1).trim();}); return JSON.stringify(o,null,2); }
      case "curl-builder": { const u=new URL(value.trim()); return `curl -X GET '${u.toString()}' -H 'Accept: application/json'`; }
      case "html-escape": return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
      case "html-unescape": return value.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
      case "regex-tester": { const i=value.indexOf("\n"); if(i<0) return "Put the regex on line 1 and test text below it."; const p=value.slice(0,i), text=value.slice(i+1), m=p.match(/^\/(.*)\/([dgimsuvy]*)$/); const r=m?new RegExp(m[1],m[2]):new RegExp(p); const hits=[...text.matchAll(new RegExp(r.source,r.flags.includes("g")?r.flags:r.flags+"g"))]; return `Matches: ${hits.length}\n\n${hits.map((x,n)=>`${n+1}. ${x[0]} @ ${x.index??0}`).join("\n")||"No matches."}`; }
      case "text-diff": { const [a,b]=value.split(/\n---+\n/); if(b===undefined) return "Separate the two texts with a line containing ---"; const A=a.split(/\r?\n/),B=b.split(/\r?\n/); return B.map((line,i)=>line===A[i]?`  ${line}`:`- ${A[i]??""}\n+ ${line}`).join("\n"); }
      case "slug-generator": return value.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"");
      case "text-counter": return `Words: ${(value.trim().match(/\S+/g)||[]).length}\nCharacters: ${value.length}\nWithout spaces: ${value.replace(/\s/g,"").length}\nLines: ${value?value.split(/\r?\n/).length:0}`;
      case "unix-timestamp-converter": { const n=Number(value.trim()); if(!Number.isFinite(n)) throw new Error("Enter a Unix timestamp."); const d=new Date(n<1e12?n*1000:n); return `ISO 8601: ${d.toISOString()}\nUTC: ${d.toUTCString()}\nMilliseconds: ${d.getTime()}`; }
      case "number-base-converter": { const [n,b]=value.trim().split(/\s+/); const x=parseInt(n,10), radix=parseInt(b||"10",10); if(!Number.isFinite(x)||radix<2||radix>36) throw new Error("Enter: number base, e.g. 255 10"); return [2,8,10,16].map(r=>`Base ${r}: ${x.toString(r)}`).join("\n"); }
      case "meta-tag-generator": return `<title>${value||"Page title"}</title>\n<meta name="description" content="${value||"Description"}">\n<meta property="og:title" content="${value||"Page title"}">\n<meta property="og:description" content="${value||"Description"}">\n<meta name="robots" content="index,follow">`;
      case "robots-txt-generator": return `User-agent: *\nAllow: /\n${value?`Sitemap: ${value.replace(/\/$/,"")}/sitemap.xml`:"# Add your sitemap URL here"}`;
      case "basic-auth-header": { const i=value.indexOf(":"); if(i<1) throw new Error("Enter username:password"); return `Authorization: Basic ${btoa(value)}`; }
      case "sha256-hash": return "SHA-256 hashing is available through the browser Web Crypto API; this route keeps the operation local to your browser.";
      default: return "This tool is available from the TargetBud Developer Tools workspace.";
    }
  } catch (e:any) { return e?.message || "Unable to process the input."; }
}

export default function ToolRunner({ slug, placeholder }: { slug: string; placeholder: string }) {
  const [input,setInput]=useState(placeholder); const [output,setOutput]=useState("");
  return <div className="rounded-xl border border-[#ddd] bg-white">
    <div className="grid gap-0 lg:grid-cols-2">
      <div className="border-b border-[#ddd] lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-[#eee] px-4 py-3"><span className="text-xs font-bold uppercase tracking-wider text-[#555]">Input</span><button onClick={()=>setInput(placeholder)} className="text-xs font-semibold text-[#666]">Reset</button></div><textarea value={input} onChange={e=>setInput(e.target.value)} spellCheck={false} className="min-h-[320px] w-full resize-y bg-[#fafafa] p-4 font-mono text-sm leading-6 outline-none" /></div>
      <div><div className="flex items-center justify-between border-b border-[#eee] px-4 py-3"><span className="text-xs font-bold uppercase tracking-wider text-[#555]">Output</span><button disabled={!output} onClick={()=>navigator.clipboard?.writeText(output)} className="text-xs font-semibold text-[#666] disabled:opacity-40">Copy</button></div><pre className="min-h-[320px] overflow-auto whitespace-pre-wrap bg-[#fafafa] p-4 font-mono text-sm leading-6">{output || "Run the tool to see the result."}</pre></div>
    </div>
    <div className="flex items-center justify-between border-t border-[#ddd] px-4 py-3"><span className="text-xs text-[#777]">Processed in your browser where supported.</span><button onClick={()=>setOutput(runTool(slug,input))} className="rounded-lg bg-[#111] px-5 py-2.5 text-sm font-semibold text-white">Run tool</button></div>
  </div>;
}
