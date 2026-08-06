import { GameCard } from "@/components/game-card";
import { GamesRepository } from "@/lib/firestore/repository";
import { buildGamesResponse } from "@/lib/games-response";
import { logger, safeErrorMessage } from "@/lib/logger";
import type { GamesResponse } from "@/lib/types";
import { runtimeConfig } from "@/lib/environment";

export const dynamic = "force-dynamic";

function formatCheckedAt(value: string | null): string {
  if (!value) return "No successful check yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

async function loadGames(): Promise<GamesResponse | null> {
  try {
    const snapshot = await new GamesRepository().getSnapshot();
    return buildGamesResponse(snapshot, new Date(), runtimeConfig.staleAfterMinutes);
  } catch (error) {
    logger.error("homepage_data_load_failed", {
      failureReason: safeErrorMessage(error),
    });
    return null;
  }
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3" aria-label="FreeOnSteam home">
      <span className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_32px_rgba(34,211,238,0.12)]">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
          <path d="M7 8.5h18v4H11v3h11v4H11v5H7z" fill="currentColor" />
          <circle cx="23.5" cy="23.5" r="3.5" fill="#67e8f9" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-[-0.03em] text-white">
        Free<span className="text-cyan-300">On</span>Steam
      </span>
    </div>
  );
}

export default async function Home() {
  const response = await loadGames();
  const gameCount = response?.games.length ?? 0;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FreeOnSteam",
    description: "Paid Steam games temporarily available to keep for free.",
    url: process.env.SITE_URL || "http://localhost:3000",
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.14),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <header className="relative border-b border-white/8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="#main-content" className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
            <BrandMark />
          </a>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
            Brazilian store validation
          </span>
        </div>
      </header>

      <main id="main-content" className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-10">
        <section className="max-w-4xl" aria-labelledby="page-title">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
            Checked every 30 minutes
          </div>
          <h1 id="page-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            Paid games. <span className="text-slate-400">Zero price.</span>{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Yours to keep.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
            FreeOnSteam filters genuine 100% discounts on normally paid Steam games. Open an offer and complete the add-to-account action inside Steam.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
              {gameCount} active {gameCount === 1 ? "offer" : "offers"}
            </span>
            <span>Last checked: {formatCheckedAt(response?.updatedAt ?? null)}</span>
          </div>
        </section>

        {response?.stale && (
          <aside className="mt-10 flex max-w-3xl gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-6 text-amber-100" role="status">
            <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            </svg>
            <p>These results may be stale because a recent Steam check has not completed. Verify every offer on Steam before relying on it.</p>
          </aside>
        )}

        <section className="mt-16" aria-labelledby="offers-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Live offers</p>
              <h2 id="offers-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Available to claim</h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">Prices can vary by account region.</p>
          </div>

          {!response ? (
            <div className="rounded-3xl border border-rose-300/15 bg-rose-300/5 px-6 py-14 text-center">
              <h3 className="text-lg font-semibold text-white">Offers are temporarily unavailable</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">The cached results could not be loaded. Please try again shortly; no unverified game data is shown.</p>
            </div>
          ) : response.games.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-16 text-center shadow-2xl shadow-black/10">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7.5h16v11H4zM8 7.5V5h8v2.5M9 12h6" /></svg>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">No verified offers right now</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">That is normal. We will keep checking for paid games with a real 100% discount and list them only when the evidence is complete.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {response.games.map((game) => <GameCard key={game.appid} game={game} />)}
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-4 border-t border-white/8 pt-10 md:grid-cols-3" aria-label="How validation works">
          {[
            ["01", "Normally paid", "The original Brazilian store price must be greater than zero."],
            ["02", "Exactly 100% off", "Current price, discount, and item type must all confirm the offer."],
            ["03", "Claim in Steam", "Open the listing and add the license to your account before it ends."],
          ].map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <span className="font-mono text-xs text-cyan-300">{number}</span>
              <h2 className="mt-4 font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs leading-5 text-slate-500 sm:px-8 lg:px-10">
          <p>FreeOnSteam is an independent project and is not affiliated with, endorsed by, or sponsored by Valve Corporation or Steam.</p>
          <p>Availability and pricing are validated for the Brazilian Steam region and can differ for your account. Always verify the offer and complete the claim on Steam.</p>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </div>
  );
}
