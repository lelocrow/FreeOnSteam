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
    <div className="flex items-center gap-2.5" aria-label="FreeOnSteam home">
      <span className="grid size-7 place-items-center rounded-md bg-cyan-300 text-xs font-bold text-[#05121d]">
        F
      </span>
      <span className="text-base font-semibold tracking-[-0.02em] text-white">
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
    <div className="flex min-h-screen flex-col bg-[#07111f] text-slate-100">
      <header className="border-b border-white/10 bg-[#081422]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <a href="#main-content" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
            <BrandMark />
          </a>
          <div className="text-right text-xs leading-5 text-slate-400">
            <p className="font-medium text-slate-200">
              {gameCount} active {gameCount === 1 ? "offer" : "offers"}
            </p>
            <p className="hidden sm:block">
              Last checked {formatCheckedAt(response?.updatedAt ?? null)}
            </p>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        {response?.stale && (
          <aside className="mb-6 flex gap-3 rounded-lg border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-6 text-amber-100" role="status">
            <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            </svg>
            <p>These results may be stale because a recent Steam check has not completed. Verify every offer on Steam before relying on it.</p>
          </aside>
        )}

        <section aria-labelledby="offers-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h1 id="offers-title" className="text-xl font-semibold tracking-[-0.02em] text-white">
              Free games to keep
            </h1>
            <p className="text-xs text-slate-500 sm:hidden">
              Updated {formatCheckedAt(response?.updatedAt ?? null)}
            </p>
          </div>

          {!response ? (
            <div className="rounded-xl border border-rose-300/15 bg-rose-300/5 px-6 py-12 text-center">
              <h2 className="text-base font-semibold text-white">Offers are temporarily unavailable</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">The cached results could not be loaded. Please try again shortly; no unverified game data is shown.</p>
            </div>
          ) : response.games.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] px-6 py-12 text-center">
              <h2 className="text-base font-semibold text-white">No verified offers right now</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">The list is checked every 30 minutes. Only paid games with a verified 100% discount appear here.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {response.games.map((game) => <GameCard key={game.appid} game={game} />)}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#081422]">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-5 text-xs leading-5 text-slate-500 sm:grid-cols-2 sm:px-8 lg:px-10">
          <p>Independent project. Not affiliated with Valve Corporation or Steam.</p>
          <p className="sm:text-right">Prices are checked in the Brazilian Steam region and may vary. Complete the claim inside Steam.</p>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </div>
  );
}
