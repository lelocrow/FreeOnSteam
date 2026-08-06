import { NextResponse } from "next/server";

import { runtimeConfig } from "@/lib/environment";
import { GamesRepository } from "@/lib/firestore/repository";
import { buildGamesResponse } from "@/lib/games-response";
import { logger, safeErrorMessage } from "@/lib/logger";
import type { GamesResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const snapshot = await new GamesRepository().getSnapshot();
    return NextResponse.json(
      buildGamesResponse(snapshot, new Date(), runtimeConfig.staleAfterMinutes),
      { headers: cacheHeaders },
    );
  } catch (error) {
    logger.error("games_api_failed", { failureReason: safeErrorMessage(error) });
    const safeResponse: GamesResponse = { updatedAt: null, stale: true, games: [] };
    return NextResponse.json(safeResponse, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
