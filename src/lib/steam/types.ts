export type SteamPriceOverview = {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  final_formatted?: string;
};

export type SteamPackageOption = {
  option_text?: string;
  is_free_license?: boolean;
  price_in_cents_with_discount?: number;
};

export type SteamAppData = {
  type: string;
  name: string;
  is_free?: boolean;
  header_image?: string;
  short_description?: string;
  price_overview?: SteamPriceOverview;
  genres?: Array<{ description?: string }>;
  categories?: Array<{ description?: string }>;
  package_groups?: Array<{ subs?: SteamPackageOption[] }>;
};

export type ValidatedPromotion = {
  appid: number;
  name: string;
  slug: string;
  type: "game";
  headerImage: string | null;
  originalPriceCents: number;
  currentPriceCents: 0;
  currency: string;
  discountPercent: 100;
  storeUrl: string;
  steamClientUrl: string;
  promotionEndsAt: null;
};

export type PromotionRejection = {
  accepted: false;
  reason:
    | "ambiguous-pricing"
    | "free-to-play"
    | "not-game"
    | "not-fully-discounted"
    | "temporary-access"
    | "unavailable";
};

export type PromotionDecision =
  | { accepted: true; promotion: ValidatedPromotion }
  | PromotionRejection;
