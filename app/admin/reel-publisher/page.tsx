"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const DEFAULT_HASHTAGS = ["#TeluguTrolls", "#TeluguTroll", "#TeluguMemes", "#TeluguComedy", "#TeluguFunny"];

type QueueItem = {
  id: string;
  instagram_url: string;
  status: string;
  queue_position: number | null;
  scheduled_at: string | null;
  youtube_url: string | null;
  hashtags: string[];
  created_at: string;
  error_message: string | null;
};

function reelId(url: string) {
  const match = url.match(/\/reel\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function normalizeUrls(value: string) {
  return Array.from(new Set(value.split(/\s+/).map((v) => v.trim()).filter((v) => /^https?:\/\/(www\.)?instagram\.com\/(reel|reels)\//i.test(v))));
}

function istDateTime(daysFromToday: number, hour = 20, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function ReelPublisherPage() {
  const supabase = useMemo(() => createClient(), []);
  const [urls, setUrls] = useState("");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?next=/admin/reel-publisher";
      return;
    }
    const { data, error: loadError } = await supabase
      .from("reel_youtube_queue")
      .select("id,instagram_url,status,queue_position,scheduled_at,youtube_url,hashtags,created_at,error_message")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    setItems((data ?? []) as QueueItem[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const parsed = normalizeUrls(urls);
    if (!parsed.length) {
      setError("Paste one or more Instagram Reel URLs, separated by spaces or new lines.");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?next=/admin/reel-publisher";
      return;
    }

    const existing = new Set(items.map((item) => item.instagram_url.replace(/\/$/, "").toLowerCase()));
    const fresh = parsed.filter((url) => !existing.has(url.replace(/\/$/, "").toLowerCase()));
    if (!fresh.length) {
      setError("All submitted Reels are already in your queue or history.");
      setSaving(false);
      return;
    }

    const occupied = items.filter((item) => item.status !== "skipped" && item.scheduled_at).map((item) => new Date(item.scheduled_at as string).getTime()).filter(Number.isFinite);
    const lastScheduled = occupied.length ? Math.max(...occupied) : 0;
    const now = Date.now();
    let startDay = 1;
    if (lastScheduled > now) {
      const last = new Date(lastScheduled);
      const today = new Date();
      const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
      const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      startDay = Math.max(1, Math.round((lastDay - todayDay) / 86400000) + 1);
    }

    const basePosition = items.length + 1;
    const rows = fresh.map((url, index) => ({
      user_id: user.id,
      instagram_url: url,
      instagram_reel_id: reelId(url),
      status: "queued",
      queue_position: basePosition + index,
      scheduled_at: istDateTime(startDay + index, 20, 0),
      hashtags: DEFAULT_HASHTAGS,
    }));

    const { error: insertError } = await supabase.from("reel_youtube_queue").insert(rows);
    if (insertError) {
      setError(insertError.code === "23505" ? "One or more Reels are duplicates. Nothing was duplicated." : insertError.message);
    } else {
      setUrls("");
      setMessage(`${fresh.length} Reel${fresh.length === 1 ? "" : "s"} added. One is reserved per day.`);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    setError("");
    const { error: deleteError } = await supabase.from("reel_youtube_queue").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  const queued = items.filter((i) => ["queued", "processing", "scheduled"].includes(i.status));
  const published = items.filter((i) => i.status === "published");

  return (
    <main className="min-h-[calc(100vh-56px)] bg-white text-black">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.24em] text-black/45">Private tool</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Reel → YouTube</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">Paste your Telugu troll Reels. TargetBud stores the full queue and reserves no more than one publication per day.</p>
          </div>
          <div className="rounded-xl border border-black/10 px-4 py-3 text-sm"><span className="font-black">{queued.length}</span> queued · <span className="font-black">{published.length}</span> published</div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <form onSubmit={submit} className="rounded-2xl border border-black/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="font-black">Add Reels</h2><p className="mt-1 text-xs text-black/45">One URL per line, or paste a batch.</p></div>
              <span className="rounded-full bg-black px-3 py-1 text-[11px] font-black text-white">1 / day</span>
            </div>
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={9} placeholder="https://www.instagram.com/reel/...\nhttps://www.instagram.com/reel/...\nhttps://www.instagram.com/reel/..." className="mt-4 w-full resize-y rounded-xl border border-black/15 p-4 text-sm outline-none focus:border-black" />
            {message && <p className="mt-3 rounded-xl border border-black/10 bg-black/[.025] p-3 text-sm font-bold">{message}</p>}
            {error && <p className="mt-3 rounded-xl border border-black/15 p-3 text-sm font-bold">{error}</p>}
            <button disabled={saving} className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-40">{saving ? "Adding…" : "Add to queue"}</button>
          </form>

          <aside className="rounded-2xl border border-black/10 p-5 sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Publishing rules</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-black/60">
              <li><strong className="text-black">Duplicate protection.</strong> Same Reel URL/ID cannot be queued twice for your account.</li>
              <li><strong className="text-black">One per day.</strong> Batch uploads are stored and spread across future days.</li>
              <li><strong className="text-black">Hashtags only.</strong> Metadata is restricted to Telugu troll/meme hashtags.</li>
              <li><strong className="text-black">Current default.</strong> 8:00 PM IST until YouTube analytics are connected to choose a data-driven time.</li>
              <li><strong className="text-black">Rights.</strong> Only submit Reels you have permission to republish.</li>
            </ul>
          </aside>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-black/45">Queue</p><h2 className="mt-1 text-2xl font-black">Upcoming Reels</h2></div><button onClick={() => void load()} className="text-xs font-black">Refresh</button></div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
            {loading ? <div className="p-6 text-sm text-black/45">Loading queue…</div> : items.length === 0 ? <div className="p-8 text-center text-sm text-black/45">No Reels yet. Paste your first batch above.</div> : <div className="divide-y divide-black/10">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[56px_1fr_auto] sm:items-center sm:p-5">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-black/10 text-sm font-black">{item.queue_position ?? "—"}</div>
                  <div className="min-w-0"><a href={item.instagram_url} target="_blank" rel="noreferrer" className="block truncate text-sm font-black underline decoration-black/15 underline-offset-4">{item.instagram_url}</a><p className="mt-1 text-xs text-black/45">{item.status} · {formatDate(item.scheduled_at)}</p><p className="mt-1 text-[11px] text-black/40">{(item.hashtags ?? DEFAULT_HASHTAGS).join(" ")}</p>{item.error_message && <p className="mt-1 text-xs font-bold">{item.error_message}</p>}</div>
                  <div className="flex items-center gap-2"><span className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-black">{item.status}</span>{["queued", "failed", "skipped"].includes(item.status) && <button onClick={() => void remove(item.id)} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold">Remove</button>}</div>
                </div>
              ))}
            </div>}
          </div>
        </section>
      </div>
    </main>
  );
}
