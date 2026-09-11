"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Download,
  Hash,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Menu,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
  X,
} from "lucide-react";

type Tool = {
  id: string;
  name: string;
  category: string;
  description: string;
  placeholder: string;
  run: (input: string) => string;
};

const b64Encode = (value: string) => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return "Unable to encode input.";
  }
};

const b64Decode = (value: string) => {
  try {
    return decodeURIComponent(escape(atob(value.trim())));
  } catch {
    return "Invalid Base64 input.";
  }
};

const jsonFormat = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return "Invalid JSON. Check commas, quotes, brackets and braces.";
  }
};

const jsonMinify = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return "Invalid JSON. Check commas, quotes, brackets and braces.";
  }
};

const urlEncode = (value: string) => encodeURIComponent(value);
const urlDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return "Invalid URL encoding.";
  }
};

const jwtDecode = (value: string) => {
  try {
    const parts = value.trim().split(".");
    if (parts.length !== 3) return "Invalid JWT: expected three segments.";
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.stringify(JSON.parse(atob(payload)), null, 2);
  } catch {
    return "Invalid JWT payload.";
  }
};

const queryParser = (value: string) => {
  try {
    const query = value.trim().replace(/^\?/, "");
    return JSON.stringify(Object.fromEntries(new URLSearchParams(query)), null, 2);
  } catch {
    return "Invalid query string.";
  }
};

const htmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

const tools: Tool[] = [
  { id: "json-format", name: "JSON Formatter", category: "JSON", description: "Format and validate JSON with readable indentation.", placeholder: '{\n  "name": "TargetBud",\n  "active": true\n}', run: jsonFormat },
  { id: "json-minify", name: "JSON Minifier", category: "JSON", description: "Remove unnecessary whitespace from valid JSON.", placeholder: '{ "name": "TargetBud", "active": true }', run: jsonMinify },
  { id: "base64", name: "Base64 Encode", category: "Encoders", description: "Encode UTF-8 text into Base64 locally.", placeholder: "Enter text to encode…", run: b64Encode },
  { id: "base64-decode", name: "Base64 Decode", category: "Encoders", description: "Decode Base64 text back into UTF-8.", placeholder: "VGFyZ2V0QnVk", run: b64Decode },
  { id: "url-encode", name: "URL Encode", category: "Encoders", description: "Percent-encode URLs, query values or text.", placeholder: "https://example.com/?q=hello world", run: urlEncode },
  { id: "url-decode", name: "URL Decode", category: "Encoders", description: "Decode percent-encoded URLs and query values.", placeholder: "https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%20world", run: urlDecode },
  { id: "jwt", name: "JWT Inspector", category: "Security", description: "Inspect a JWT payload locally. Signature verification is not performed.", placeholder: "Paste a JWT token…", run: jwtDecode },
  { id: "uuid", name: "UUID v4 Generator", category: "Generators", description: "Generate a cryptographically random UUID v4.", placeholder: "No input required", run: () => crypto.randomUUID() },
  { id: "query", name: "Query String Parser", category: "Web", description: "Convert URL query parameters into JSON.", placeholder: "?name=TargetBud&mode=tools", run: queryParser },
  { id: "html-escape", name: "HTML Escape", category: "Web", description: "Escape characters that have special meaning in HTML.", placeholder: "<section>Hello</section>", run: htmlEscape },
  { id: "slug", name: "Slug Generator", category: "Text", description: "Convert a title into a clean URL slug.", placeholder: "My Developer Tools Page", run: slugify },
  { id: "counter", name: "Text Counter", category: "Text", description: "Count words, characters and lines instantly.", placeholder: "Type or paste text…", run: (value) => `Words: ${(value.trim().match(/\S+/g) || []).length}\nCharacters: ${value.length}\nLines: ${value ? value.split(/\r?\n/).length : 0}` },
];

const categories = [
  { name: "All tools", icon: LayoutGrid },
  { name: "JSON", icon: Braces },
  { name: "Encoders", icon: Link2 },
  { name: "Security", icon: LockKeyhole },
  { name: "Generators", icon: Sparkles },
  { name: "Web", icon: Code2 },
  { name: "Text", icon: Type },
];

