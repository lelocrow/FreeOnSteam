"use client";

import Image from "next/image";
import { useState } from "react";

import type { PublicGame } from "@/lib/types";

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatEndDate(value: string | null): string {
  if (!value) return "End time not published";
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function GameCard({ game }: { game: PublicGame }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [steamHintVisible, setSteamHintVisible] = useState(false);
  const hintId = `steam-hint-${game.appid}`;

  return (
    <article className="group grid gap-4 py-5 sm:grid-cols-[minmax(260px,38%)_minmax(0,1fr)] sm:items-center sm:gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_11rem] lg:gap-6">
      <div className="relative aspect-[460/215] overflow-hidden rounded-lg bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.16),transparent_35%),linear-gradient(135deg,#10233a,#09131f)] sm:row-span-2 lg:row-span-1">
        {game.headerImage && !imageFailed ? (
          <Image
            src={game.headerImage}
            alt={`${game.name} store artwork`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 38vw, 380px"
            className="object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center" role="img" aria-label={`${game.name} artwork unavailable`}>
            <span className="grid size-14 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/8 text-2xl font-semibold text-cyan-200">F</span>
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-md border border-emerald-200/20 bg-emerald-400/90 px-2.5 py-1 text-xs font-bold tracking-wide text-emerald-950">100% OFF</span>
      </div>

      <div className="min-w-0 sm:col-start-2">
        <h3 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-white">{game.name}</h3>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.13em] text-slate-500">Regular price</p>
            <s className="mt-1 block text-sm font-medium text-slate-300">{formatPrice(game.originalPriceCents, game.currency)}</s>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.13em] text-slate-500">Now</p>
            <p className="mt-1 text-sm font-bold text-emerald-300">Free to keep</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{formatEndDate(game.promotionEndsAt)}</p>
        <p id={hintId} className="mt-2 text-xs leading-5 text-slate-500" aria-live="polite">
          {steamHintVisible ? "If Steam did not open, use the browser button. Complete the claim inside Steam." : "Complete the add-to-account action inside Steam."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:col-start-2 lg:col-start-3 lg:row-start-1 lg:grid-cols-1">
        <a
          href={game.steamClientUrl}
          aria-describedby={hintId}
          onClick={() => setSteamHintVisible(true)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-300 px-3 text-center text-sm font-semibold text-[#05121d] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none"
        >
          Open Steam app
        </a>
        <a
          href={game.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/12 bg-white/5 px-3 text-center text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none"
        >
          Open browser
        </a>
      </div>
    </article>
  );
}
