function positiveInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export const runtimeConfig = {
  firestoreDatabase: process.env.FIRESTORE_DATABASE || "(default)",
  staleAfterMinutes: positiveInteger("STALE_AFTER_MINUTES", 90),
};

export const steamConfig = {
  country: process.env.STEAM_COUNTRY || "BR",
  language: process.env.STEAM_LANGUAGE || "english",
  pageSize: positiveInteger("STEAM_PAGE_SIZE", 50),
  maxPages: positiveInteger("STEAM_MAX_PAGES", 20),
  timeoutMs: positiveInteger("STEAM_REQUEST_TIMEOUT_MS", 10_000),
  retries: positiveInteger("STEAM_REQUEST_RETRIES", 3),
  requestDelayMs: positiveInteger("STEAM_REQUEST_DELAY_MS", 250),
  userAgent:
    process.env.STEAM_USER_AGENT ||
    "FreeOnSteam/1.0 (+https://github.com/lelocrow/FreeOnSteam; contact: repository issues)",
};
