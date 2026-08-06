# Steam Data Limitations

FreeOnSteam integrates with public Steam storefront endpoints. These endpoints are useful to the storefront but are unofficial, undocumented integration surfaces and may change without notice. The Steam adapter is isolated so it can be updated or replaced when formats change.

## Regional sensitivity

All validation uses `cc=BR` and English response text. Prices, discounts, ownership eligibility, age gates, publisher restrictions, and availability can differ by Steam account region or account state. A Brazilian storefront result is not a guarantee for another account.

## A zero price is not enough

Steam search can include permanently free games, Free-to-Play games, demos, weekends, and trials. FreeOnSteam publishes an item only when app details establish an original price above zero, a current price of zero, a 100% discount, and base-game type. Missing or contradictory data is rejected.

## Temporary access

Free weekends and temporary trials do not grant a permanent license. FreeOnSteam excludes non-game types and known temporary-access language. Steam does not expose a single documented permanent-license flag through these endpoints, so the filter is intentionally conservative and users must still verify the claim action on Steam.

## Promotion end times

Steam app details do not consistently expose a reliable end timestamp for every discount. `promotionEndsAt` is therefore `null` unless a future adapter can establish a trustworthy value. FreeOnSteam does not invent countdowns or deadlines.

## Upstream failures

When Steam is unavailable or returns malformed data, synchronization fails and Cloud Run records a failed execution. The previous successful Firestore dataset remains available and the website marks it stale after the configured threshold. No sample or fabricated games replace upstream data.

## Independent project

FreeOnSteam is not affiliated with, endorsed by, or sponsored by Valve Corporation or Steam. Users should open the Steam listing, verify the price and license terms for their account, and complete the add-to-account action before relying on an offer.
