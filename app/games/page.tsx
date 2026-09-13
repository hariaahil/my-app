import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games",
  description: "Play lightweight browser games and the new Skyfall Arena multiplayer 3D experience from TargetBud.",
  alternates: { canonical: "/games" },
  openGraph: { title: "Games | TargetBud", description: "Play browser games and Skyfall Arena multiplayer 3D on TargetBud.", url: "/games" },
};

const games = [
  { name: "Skyfall Arena", description: "A social 3D multiplayer island. Share a room, explore together and outlast the crowd.", href: "/games/skyfall-arena", featured: true },
  { name: "Number Guess", description: "Guess the hidden number in as few attempts as possible.", href: "/games/number-guess" },
  { name: "Quick Math", description: "Solve short arithmetic challenges against the clock.", href: "/games/quick-math" },
];

export default function GamesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">TargetBud Games</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Play together</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">Quick solo games plus a new multiplayer 3D experience designed for short, shareable sessions.</p>
      </header>
      <section aria-labelledby="games-heading" className="mt-8">
        <h2 id="games-heading" className="sr-only">Available games</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <a key={game.href} href={game.href} className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black ${game.featured ? "border-black bg-black text-white sm:col-span-2" : "border-black/10"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${game.featured ? "text-white/50" : "text-black/40"}`}>{game.featured ? "Featured · Multiplayer 3D" : "TargetBud Games"}</p>
              <h3 className="mt-2 text-lg font-black">{game.name}</h3>
              <p className={`mt-2 text-sm leading-6 ${game.featured ? "text-white/65" : "text-black/55"}`}>{game.description}</p>
              <span className={`mt-4 inline-block text-xs font-bold underline underline-offset-4 ${game.featured ? "text-white" : "text-black"}`}>{game.featured ? "Enter arena →" : "Play game →"}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
