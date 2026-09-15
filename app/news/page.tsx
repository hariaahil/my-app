type Item = {
  title: string;
  link: string;
  pubDate?: string;
  image?: string;
  video?: string;
  source?: string;
};

const FEEDS = [
  "India business finance when:2d",
  "India technology AI when:2d",
  "India stock market NSE BSE when:2d",
  "India national politics when:2d",
  "India sports cricket when:2d",
  "India entertainment when:2d",
  "world news when:2d",
];

function clean(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function normalizeTitle(value: string) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ocid", "ved", "hl", "gl", "ceid"].forEach(key => url.searchParams.delete(key));
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

function attr(block: string, name: string) {
  return block.match(new RegExp(`<[^>]*\\b${name}=["']([^"']+)["'][^>]*>`, "i"))?.[1] ?? "";
}

function safeMedia(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function parseItems(xml: string): Item[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const block = m[1];
    const title = clean(tag(block, "title"));
    const link = clean(tag(block, "link"));
    const pubDate = clean(tag(block, "pubDate"));
    const source = clean(tag(block, "source"));
    const mediaUrl = safeMedia(attr(block, "url"));
    const enclosure = safeMedia(attr(block.match(/<enclosure[^>]*>/i)?.[0] ?? "", "url"));
    const image = mediaUrl || enclosure || undefined;
    const videoCandidate = safeMedia(attr(block.match(/<(?:media:content|enclosure)[^>]*>/i)?.[0] ?? "", "url"));
    return { title, link, pubDate, source, image, video: videoCandidate || undefined };
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
    const seenTitles = new Set<string>();
    const seenUrls = new Set<string>();

    return feeds.flat()
      .filter(item => {
        if (!item.pubDate) return false;
        const timestamp = Date.parse(item.pubDate);
        if (!Number.isFinite(timestamp) || timestamp < cutoff) return false;
        const titleKey = normalizeTitle(item.title);
        const urlKey = canonicalUrl(item.link);
        if (!titleKey || seenTitles.has(titleKey) || seenUrls.has(urlKey)) return false;
        seenTitles.add(titleKey);
        seenUrls.add(urlKey);
        return true;
      })
      .sort((a, b) => Date.parse(b.pubDate!) - Date.parse(a.pubDate!))
      .slice(0, 24);
  } catch {
    return [];
  }
}

export const revalidate = 300;

export default async function NewsPage() {
  const items = await getNews();
  const lead = items[0];
  const rest = items.slice(1);

  return <main className="min-h-screen bg-white px-4 py-8 text-black sm:px-6 sm:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="border-y-4 border-black py-5 text-center">
        <p className="text-xs font-black uppercase tracking-[.3em] text-black/55">TargetBud Daily</p>
        <h1 className="mt-1 font-serif text-5xl font-black tracking-[-.04em] sm:text-7xl">THE DAILY</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-black/15 pt-3 text-[10px] font-bold uppercase tracking-[.16em] text-black/55">
          <span>Latest India & World</span><span>•</span><span>Business</span><span>•</span><span>Technology</span><span>•</span><span>Sports</span><span>•</span><span>Entertainment</span>
        </div>
      </header>

      {!items.length ? <section className="mx-auto mt-10 max-w-2xl border border-black/10 p-8 text-center"><h2 className="text-xl font-black">Fresh edition temporarily unavailable</h2><p className="mt-2 text-sm text-black/55">No stale or fabricated headlines are shown. The edition will refresh when verified upstream feeds provide recent stories.</p></section> : <>
        <section className="mt-8 grid gap-8 border-b border-black/15 pb-8 lg:grid-cols-[1.5fr_1fr]">
          <article>
            {lead.image && <img src={lead.image} alt="" className="mb-5 aspect-[16/9] w-full rounded-sm object-cover" loading="eager" />}
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-black/45">Lead story</p>
            <h2 className="mt-2 font-serif text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">{lead.title}</h2>
            <p className="mt-3 text-xs text-black/50">{lead.source || "Verified news feed"} · {lead.pubDate ? new Date(lead.pubDate).toLocaleString("en-IN") : "Latest"}</p>
            {lead.video && <div className="mt-5 overflow-hidden rounded-sm border border-black/10 bg-black"><video className="aspect-video w-full" controls preload="metadata" src={lead.video}>Your browser does not support video playback.</video></div>}
            <a className="mt-5 inline-block border-b-2 border-black pb-1 text-sm font-black" href={lead.link} target="_blank" rel="noreferrer">Read the original report →</a>
          </article>
          <aside className="border-t-4 border-black pt-4 lg:border-l lg:border-t-0 lg:pl-6">
            <p className="text-xs font-black uppercase tracking-[.18em]">Latest updates</p>
            <div className="mt-3 divide-y divide-black/10">{rest.slice(0, 5).map((item, i) => <article key={`${canonicalUrl(item.link)}-${i}`} className="py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">{item.source || "News"}</p>
              <h3 className="mt-1 font-serif text-xl font-bold leading-tight">{item.title}</h3>
              <a className="mt-2 inline-block text-xs font-bold underline" href={item.link} target="_blank" rel="noreferrer">Read source</a>
            </article>)}</div>
          </aside>
        </section>

        <section className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(5).map((item, i) => <article key={`${canonicalUrl(item.link)}-${i}`} className="border-t-2 border-black pt-4">
            {item.image && <img src={item.image} alt="" className="mb-4 aspect-[16/9] w-full object-cover" loading="lazy" />}
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-black/45">{item.source || "News"} · {item.pubDate ? new Date(item.pubDate).toLocaleString("en-IN") : "Latest"}</p>
            <h2 className="mt-2 font-serif text-2xl font-bold leading-tight">{item.title}</h2>
            {item.video && <div className="mt-4 overflow-hidden rounded-sm border border-black/10 bg-black"><video className="aspect-video w-full" controls preload="metadata" src={item.video}>Your browser does not support video playback.</video></div>}
            <a className="mt-4 inline-block text-sm font-bold underline" href={item.link} target="_blank" rel="noreferrer">Read source →</a>
          </article>)}
        </section>

        <footer className="mt-12 border-t-4 border-black py-5 text-center text-xs text-black/50">
          Freshness window: 48 hours · refreshed every 5 minutes · duplicate headlines and canonical URLs are filtered before display.
        </footer>
      </>}
    </div>
  </main>;
}
