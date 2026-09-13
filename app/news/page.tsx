type Item = { title: string; link: string; pubDate?: string };

async function getNews(): Promise<Item[]> {
  try {
    const res = await fetch("https://news.google.com/rss/search?q=India+business+technology+finance&hl=en-IN&gl=IN&ceid=IN:en", { next: { revalidate: 900 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map(m => {
      const block = m[1];
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "";
      const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
      return { title, link, pubDate };
    }).filter(x => x.title && x.link);
  } catch { return []; }
}

export const revalidate = 900;

export default async function NewsPage() {
  const items = await getNews();
  return <main className="min-h-screen bg-white px-4 py-10 text-black sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-black/45">News</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight">What matters today</h1>
    <p className="mt-2 text-black/55">Current India-focused business, technology and finance headlines from Google News RSS. Original source links open externally.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((item, i)=><article key={`${item.link}-${i}`} className="rounded-3xl border border-black/10 p-6"><p className="text-xs font-bold uppercase tracking-wider text-black/40">Headline</p><h2 className="mt-3 font-bold leading-6">{item.title}</h2><p className="mt-3 text-xs text-black/45">{item.pubDate ? new Date(item.pubDate).toLocaleString("en-IN") : "Current feed"}</p><a className="mt-5 inline-block text-sm font-bold underline" href={item.link} target="_blank" rel="noreferrer">Read source →</a></article>)}{!items.length&&<article className="rounded-3xl border border-black/10 p-6 md:col-span-2 lg:col-span-3"><p className="font-bold">News feed temporarily unavailable.</p><p className="mt-2 text-sm text-black/55">No headlines are fabricated; retry when the upstream feed is available.</p></article>}</div>
  </div></main>;
}
