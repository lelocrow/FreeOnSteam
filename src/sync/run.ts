import { GamesRepository } from "@/lib/firestore/repository";
import { logger, safeErrorMessage } from "@/lib/logger";
import { SteamStoreClient } from "@/lib/steam/client";
import type { ValidatedPromotion } from "@/lib/steam/types";

export async function synchronize(): Promise<void> {
  const startedAt = new Date();
  const repository = new GamesRepository();
  const steam = new SteamStoreClient();
  let candidateCount = 0;
  let validPromotionCount = 0;
  let rejectedCount = 0;

  logger.info("steam_sync_started", { startedAt: startedAt.toISOString() });
  await repository.recordSyncStarted(startedAt);

  try {
    const candidateIds = await steam.discoverCandidateIds();
    candidateCount = candidateIds.length;
    const promotions: ValidatedPromotion[] = [];
    const rejectionCounts = new Map<string, number>();

    for (const [index, appid] of candidateIds.entries()) {
      const decision = await steam.validateCandidate(appid);
      if (decision.accepted) {
        promotions.push(decision.promotion);
        validPromotionCount += 1;
      } else {
        rejectedCount += 1;
        rejectionCounts.set(
          decision.reason,
          (rejectionCounts.get(decision.reason) ?? 0) + 1,
        );
      }

      if (index < candidateIds.length - 1) {
        await steam.pauseBetweenDetails();
      }
    }

    const completedAt = new Date();
    await repository.replaceActivePromotions(promotions, {
      startedAt,
      completedAt,
      candidateCount,
      rejectedCount,
    });

    logger.info("steam_sync_completed", {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      candidateCount,
      validPromotionCount,
      rejectedCount,
      rejectionSummary: JSON.stringify(Object.fromEntries(rejectionCounts)),
    });
  } catch (error) {
    const failureReason = safeErrorMessage(error);
    try {
      await repository.recordSyncFailure(
        startedAt,
        failureReason,
        candidateCount,
        validPromotionCount,
        rejectedCount,
      );
    } catch (metadataError) {
      logger.error("steam_sync_failure_metadata_write_failed", {
        failureReason: safeErrorMessage(metadataError),
      });
    }
    logger.error("steam_sync_failed", { candidateCount, failureReason });
    throw error;
  }
}

synchronize().catch(() => {
  process.exitCode = 1;
});
