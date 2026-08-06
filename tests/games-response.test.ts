import { describe, expect, it } from "vitest";

import { buildGamesResponse } from "@/lib/games-response";
import type { GamesSnapshot, PromotionGame } from "@/lib/types";

function game(
  appid: number,
  name: string,
  promotionEndsAt: Date | null,
): PromotionGame {
  return {
    appid,
    name,
    slug: name.toLowerCase(),
    type: "game",
    headerImage: null,
    originalPriceCents: 1000,
    currentPriceCents: 0,
    currency: "BRL",
    discountPercent: 100,
    storeUrl: `https://store.steampowered.com/app/${appid}`,
    steamClientUrl: `steam://store/${appid}`,
    promotionDetectedAt: new Date("2026-08-01T00:00:00Z"),
    lastValidatedAt: new Date("2026-08-05T12:00:00Z"),
    promotionEndsAt,
    isActive: true,
  };
}

function snapshot(games: PromotionGame[], updatedAt: Date | null): GamesSnapshot {
  return {
    games,
    sync: {
      status: updatedAt ? "success" : "never",
      startedAt: updatedAt,
      completedAt: updatedAt,
      lastSuccessfulAt: updatedAt,
      candidateCount: games.length,
      validPromotionCount: games.length,
      rejectedCount: 0,
      failureReason: null,
    },
  };
}

describe("buildGamesResponse", () => {
  it("returns the stable public schema and sorts known end dates first", () => {
    const result = buildGamesResponse(
      snapshot(
        [
          game(1, "No End", null),
          game(2, "Later", new Date("2026-08-08T00:00:00Z")),
          game(3, "Sooner", new Date("2026-08-07T00:00:00Z")),
        ],
        new Date("2026-08-05T12:00:00Z"),
      ),
      new Date("2026-08-05T12:30:00Z"),
      90,
    );

    expect(result.updatedAt).toBe("2026-08-05T12:00:00.000Z");
    expect(result.stale).toBe(false);
    expect(result.games.map(({ appid }) => appid)).toEqual([3, 2, 1]);
    expect(result.games[0]).not.toHaveProperty("isActive");
  });

  it("marks missing and old synchronization data as stale", () => {
    expect(buildGamesResponse(snapshot([], null)).stale).toBe(true);
    expect(
      buildGamesResponse(
        snapshot([], new Date("2026-08-05T10:00:00Z")),
        new Date("2026-08-05T12:00:00Z"),
        90,
      ).stale,
    ).toBe(true);
  });
});
