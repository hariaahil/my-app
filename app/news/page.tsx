type Item = { title: string; link: string; pubDate?: string };

const FEEDS = [
  "India business finance when:2d",
  "India technology AI when:2d",
  "India stock market NSE BSE when:2d",
];

function parseItems(xml: string): Item[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    return { title, link, pubDate };
  }).filter(x => x.title && x.link);
}

async function getNews(): Promise<Item[]> {
  try {
    const feeds = await Promise.all(FEEDS.map(async query => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) return [];
      return parseItems(await res.text());
    }));

    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const seen = new Set<string>();

    return feeds.flat()
      .filter(item => {
        if (!item.pubDate) return false;
        const timestamp = Date.parse(item.pubDate);
        if (!Number.isFinite(timestamp) || timestamp < cutoff) return false;
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      })
      .sort((a, b) => Date.parse(b.pubDate!) - Date.parse(a.pubDate!))
      .slice(0, 12);
  } catch {
    return [];
  }
}

export const revalidate = 300;

export default async function NewsPage() {
  const items = await getNews();
  return <main className="min-h-screen bg-white px-4 py-10 text-black sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-black/45">News</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight">What matters today</h1>
    <p className="mt-2 text-black/55">Fresh India-focused business, technology, AI and market headlines from Google News RSS. Only items published within the last 48 hours are shown.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((item, i)=><article key={`${item.link}-${i}`} className="rounded-3xl border border-black/10 p-6"><p className="text-xs font-bold uppercase tracking-wider text-black/40">Headline</p><h2 className="mt-3 font-bold leading-6">{item.title}</h2><p className="mt-3 text-xs text-black/45">{item.pubDate ? new Date(item.pubDate).toLocaleString("en-IN") : "Current feed"}</p><a className="mt-5 inline-block text-sm font-bold underline" href={item.link} target="_blank" rel="noreferrer">Read source →</a></article>)}{!items.length&&<article className="rounded-3xl border border-black/10 p-6 md:col-span-2 lg:col-span-3"><p className="font-bold">Fresh news feed temporarily unavailable.</p><p className="mt-2 text-sm text-black/55">No stale or fabricated headlines are shown. Retry when the upstream feed provides recent items.</p></article>}</div>
  </div></main>;
}
