type Quote = { symbol: string; shortName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number };

async function getQuotes(): Promise<Quote[]> {
  try {
    const symbols = ["%5ENSEI", "%5EBSESN"].join(",");
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.quoteResponse?.result ?? []) as Quote[];
  } catch { return []; }
}

export const revalidate = 300;

export default async function MarketsPage() {
  const quotes = await getQuotes();
  return <main className="min-h-screen bg-white px-4 py-10 text-black sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-black/45">Markets</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight">India market pulse</h1>
    <p className="mt-2 max-w-2xl text-black/55">Live-ready NSE and BSE index snapshots with a five-minute refresh window. Values are sourced from Yahoo Finance and may be delayed.</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2">{quotes.map(q=><article key={q.symbol} className="rounded-3xl border border-black/10 p-6"><p className="text-sm font-bold">{q.symbol.includes("NSEI") ? "NIFTY 50" : "SENSEX"}</p><p className="mt-3 text-3xl font-black">{typeof q.regularMarketPrice === "number" ? q.regularMarketPrice.toLocaleString("en-IN") : "—"}</p><p className="mt-2 text-sm text-black/55">{typeof q.regularMarketChangePercent === "number" ? `${q.regularMarketChangePercent.toFixed(2)}%` : "Change unavailable"}</p></article>)}{!quotes.length&&<article className="rounded-3xl border border-black/10 p-6 sm:col-span-2"><p className="font-bold">Market feed temporarily unavailable.</p><p className="mt-2 text-sm text-black/55">No market value is fabricated; retry when the upstream feed is available.</p></article>}</section>
  </div></main>;
}
