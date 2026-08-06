import { describe, expect, it, vi } from "vitest";

import { extractAppIds, SteamStoreClient } from "@/lib/steam/client";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const clientOptions = {
  country: "BR",
  language: "english",
  pageSize: 50,
  maxPages: 2,
  timeoutMs: 1_000,
  retries: 1,
  requestDelayMs: 1,
  userAgent: "FreeOnSteam test suite",
};

describe("SteamStoreClient", () => {
  it("extracts and deduplicates app IDs from storefront HTML", () => {
    const html = `
      <a data-ds-appid="123" href="https://store.steampowered.com/app/123/Game/">Game</a>
      <a data-ds-appid='456' href="https://store.steampowered.com/app/456/Other/">Other</a>
    `;
    expect(extractAppIds(html)).toEqual([123, 456]);
  });

  it("discovers candidates with the required Brazilian sale filters", async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("specials")).toBe("1");
      expect(url.searchParams.get("maxprice")).toBe("free");
      expect(url.searchParams.get("category1")).toBe("998");
      expect(url.searchParams.get("cc")).toBe("BR");
      expect(url.searchParams.get("l")).toBe("english");
      return response({
        total_count: 2,
        results_html:
          '<a data-ds-appid="123"></a><a data-ds-appid="456"></a>',
      });
    }) as unknown as typeof fetch;

    const client = new SteamStoreClient(mockFetch, clientOptions);
    await expect(client.discoverCandidateIds()).resolves.toEqual([123, 456]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("validates app details through the promotion filter", async () => {
    const mockFetch = vi.fn(async () =>
      response({
        "123": {
          success: true,
          data: {
            type: "game",
            name: "Verified Game",
            is_free: false,
            price_overview: {
              currency: "BRL",
              initial: 2999,
              final: 0,
              discount_percent: 100,
            },
          },
        },
      }),
    ) as unknown as typeof fetch;

    const client = new SteamStoreClient(mockFetch, clientOptions);
    const decision = await client.validateCandidate(123);
    expect(decision.accepted).toBe(true);
  });

  it("preserves package evidence for limited free promotions", async () => {
    const mockFetch = vi.fn(async () =>
      response({
        "606150": {
          success: true,
          data: {
            type: "game",
            name: "Moonlighter",
            is_free: true,
            price_overview: {
              currency: "BRL",
              initial: 4100,
              final: 4100,
              discount_percent: 100,
              final_formatted: "Free",
            },
            package_groups: [
              {
                subs: [
                  {
                    option_text: "Moonlighter Limited Free Promotional Package - Aug 2026 - Free",
                    is_free_license: true,
                    price_in_cents_with_discount: 0,
                  },
                  {
                    option_text: "Moonlighter - R$ 41,00",
                    is_free_license: false,
                    price_in_cents_with_discount: 4100,
                  },
                ],
              },
            ],
          },
        },
      }),
    ) as unknown as typeof fetch;

    const client = new SteamStoreClient(mockFetch, clientOptions);
    const decision = await client.validateCandidate(606150);

    expect(decision.accepted).toBe(true);
    if (decision.accepted) {
      expect(decision.promotion.name).toBe("Moonlighter");
    }
  });

  it("fails a malformed result page instead of fabricating candidates", async () => {
    const mockFetch = vi.fn(async () =>
      response({ total_count: 1, results_html: "<p>Unexpected markup</p>" }),
    ) as unknown as typeof fetch;

    const client = new SteamStoreClient(mockFetch, clientOptions);
    await expect(client.discoverCandidateIds()).rejects.toThrow(
      "no recognizable app IDs",
    );
  });
});
