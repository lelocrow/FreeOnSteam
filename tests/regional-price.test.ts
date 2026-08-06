import { describe, expect, it, vi } from "vitest";

import { resolveRegionalPrice } from "@/lib/regional-price";
import type { PromotionDecision } from "@/lib/steam/types";
import type { PromotionGame } from "@/lib/types";

const game: PromotionGame = {
  appid: 606150,
  name: "Moonlighter",
  slug: "moonlighter",
  type: "game",
  headerImage: null,
  originalPriceCents: 1999,
  currentPriceCents: 0,
  currency: "USD",
  discountPercent: 100,
  storeUrl: "https://store.steampowered.com/app/606150",
  steamClientUrl: "steam://store/606150",
  promotionDetectedAt: new Date("2026-08-06T00:00:00Z"),
  lastValidatedAt: new Date("2026-08-06T00:00:00Z"),
  promotionEndsAt: null,
  isActive: true,
};

function acceptedPromotion(country: string): PromotionDecision {
  return {
    accepted: true,
    promotion: {
      appid: game.appid,
      name: game.name,
      slug: game.slug,
      type: "game",
      headerImage: null,
      originalPriceCents: country === "BR" ? 4100 : 1999,
      currentPriceCents: 0,
      currency: country === "BR" ? "BRL" : "EUR",
      discountPercent: 100,
      storeUrl: game.storeUrl,
      steamClientUrl: game.steamClientUrl,
      promotionEndsAt: null,
    },
  };
}

describe("resolveRegionalPrice", () => {
  it("returns a verified regional price", async () => {
    const validate = vi.fn(async (_appid: number, country: string) =>
      acceptedPromotion(country),
    );

    await expect(resolveRegionalPrice(game, "BR", validate)).resolves.toEqual({
      country: "BR",
      originalPriceCents: 4100,
      currency: "BRL",
      fallback: false,
    });
  });

  it("returns US pricing when the regional promotion is rejected", async () => {
    const validate = vi.fn(async (): Promise<PromotionDecision> => ({
      accepted: false,
      reason: "not-fully-discounted",
    }));

    await expect(resolveRegionalPrice(game, "DE", validate)).resolves.toEqual({
      country: "US",
      originalPriceCents: 1999,
      currency: "USD",
      fallback: true,
    });
  });

  it("uses stored US pricing without another Steam request", async () => {
    const validate = vi.fn();

    await expect(resolveRegionalPrice(game, "US", validate)).resolves.toEqual({
      country: "US",
      originalPriceCents: 1999,
      currency: "USD",
      fallback: false,
    });
    expect(validate).not.toHaveBeenCalled();
  });
});
