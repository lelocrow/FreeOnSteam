# Public API

FreeOnSteam exposes three read-only endpoints. It does not expose a public synchronization endpoint.

## `GET /api/games`

Returns active, validated promotions. Known expiration times sort first and ascending; offers without a reliable end time sort alphabetically afterward.

Successful or empty response:

```json
{
  "updatedAt": "2026-08-05T12:00:00.000Z",
  "stale": false,
  "games": [
    {
      "appid": 123,
      "name": "Example Game",
      "slug": "example-game",
      "type": "game",
      "headerImage": "https://shared.fastly.steamstatic.com/example.jpg",
      "originalPriceCents": 1999,
      "currentPriceCents": 0,
      "currency": "USD",
      "discountPercent": 100,
      "storeUrl": "https://store.steampowered.com/app/123",
      "steamClientUrl": "steam://store/123",
      "promotionDetectedAt": "2026-08-05T11:55:00.000Z",
      "lastValidatedAt": "2026-08-05T12:00:00.000Z",
      "promotionEndsAt": null
    }
  ]
}
```

`updatedAt` is `null` before the first successful synchronization. `stale` becomes `true` when there is no success or the last success is older than `STALE_AFTER_MINUTES`. `games` is always an array and can be empty.

Responses use `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. A safe `503` response uses the same top-level schema with `updatedAt: null`, `stale: true`, an empty `games` array, and `Cache-Control: no-store`. Internal errors and stack traces are never returned.

## `GET /api/games/{appid}/price?country=XX`

Returns a regional regular price only for an App ID in the current active offer list. `country` is normalized to a two-letter uppercase country code; invalid or missing values use `US`. Steam must pass the same promotion validation in the requested country, otherwise the endpoint returns the stored US fallback.

```json
{
  "country": "DE",
  "originalPriceCents": 1999,
  "currency": "EUR",
  "fallback": false
}
```

When `fallback` is `true`, `country` is `US` and the price comes from the scheduled US validation. Successful regional responses use browser and shared-cache headers; invalid App IDs and inactive offers are not cached.

## `GET /api/health`

Healthy response:

```json
{
  "status": "ok",
  "updatedAt": "2026-08-05T12:00:00.000Z",
  "stale": false
}
```

The endpoint returns HTTP `200` only after a recent successful synchronization. It returns HTTP `503` with `status: "degraded"` when no successful sync exists, data is stale, or Firestore cannot be read. Health responses use `Cache-Control: no-store`.

## Compatibility

Fields are intentionally stable and additive changes are preferred. Consumers must tolerate unknown future fields and a `null` promotion end time. Prices are integer minor units and should be formatted using the supplied currency code.
