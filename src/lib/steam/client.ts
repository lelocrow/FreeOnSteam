import { steamConfig } from "@/lib/environment";
import { validatePromotion } from "@/lib/promotion-filter";
import { steamAppDataSchema, steamSearchSchema } from "@/lib/steam/schema";
import type { PromotionDecision } from "@/lib/steam/types";

type FetchImplementation = typeof fetch;

type SteamClientOptions = {
  country: string;
  language: string;
  pageSize: number;
  maxPages: number;
  timeoutMs: number;
  retries: number;
  requestDelayMs: number;
  userAgent: string;
};

const searchEndpoint = "https://store.steampowered.com/search/results/";
const detailsEndpoint = "https://store.steampowered.com/api/appdetails";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function extractAppIds(html: string): number[] {
  const ids = new Set<number>();
  const patterns = [
    /data-ds-appid=["'](\d+)["']/g,
    /store\.steampowered\.com\/app\/(\d+)/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const appid = Number.parseInt(match[1], 10);
      if (Number.isSafeInteger(appid) && appid > 0) {
        ids.add(appid);
      }
    }
  }

  return [...ids];
}

export class SteamStoreClient {
  private readonly fetchImplementation: FetchImplementation;
  private readonly options: SteamClientOptions;

  constructor(
    fetchImplementation: FetchImplementation = fetch,
    options: Partial<SteamClientOptions> = {},
  ) {
    this.fetchImplementation = fetchImplementation;
    this.options = { ...steamConfig, ...options };
  }

  private async requestJson(url: URL): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.retries; attempt += 1) {
      try {
        const response = await this.fetchImplementation(url, {
          cache: "no-store",
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "User-Agent": this.options.userAgent,
          },
          signal: AbortSignal.timeout(this.options.timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Steam request returned HTTP ${response.status}.`);
        }

        const body = await response.text();
        try {
          return JSON.parse(body) as unknown;
        } catch {
          throw new Error("Steam returned malformed JSON.");
        }
      } catch (error) {
        lastError = error;
        if (attempt < this.options.retries) {
          await delay(400 * 2 ** (attempt - 1));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Steam request failed.");
  }

  async discoverCandidateIds(): Promise<number[]> {
    const candidateIds = new Set<number>();
    let start = 0;
    let page = 0;
    let totalCount = Number.POSITIVE_INFINITY;

    while (start < totalCount) {
      if (page >= this.options.maxPages) {
        throw new Error(
          `Steam search exceeded the configured ${this.options.maxPages}-page safety limit.`,
        );
      }

      const url = new URL(searchEndpoint);
      url.search = new URLSearchParams({
        query: "",
        start: String(start),
        count: String(this.options.pageSize),
        dynamic_data: "",
        sort_by: "_ASC",
        specials: "1",
        maxprice: "free",
        category1: "998",
        infinite: "1",
        cc: this.options.country,
        l: this.options.language,
      }).toString();

      const search = steamSearchSchema.parse(await this.requestJson(url));
      totalCount = search.total_count;
      const pageIds = extractAppIds(search.results_html);

      if (totalCount > 0 && pageIds.length === 0) {
        throw new Error("Steam search contained results but no recognizable app IDs.");
      }

      pageIds.forEach((appid) => candidateIds.add(appid));
      start += this.options.pageSize;
      page += 1;

      if (start < totalCount) {
        await delay(this.options.requestDelayMs);
      }
    }

    return [...candidateIds];
  }

  async validateCandidate(appid: number): Promise<PromotionDecision> {
    const url = new URL(detailsEndpoint);
    url.search = new URLSearchParams({
      appids: String(appid),
      cc: this.options.country,
      l: this.options.language,
    }).toString();

    const response = await this.requestJson(url);
    if (!isRecord(response)) {
      throw new Error("Steam app details returned an invalid response envelope.");
    }

    const envelope = response[String(appid)];
    if (!isRecord(envelope) || envelope.success !== true) {
      return { accepted: false, reason: "unavailable" };
    }

    const parsed = steamAppDataSchema.safeParse(envelope.data);
    if (!parsed.success) {
      return { accepted: false, reason: "ambiguous-pricing" };
    }

    return validatePromotion(appid, parsed.data);
  }

  async pauseBetweenDetails(): Promise<void> {
    await delay(this.options.requestDelayMs);
  }
}
