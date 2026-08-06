import type {
  GamesResponse,
  GamesSnapshot,
  PromotionGame,
  PublicGame,
} from "@/lib/types";

function sortGames(games: PromotionGame[]): PromotionGame[] {
  return [...games].sort((left, right) => {
    if (left.promotionEndsAt && right.promotionEndsAt) {
      return left.promotionEndsAt.getTime() - right.promotionEndsAt.getTime();
    }
    if (left.promotionEndsAt) return -1;
    if (right.promotionEndsAt) return 1;
    return left.name.localeCompare(right.name, "en");
  });
}

function toPublicGame(game: PromotionGame): PublicGame {
  const { isActive: _isActive, ...publicFields } = game;
  void _isActive;
  return {
    ...publicFields,
    promotionDetectedAt: game.promotionDetectedAt.toISOString(),
    lastValidatedAt: game.lastValidatedAt.toISOString(),
    promotionEndsAt: game.promotionEndsAt?.toISOString() ?? null,
  };
}

export function buildGamesResponse(
  snapshot: GamesSnapshot,
  now = new Date(),
  staleAfterMinutes = 90,
): GamesResponse {
  const updatedAt = snapshot.sync.lastSuccessfulAt;
  const staleThresholdMs = staleAfterMinutes * 60_000;
  const stale =
    !updatedAt || now.getTime() - updatedAt.getTime() > staleThresholdMs;

  return {
    updatedAt: updatedAt?.toISOString() ?? null,
    stale,
    games: sortGames(snapshot.games).map(toPublicGame),
  };
}
