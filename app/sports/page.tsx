type Match = { name?: string; shortName?: string; status?: { type?: { shortDetail?: string } } };

async function getMatches(): Promise<Match[]> {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/cricket/8048/scoreboard", { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.events ?? []).slice(0, 12) as Match[];
  } catch { return []; }
}

export const revalidate = 300;

export default async function SportsPage() {
  const matches = await getMatches();
  return <main className="min-h-screen bg-white px-4 py-10 text-black sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-black/45">Sports</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight">Live cricket centre</h1>
    <p className="mt-2 text-black/55">Current cricket fixtures and scores from ESPN. Coverage and timing depend on the upstream feed.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{matches.map((match, i)=><article key={`${match.name}-${i}`} className="rounded-3xl border border-black/10 p-6"><p className="font-bold">{match.name ?? match.shortName ?? "Cricket match"}</p><p className="mt-3 text-sm text-black/55">{match.status?.type?.shortDetail ?? "Status unavailable"}</p></article>)}{!matches.length&&<article className="rounded-3xl border border-black/10 p-6 md:col-span-2 lg:col-span-3"><p className="font-bold">Sports feed temporarily unavailable.</p><p className="mt-2 text-sm text-black/55">No score or fixture is fabricated; retry when the upstream feed is available.</p></article>}</div>
  </div></main>;
}
