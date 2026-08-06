import { NextResponse } from "next/server";

import { runtimeConfig } from "@/lib/environment";
import { GamesRepository } from "@/lib/firestore/repository";
import { buildGamesResponse } from "@/lib/games-response";
import { logger, safeErrorMessage } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await new GamesRepository().getSnapshot();
    const response = buildGamesResponse(
      snapshot,
      new Date(),
      runtimeConfig.staleAfterMinutes,
    );
    const healthy = response.updatedAt !== null && !response.stale;
    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        updatedAt: response.updatedAt,
        stale: response.stale,
      },
      {
        status: healthy ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    logger.error("health_api_failed", { failureReason: safeErrorMessage(error) });
    return NextResponse.json(
      { status: "degraded", updatedAt: null, stale: true },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
