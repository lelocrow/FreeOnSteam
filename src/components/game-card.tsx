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
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-[#0b1727]/90 shadow-xl shadow-black/15 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-cyan-950/20 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[460/215] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.16),transparent_35%),linear-gradient(135deg,#10233a,#09131f)]">
        {game.headerImage && !imageFailed ? (
          <Image
            src={game.headerImage}
            alt={`${game.name} store artwork`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center" role="img" aria-label={`${game.name} artwork unavailable`}>
            <span className="grid size-14 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/8 text-2xl font-semibold text-cyan-200">F</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1727] to-transparent" />
        <span className="absolute right-4 top-4 rounded-full border border-emerald-200/20 bg-emerald-400/90 px-3 py-1 text-xs font-extrabold tracking-wide text-emerald-950 shadow-lg">100% OFF</span>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 min-h-14 text-lg font-semibold leading-7 tracking-[-0.02em] text-white">{game.name}</h3>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.13em] text-slate-500">Regular price</p>
            <s className="mt-1 block text-sm font-medium text-slate-300">{formatPrice(game.originalPriceCents, game.currency)}</s>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.13em] text-slate-500">Now</p>
            <p className="mt-1 text-sm font-bold text-emerald-300">Free to keep</p>
          </div>
        </div>

        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="text-xs text-slate-500">{formatEndDate(game.promotionEndsAt)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={game.steamClientUrl}
              aria-describedby={hintId}
              onClick={() => setSteamHintVisible(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 px-3 text-center text-sm font-semibold text-[#05121d] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none"
            >
              Open Steam app
            </a>
            <a
              href={game.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-center text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none"
            >
              Open browser
            </a>
          </div>
          <p id={hintId} className="mt-3 min-h-8 text-xs leading-4 text-slate-500" aria-live="polite">
            {steamHintVisible ? "If Steam did not open, use the browser button. Complete the claim inside Steam." : "You must complete the add-to-account action inside Steam."}
          </p>
        </div>
      </div>
    </article>
  );
}
