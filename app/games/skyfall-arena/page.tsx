import type { Metadata } from "next";
import SkyfallArena from "./SkyfallArena";

export const metadata: Metadata = {
  title: "Skyfall Arena",
  description: "A fast, social 3D multiplayer arena built for TargetBud. Join a room, explore the island and outlast the crowd.",
  alternates: { canonical: "/games/skyfall-arena" },
  openGraph: { title: "Skyfall Arena | TargetBud", description: "A fast, social 3D multiplayer arena built for TargetBud.", url: "/games/skyfall-arena" },
};

export default function SkyfallArenaPage() {
  return <SkyfallArena />;
}
