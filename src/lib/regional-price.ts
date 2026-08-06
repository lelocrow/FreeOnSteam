import { defaultStoreCountry } from "@/lib/store-region";
import type { PromotionDecision } from "@/lib/steam/types";
import type { PromotionGame, RegionalPriceResponse } from "@/lib/types";

type PromotionValidator = (
  appid: number,
  country: string,
) => Promise<PromotionDecision>;

export function fallbackRegionalPrice(
  game: PromotionGame,
  fallback: boolean,
): RegionalPriceResponse {
  return {
    country: defaultStoreCountry,
    originalPriceCents: game.originalPriceCents,
    currency: game.currency,
    fallback,
  };
}

export async function resolveRegionalPrice(
  game: PromotionGame,
  country: string,
  validate: PromotionValidator,
): Promise<RegionalPriceResponse> {
  if (country === defaultStoreCountry) {
    return fallbackRegionalPrice(game, false);
  }

  const decision = await validate(game.appid, country);
  if (!decision.accepted) {
    return fallbackRegionalPrice(game, true);
  }

  return {
    country,
    originalPriceCents: decision.promotion.originalPriceCents,
    currency: decision.promotion.currency,
    fallback: false,
  };
}
