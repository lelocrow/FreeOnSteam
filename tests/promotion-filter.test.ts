import { describe, expect, it } from "vitest";

import { validatePromotion } from "@/lib/promotion-filter";
import type { SteamAppData } from "@/lib/steam/types";

const paidGame: SteamAppData = {
  type: "game",
  name: "A Normally Paid Game",
  is_free: false,
  header_image:
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/123/header.jpg",
  short_description: "A complete base game.",
  genres: [{ description: "Adventure" }],
  price_overview: {
    currency: "BRL",
    initial: 4999,
    final: 0,
    discount_percent: 100,
  },
};

describe("validatePromotion", () => {
  it("accepts a normally paid base game discounted by 100%", () => {
    const decision = validatePromotion(123, paidGame);

    expect(decision.accepted).toBe(true);
    if (decision.accepted) {
      expect(decision.promotion).toMatchObject({
        appid: 123,
        originalPriceCents: 4999,
        currentPriceCents: 0,
        discountPercent: 100,
        storeUrl: "https://store.steampowered.com/app/123",
        steamClientUrl: "steam://store/123",
      });
    }
  });

  it.each([
    ["permanently free game", { is_free: true, price_overview: undefined }],
    ["Free-to-Play genre", { genres: [{ description: "Free to Play" }] }],
    ["Free-to-Play description", { short_description: "A free-to-play adventure." }],
  ])("rejects %s", (_name, override) => {
    expect(validatePromotion(123, { ...paidGame, ...override })).toEqual({
      accepted: false,
      reason: "free-to-play",
    });
  });

  it.each(["demo", "dlc", "music", "software", "video"])(
    "rejects Steam type %s",
    (type) => {
      expect(validatePromotion(123, { ...paidGame, type })).toEqual({
        accepted: false,
        reason: "not-game",
      });
    },
  );

  it.each([
    "Play free this weekend only.",
    "Try the full game in a limited-time trial.",
    "Join the free trial today.",
  ])("rejects temporary access: %s", (short_description) => {
    expect(
      validatePromotion(123, { ...paidGame, short_description }),
    ).toEqual({ accepted: false, reason: "temporary-access" });
  });

  it.each([
    undefined,
    { currency: "BRL", initial: 0, final: 0, discount_percent: 100 },
    { currency: "BRL", initial: 4999, final: 100, discount_percent: 98 },
    { currency: "BRL", initial: 4999, final: 0, discount_percent: 99 },
  ])("rejects incomplete or non-100%% pricing", (price_overview) => {
    const decision = validatePromotion(123, { ...paidGame, price_overview });
    expect(decision.accepted).toBe(false);
  });

  it("drops an untrusted artwork URL while keeping an otherwise valid offer", () => {
    const decision = validatePromotion(123, {
      ...paidGame,
      header_image: "https://example.com/untrusted.jpg",
    });

    expect(decision.accepted).toBe(true);
    if (decision.accepted) expect(decision.promotion.headerImage).toBeNull();
  });
});
