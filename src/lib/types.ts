export type PromotionGame = {
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
  promotionDetectedAt: Date;
  lastValidatedAt: Date;
  promotionEndsAt: Date | null;
  isActive: true;
};

export type PublicGame = Omit<
  PromotionGame,
  "promotionDetectedAt" | "lastValidatedAt" | "promotionEndsAt" | "isActive"
> & {
  promotionDetectedAt: string;
  lastValidatedAt: string;
  promotionEndsAt: string | null;
};

export type SyncStatus = "never" | "running" | "success" | "failure";

export type SyncState = {
  status: SyncStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  lastSuccessfulAt: Date | null;
  candidateCount: number;
  validPromotionCount: number;
  rejectedCount: number;
  failureReason: string | null;
};

export type GamesSnapshot = {
  games: PromotionGame[];
  sync: SyncState;
};

export type GamesResponse = {
  updatedAt: string | null;
  stale: boolean;
  games: PublicGame[];
};
