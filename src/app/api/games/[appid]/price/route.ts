import { NextRequest, NextResponse } from "next/server";

import { GamesRepository } from "@/lib/firestore/repository";
import { logger, safeErrorMessage } from "@/lib/logger";
import {
  fallbackRegionalPrice,
  resolveRegionalPrice,
} from "@/lib/regional-price";
import { normalizeStoreCountry } from "@/lib/store-region";
import { SteamStoreClient } from "@/lib/steam/client";
import type { PromotionGame, RegionalPriceResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ appid: string }>;
};

type CacheEntry = {
  expiresAt: number;
  response: RegionalPriceResponse;
};

const regionalPriceCache = new Map<string, CacheEntry>();
const successfulCacheMs = 6 * 60 * 60 * 1_000;
const fallbackCacheMs = 15 * 60 * 1_000;
const maxCacheEntries = 250;

function responseHeaders(response: RegionalPriceResponse) {
  const sharedMaxAge = response.fallback ? 900 : 21_600;
  return {
    "Cache-Control": `public, max-age=300, s-maxage=${sharedMaxAge}, stale-while-revalidate=86400`,
  };
}

function readCache(key: string): RegionalPriceResponse | null {
  const cached = regionalPriceCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    regionalPriceCache.delete(key);
    return null;
  }
  return cached.response;
}

function writeCache(key: string, response: RegionalPriceResponse): void {
  if (regionalPriceCache.size >= maxCacheEntries) {
    const oldestKey = regionalPriceCache.keys().next().value;
    if (oldestKey) regionalPriceCache.delete(oldestKey);
  }

  regionalPriceCache.set(key, {
    expiresAt:
      Date.now() + (response.fallback ? fallbackCacheMs : successfulCacheMs),
    response,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { appid: appidValue } = await context.params;
  const appid = Number.parseInt(appidValue, 10);
  if (!Number.isSafeInteger(appid) || appid <= 0 || String(appid) !== appidValue) {
    return NextResponse.json(
      { error: "Invalid Steam App ID." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const country = normalizeStoreCountry(request.nextUrl.searchParams.get("country"));
  let game: PromotionGame | undefined;

  try {
    const snapshot = await new GamesRepository().getSnapshot();
    game = snapshot.games.find((candidate) => candidate.appid === appid);
    if (!game) {
      return NextResponse.json(
        { error: "Active offer not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const cacheKey = `${appid}:${country}`;
    const cached = readCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: responseHeaders(cached) });
    }

    const response = await resolveRegionalPrice(
      game,
      country,
      async (candidateAppid, candidateCountry) =>
        new SteamStoreClient(fetch, { country: candidateCountry }).validateCandidate(
          candidateAppid,
        ),
    );
    writeCache(cacheKey, response);
    return NextResponse.json(response, { headers: responseHeaders(response) });
  } catch (error) {
    logger.warning("regional_price_lookup_failed", {
      appid,
      country,
      failureReason: safeErrorMessage(error),
    });

    if (game) {
      return NextResponse.json(fallbackRegionalPrice(game, true), {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    return NextResponse.json(
      { error: "Regional pricing is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
