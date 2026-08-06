import type {
  PromotionDecision,
  SteamAppData,
  ValidatedPromotion,
} from "@/lib/steam/types";

const freeToPlayPatterns = [
  /free[ -]?to[ -]?play/i,
  /play for free/i,
  /always free/i,
];

const temporaryAccessPatterns = [
  /free weekend/i,
  /free week(?!ly)/i,
  /free trial/i,
  /limited[- ]time trial/i,
  /play free (?:this|for the) weekend/i,
];

function matchesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function searchableText(data: SteamAppData): string {
  return [
    data.name,
    data.short_description,
    ...(data.genres?.map((genre) => genre.description) ?? []),
    ...(data.categories?.map((category) => category.description) ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function sanitizedName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
}

function slugify(name: string, appid: number): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `game-${appid}`;
}

function safeHeaderImage(value?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const allowedHost =
      url.hostname.endsWith(".steamstatic.com") ||
      url.hostname.endsWith(".akamaihd.net");
    return url.protocol === "https:" && allowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export function validatePromotion(
  appid: number,
  data: SteamAppData,
): PromotionDecision {
  if (data.type !== "game") {
    return { accepted: false, reason: "not-game" };
  }

  const text = searchableText(data);
  if (data.is_free !== false || matchesAny(text, freeToPlayPatterns)) {
    return { accepted: false, reason: "free-to-play" };
  }

  if (matchesAny(text, temporaryAccessPatterns)) {
    return { accepted: false, reason: "temporary-access" };
  }

  const price = data.price_overview;
  if (!price || !/^[A-Z]{3}$/.test(price.currency.toUpperCase())) {
    return { accepted: false, reason: "ambiguous-pricing" };
  }

  if (
    price.initial <= 0 ||
    price.final !== 0 ||
    price.discount_percent !== 100
  ) {
    return { accepted: false, reason: "not-fully-discounted" };
  }

  const name = sanitizedName(data.name);
  if (!name) {
    return { accepted: false, reason: "unavailable" };
  }

  const promotion: ValidatedPromotion = {
    appid,
    name,
    slug: slugify(name, appid),
    type: "game",
    headerImage: safeHeaderImage(data.header_image),
    originalPriceCents: price.initial,
    currentPriceCents: 0,
    currency: price.currency.toUpperCase(),
    discountPercent: 100,
    storeUrl: `https://store.steampowered.com/app/${appid}`,
    steamClientUrl: `steam://store/${appid}`,
    promotionEndsAt: null,
  };

  return { accepted: true, promotion };
}
