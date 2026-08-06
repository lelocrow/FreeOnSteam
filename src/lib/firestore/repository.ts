import {
  FieldValue,
  Firestore,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "@google-cloud/firestore";

import { runtimeConfig } from "@/lib/environment";
import type { GamesSnapshot, PromotionGame, SyncState } from "@/lib/types";
import type { ValidatedPromotion } from "@/lib/steam/types";

const gamesCollection = "games";
const syncDocumentPath = "syncState/current";
const maxAtomicWrites = 499;

let firestoreInstance: Firestore | undefined;

function getFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = new Firestore({
      databaseId: runtimeConfig.firestoreDatabase,
    });
  }
  return firestoreInstance;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function gameFromDocument(
  document: QueryDocumentSnapshot<DocumentData>,
): PromotionGame | null {
  const data = document.data();
  const appid = asFiniteNumber(data.appid);
  const originalPriceCents = asFiniteNumber(data.originalPriceCents);
  const promotionDetectedAt = asDate(data.promotionDetectedAt);
  const lastValidatedAt = asDate(data.lastValidatedAt);

  if (
    !appid ||
    !Number.isSafeInteger(appid) ||
    typeof data.name !== "string" ||
    typeof data.slug !== "string" ||
    data.type !== "game" ||
    !originalPriceCents ||
    originalPriceCents <= 0 ||
    data.currentPriceCents !== 0 ||
    data.discountPercent !== 100 ||
    typeof data.currency !== "string" ||
    !promotionDetectedAt ||
    !lastValidatedAt ||
    data.isActive !== true
  ) {
    return null;
  }

  return {
    appid,
    name: data.name.slice(0, 200),
    slug: data.slug.slice(0, 100),
    type: "game",
    headerImage: typeof data.headerImage === "string" ? data.headerImage : null,
    originalPriceCents,
    currentPriceCents: 0,
    currency: data.currency.slice(0, 3).toUpperCase(),
    discountPercent: 100,
    storeUrl: `https://store.steampowered.com/app/${appid}`,
    steamClientUrl: `steam://store/${appid}`,
    promotionDetectedAt,
    lastValidatedAt,
    promotionEndsAt: asDate(data.promotionEndsAt),
    isActive: true,
  };
}

function syncStateFromData(data?: DocumentData): SyncState {
  const status = data?.status;
  return {
    status:
      status === "running" || status === "success" || status === "failure"
        ? status
        : "never",
    startedAt: asDate(data?.startedAt),
    completedAt: asDate(data?.completedAt),
    lastSuccessfulAt: asDate(data?.lastSuccessfulAt),
    candidateCount: asFiniteNumber(data?.candidateCount) ?? 0,
    validPromotionCount: asFiniteNumber(data?.validPromotionCount) ?? 0,
    rejectedCount: asFiniteNumber(data?.rejectedCount) ?? 0,
    failureReason:
      typeof data?.failureReason === "string" ? data.failureReason : null,
  };
}

export type SuccessfulSyncSummary = {
  startedAt: Date;
  completedAt: Date;
  candidateCount: number;
  rejectedCount: number;
};

export class GamesRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async getSnapshot(): Promise<GamesSnapshot> {
    const [gamesResult, syncResult] = await Promise.all([
      this.firestore
        .collection(gamesCollection)
        .where("isActive", "==", true)
        .get(),
      this.firestore.doc(syncDocumentPath).get(),
    ]);

    return {
      games: gamesResult.docs
        .map(gameFromDocument)
        .filter((game): game is PromotionGame => game !== null),
      sync: syncStateFromData(syncResult.data()),
    };
  }

  async recordSyncStarted(startedAt: Date): Promise<void> {
    await this.firestore.doc(syncDocumentPath).set(
      {
        status: "running",
        startedAt,
        completedAt: null,
        candidateCount: 0,
        validPromotionCount: 0,
        rejectedCount: 0,
        failureReason: null,
      },
      { merge: true },
    );
  }

  async recordSyncFailure(
    startedAt: Date,
    failureReason: string,
    candidateCount: number,
    validPromotionCount: number,
    rejectedCount: number,
  ): Promise<void> {
    await this.firestore.doc(syncDocumentPath).set(
      {
        status: "failure",
        startedAt,
        completedAt: FieldValue.serverTimestamp(),
        candidateCount,
        validPromotionCount,
        rejectedCount,
        failureReason,
      },
      { merge: true },
    );
  }

  async replaceActivePromotions(
    promotions: ValidatedPromotion[],
    summary: SuccessfulSyncSummary,
  ): Promise<void> {
    const activeSnapshot = await this.firestore
      .collection(gamesCollection)
      .where("isActive", "==", true)
      .get();
    const activeDocuments = new Map(
      activeSnapshot.docs.map((document) => [document.id, document]),
    );
    const newIds = new Set(promotions.map((promotion) => String(promotion.appid)));
    const expiredDocuments = activeSnapshot.docs.filter(
      (document) => !newIds.has(document.id),
    );
    const writeCount = expiredDocuments.length + promotions.length + 1;

    if (writeCount > maxAtomicWrites) {
      throw new Error(
        `Synchronization requires ${writeCount} writes, above the atomic safety limit.`,
      );
    }

    const batch = this.firestore.batch();
    for (const document of expiredDocuments) {
      batch.update(document.ref, {
        isActive: false,
        lastValidatedAt: summary.completedAt,
      });
    }

    for (const promotion of promotions) {
      const documentId = String(promotion.appid);
      const existingDetectedAt = asDate(
        activeDocuments.get(documentId)?.data().promotionDetectedAt,
      );
      batch.set(
        this.firestore.collection(gamesCollection).doc(documentId),
        {
          ...promotion,
          promotionDetectedAt: existingDetectedAt ?? summary.startedAt,
          lastValidatedAt: summary.completedAt,
          isActive: true,
        },
        { merge: true },
      );
    }

    batch.set(
      this.firestore.doc(syncDocumentPath),
      {
        status: "success",
        startedAt: summary.startedAt,
        completedAt: FieldValue.serverTimestamp(),
        lastSuccessfulAt: FieldValue.serverTimestamp(),
        candidateCount: summary.candidateCount,
        validPromotionCount: promotions.length,
        rejectedCount: summary.rejectedCount,
        failureReason: null,
      },
      { merge: true },
    );

    await batch.commit();
  }
}