export default function DeveloperTools() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All tools");
  const [selected, setSelected] = useState("json-format");
  const [input, setInput] = useState(tools[0].placeholder);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  const filtered = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === "All tools" || tool.category === category;
    const haystack = `${tool.name} ${tool.category} ${tool.description}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [category, query]);

  const current = tools.find((tool) => tool.id === selected) ?? tools[0];

  function selectTool(id: string) {
    const next = tools.find((tool) => tool.id === id);
    if (!next) return;
    setSelected(id);
    setInput(next.placeholder);
    setOutput("");
    setCopied(false);
    setMobileToolsOpen(false);
  }

  function runTool() {
    setOutput(current.run(input));
    setCopied(false);
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard?.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadOutput() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${current.id}-output.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setInput("");
    setOutput("");
    setCopied(false);
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-[#e5e5e5] pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#777]">
                <Code2 className="size-4" /> TargetBud Developer Tools
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Developer workspace</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#666]">Fast, focused utilities for JSON, encoding, security, web development and text. Simple enough for everyday use, structured for developers.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#ddd] px-3 py-2 text-xs font-semibold text-[#555] sm:flex">
              <ShieldCheck className="size-4" /> Local-first tools
            </div>
          </div>
        </header>

        <div className="mt-5 flex gap-5">
          <aside className="hidden w-[250px] shrink-0 lg:block">
            <div className="sticky top-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Tools</span>
                <span className="text-xs text-[#999]">{tools.length}</span>
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#999]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" className="h-10 w-full rounded-lg border border-[#ddd] bg-[#fafafa] pl-9 pr-3 text-sm outline-none transition focus:border-[#111]" />
              </div>
              <div className="space-y-1">
                {categories.map(({ name, icon: Icon }) => (
                  <button key={name} onClick={() => setCategory(name)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${category === name ? "bg-[#111] text-white" : "text-[#555] hover:bg-[#f3f3f3]"}`}>
                    <Icon className="size-4" /> <span>{name}</span>
                    {name !== "All tools" && <span className="ml-auto text-xs opacity-50">{tools.filter((tool) => tool.category === name).length}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2 lg:hidden">
              <button onClick={() => setMobileToolsOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#ddd] px-3 text-sm font-semibold">
                <Menu className="size-4" /> Tools
              </button>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#999]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" className="h-10 w-full rounded-lg border border-[#ddd] pl-9 pr-3 text-sm outline-none focus:border-[#111]" />
              </div>
            </div>

            {mobileToolsOpen && (
              <div className="mb-4 rounded-xl border border-[#ddd] bg-[#fafafa] p-2 lg:hidden">
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#777]">Choose a tool</span>
                  <button onClick={() => setMobileToolsOpen(false)} aria-label="Close tools"><X className="size-4" /></button>
                </div>
                {filtered.map((tool) => <button key={tool.id} onClick={() => selectTool(tool.id)} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${selected === tool.id ? "bg-[#111] text-white" : "hover:bg-white"}`}>{tool.name}<span className="ml-2 text-xs opacity-50">{tool.category}</span></button>)}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#777]">
              <span>Developer Tools</span><ChevronRight className="size-3" /><span>{current.category}</span><ChevronRight className="size-3" /><span className="font-semibold text-[#222]">{current.name}</span>
            </div>

            <div className="rounded-2xl border border-[#ddd] bg-white shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
              <div className="border-b border-[#e8e8e8] px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-[#ddd] bg-[#fafafa]"><Hash className="size-4" /></div>
                      <div><h2 className="text-lg font-bold tracking-[-0.02em]">{current.name}</h2><p className="text-xs text-[#777]">{current.category}</p></div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-[#666]">{current.description}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#ddd] px-3 py-1.5 text-xs font-semibold text-[#555]"><ShieldCheck className="size-3.5" /> Runs locally</div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-[#dcdcdc] bg-[#fafafa]">
                    <div className="flex items-center justify-between border-b border-[#e5e5e5] px-3 py-2.5">
                      <div><span className="text-xs font-bold uppercase tracking-wider text-[#555]">Input</span><span className="ml-2 text-[11px] text-[#999]">{input.length} chars</span></div>
                      <button onClick={() => setInput(current.placeholder)} className="text-xs font-semibold text-[#666] hover:text-[#111]">Reset</button>
                    </div>
                    <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} className="min-h-[390px] w-full resize-y bg-[#fafafa] p-4 font-mono text-[13px] leading-6 text-[#222] outline-none" placeholder={current.placeholder} />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#dcdcdc] bg-[#fafafa]">
                    <div className="flex items-center justify-between border-b border-[#e5e5e5] px-3 py-2.5">
                      <div><span className="text-xs font-bold uppercase tracking-wider text-[#555]">Output</span><span className="ml-2 text-[11px] text-[#999]">{output.length} chars</span></div>
                      <div className="flex items-center gap-1">
                        <button onClick={copyOutput} disabled={!output} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-[#555] hover:bg-[#eee] disabled:cursor-not-allowed disabled:opacity-40"><Clipboard className="size-3.5" /> {copied ? "Copied" : "Copy"}</button>
                        <button onClick={downloadOutput} disabled={!output} aria-label="Download output" className="rounded-md p-1.5 text-[#555] hover:bg-[#eee] disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-3.5" /></button>
                      </div>
                    </div>
                    <textarea value={output} readOnly spellCheck={false} className="min-h-[390px] w-full resize-y bg-[#fafafa] p-4 font-mono text-[13px] leading-6 text-[#222] outline-none" placeholder="Your result will appear here…" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee] pt-4">
                  <button onClick={runTool} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#111] px-5 text-sm font-bold text-white transition hover:bg-[#333] active:scale-[0.99]"><Play className="size-4 fill-current" /> Run tool</button>
                  <button onClick={clearAll} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d8d8d8] px-4 text-sm font-semibold text-[#444] transition hover:bg-[#f5f5f5]"><RefreshCw className="size-4" /> Clear</button>
                  {output && <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#666]"><Check className="size-3.5" /> Output ready</span>}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e1e1e1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#888]">Focused</p><p className="mt-1 text-sm font-semibold">One workspace per tool</p></div>
              <div className="rounded-xl border border-[#e1e1e1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#888]">Private</p><p className="mt-1 text-sm font-semibold">Local processing where supported</p></div>
              <div className="rounded-xl border border-[#e1e1e1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#888]">Responsive</p><p className="mt-1 text-sm font-semibold">Built for desktop and mobile</p></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
