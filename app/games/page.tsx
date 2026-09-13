import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games",
  description: "Quick browser games from TargetBud for short breaks and casual play.",
  alternates: { canonical: "/games" },
  openGraph: { title: "Games | TargetBud", description: "Quick browser games from TargetBud for short breaks and casual play.", url: "/games" },
};

const games = [
  { name: "Number Guess", description: "Guess the hidden number in as few attempts as possible.", href: "/games/number-guess" },
  { name: "Quick Math", description: "Solve short arithmetic challenges against the clock.", href: "/games/quick-math" },
];

export default function GamesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">TargetBud Games</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Quick games for short breaks</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">Simple, lightweight browser games with no account required.</p>
      </header>
      <section aria-labelledby="games-heading" className="mt-8">
        <h2 id="games-heading" className="sr-only">Available games</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <a key={game.href} href={game.href} className="rounded-2xl border border-black/10 p-5 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black">
              <h3 className="text-lg font-black">{game.name}</h3>
              <p className="mt-2 text-sm leading-6 text-black/55">{game.description}</p>
              <span className="mt-4 inline-block text-xs font-bold underline underline-offset-4">Play game →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
