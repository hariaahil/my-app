import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Skyfall Arena",
  description: "A fast, social 3D multiplayer arena built for TargetBud. Join the shared lobby before entering the island.",
  alternates: { canonical: "/games/skyfall-arena/lobby" },
  openGraph: { title: "Skyfall Arena | TargetBud", description: "Join the Skyfall Arena lobby and enter the shared 3D multiplayer island.", url: "/games/skyfall-arena/lobby" },
};

export default function SkyfallArenaPage() {
  redirect("/games/skyfall-arena/lobby");
}
