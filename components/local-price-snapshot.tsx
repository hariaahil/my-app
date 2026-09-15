"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Fuel, MapPin, RefreshCw } from "lucide-react";

type LocalData = {
  city: string;
  state?: string;
  gold24?: number;
  gold22?: number;
  petrol?: number;
  diesel?: number;
  updatedAt?: string;
};

const FALLBACK_CITY = "Hyderabad";

function money(value: number | undefined, decimals = 0) {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
}

async function loadPrices(city: string) {
  const [goldResponse, fuelResponse] = await Promise.all([
    fetch("https://api.goldprice.dev/v1/carat?currency=INR", { cache: "no-store" }),
    fetch(`https://api.apimitra.in/fuel?city=${encodeURIComponent(city)}`, { cache: "no-store" }),
  ]);

  const gold = goldResponse.ok ? await goldResponse.json() : null;
  const fuel = fuelResponse.ok ? await fuelResponse.json() : null;

  return {
    city: fuel?.price?.location || city,
    gold24: Number(gold?.price_gram_24k),
    gold22: Number(gold?.price_gram_22k),
    petrol: Number(fuel?.price?.petrol?.price),
    diesel: Number(fuel?.price?.diesel?.price),
    updatedAt: gold?.timestamp || fuel?.fetched_at,
  } satisfies LocalData;
}

export default function LocalPriceSnapshot() {
  const [data, setData] = useState<LocalData | null>(null);
  const [city, setCity] = useState(FALLBACK_CITY);
  const [status, setStatus] = useState<"locating" | "ready" | "fallback" | "error">("locating");

  async function refresh(useLocation = true) {
    setStatus(useLocation ? "locating" : "ready");
    let resolvedCity = FALLBACK_CITY;

    if (useLocation && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            maximumAge: 15 * 60 * 1000,
            timeout: 7000,
          }),
        );
        const { latitude, longitude } = position.coords;
        const geo = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { cache: "no-store" },
        );
        if (geo.ok) {
          const place = await geo.json();
          resolvedCity = place.city || place.locality || place.principalSubdivision || FALLBACK_CITY;
        }
      } catch {
        setStatus("fallback");
      }
    } else if (!useLocation) {
      setStatus("fallback");
    }

    try {
      const prices = await loadPrices(resolvedCity);
      setCity(prices.city || resolvedCity);
      setData(prices);
      setStatus(resolvedCity === FALLBACK_CITY && useLocation ? "fallback" : "ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => void refresh(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const locationLabel = status === "locating" ? "Finding your city…" : status === "fallback" ? `Using ${city} · location unavailable` : city;

  return <>
    <Link href="/search?q=Gold%20price" className="group bg-white p-5 transition hover:bg-black/[.025]">
      <div className="flex items-center gap-2"><Coins size={17} /><span className="text-xs font-bold text-black/50">Gold · India</span>{data?.gold24 != null && <span className="ml-auto size-1.5 rounded-full bg-black" aria-label="Live gold data" />}</div>
      <p className="mt-5 text-2xl font-black tracking-tight">{money(data?.gold24)}/g</p>
      <p className="mt-1 text-xs text-black/45">24K · 22K {money(data?.gold22)}/g · metal value</p>
    </Link>
    <Link href={`/search?q=${encodeURIComponent(`${city} petrol price`)}`} className="group bg-white p-5 transition hover:bg-black/[.025]">
      <div className="flex items-center gap-2"><Fuel size={17} /><span className="text-xs font-bold text-black/50">Fuel · {city}</span>{data?.petrol != null && <span className="ml-auto size-1.5 rounded-full bg-black" aria-label="Live fuel data" />}</div>
      <p className="mt-5 text-2xl font-black tracking-tight">{money(data?.petrol, 2)}/L</p>
      <p className="mt-1 text-xs text-black/45">Diesel {money(data?.diesel, 2)}/L · local city price</p>
    </Link>
    <div className="col-span-full flex items-center justify-between gap-3 bg-white px-5 py-2.5 text-[11px] text-black/45">
      <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{locationLabel}</span>
      <button type="button" onClick={() => void refresh(true)} className="inline-flex items-center gap-1.5 font-bold text-black/60 hover:text-black" aria-label="Refresh local prices"><RefreshCw size={13} />Refresh</button>
    </div>
  </>;
}
