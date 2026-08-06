# FreeOnSteam

FreeOnSteam is an independent web application that finds normally paid Steam games temporarily discounted by 100% and available to add to an account for free. It validates offers against Steam's Brazilian storefront region, rejects Free-to-Play and temporary-access titles, and serves the last successful dataset from Firestore.

> FreeOnSteam is not affiliated with, endorsed by, or sponsored by Valve Corporation or Steam. Price and availability can vary by Steam account region. Always verify an offer and complete the add-to-account action on Steam.

## Live application

[Open FreeOnSteam](https://freeonsteam-web-hl44g7zlwa-uk.a.run.app)

The Cloud Run service, synchronization job, Scheduler job, and Artifact Registry repository run in Northern Virginia (`us-east4`). The project's existing Firestore Native `(default)` database was safely reused in the `nam5` United States multi-region because Firestore locations are immutable.

## Screenshot

Add a current production screenshot at `docs/images/homepage.png` after deployment, then replace this paragraph with `![FreeOnSteam homepage](docs/images/homepage.png)`. Do not use sample games or fabricated promotions in the screenshot.

## Features

- Discovers candidates through Steam storefront sale search results.
- Confirms every candidate through Steam app details for the `BR` region.
- Requires an original price above zero, a current price of zero, a 100% discount, and `type = game`.
- Rejects Free-to-Play games, permanently free titles, demos, DLC, software, videos, trials, and free weekends.
- Preserves the previous successful dataset when Steam or synchronization fails.
- Provides a responsive, accessible dark interface with Steam app and browser links.
- Exposes read-only `/api/games` and `/api/health` endpoints.
- Uses structured logs, stale-data detection, and Cloud Run execution status.
- Deploys reproducibly to Northern Virginia (`us-east4`) with no service-account keys.

## Architecture

The production stack uses:

- Next.js 16 App Router, strict TypeScript, React, and Tailwind CSS.
- A public Cloud Run service for the website and read-only API.
- A private Cloud Run Job for Steam synchronization.
- Firestore in Native mode for active promotions and synchronization state.
- Cloud Scheduler with OAuth to run the job every 30 minutes.
- Artifact Registry and Cloud Build for one reproducible production image.

See [Architecture](docs/ARCHITECTURE.md) for the full data flow, boundaries, and Firestore model.

## Prerequisites

- Node.js 24 and npm 11.
- Git.
- Docker for local container validation.
- Google Cloud CLI for deployment and local Application Default Credentials.
- A Google Cloud project with billing enabled.

## Installation

```bash
git clone https://github.com/lelocrow/FreeOnSteam.git
cd FreeOnSteam
npm ci
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

## Environment configuration

The application does not require API keys. It uses Google Application Default Credentials for Firestore and public Steam storefront endpoints for upstream data.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | ADC project | Google Cloud project containing Firestore. |
| `FIRESTORE_DATABASE` | `(default)` | Firestore Native database ID. |
| `SITE_URL` | `http://localhost:3000` | Canonical production origin. |
| `STALE_AFTER_MINUTES` | `90` | Age after which the last success is considered stale. |
| `STEAM_COUNTRY` | `BR` | Steam region used for price validation. |
| `STEAM_LANGUAGE` | `english` | Steam response language. |
| `STEAM_PAGE_SIZE` | `50` | Conservative search page size. |
| `STEAM_MAX_PAGES` | `20` | Safety limit that prevents unbounded crawling. |
| `STEAM_REQUEST_TIMEOUT_MS` | `10000` | Timeout for each Steam request. |
| `STEAM_REQUEST_RETRIES` | `3` | Total attempts with exponential backoff. |
| `STEAM_REQUEST_DELAY_MS` | `250` | Delay between sequential upstream requests. |
| `STEAM_USER_AGENT` | Project identifier | Descriptive upstream User-Agent. |

Never commit `.env.local`, credentials, access tokens, cookies, or service-account JSON files.

## Local development

Authenticate Application Default Credentials before reading or writing a real Firestore database:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project "$GOOGLE_CLOUD_PROJECT"
npm run dev
```

Open <http://localhost:3000>. If Firestore is unavailable, the interface shows a safe error state rather than fabricated games.

Run synchronization manually only when the configured project and database are safe to modify:

```bash
npm run sync
```

The sync is idempotent. A successful run updates current offers and deactivates expired ones atomically. A failed run records failure metadata and retains the previous active games.

## Tests and quality checks

All tests use mocked Steam responses and never depend on live Steam availability.

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run check
```

The test suite covers accepted paid games, Free-to-Play exclusion, demos and DLC, free weekends, temporary trials, malformed search responses, pricing ambiguity, and the public API response shape.

## Docker

```bash
docker build -t freeonsteam:local .
docker run --rm -p 8080:8080 \
  -e GOOGLE_CLOUD_PROJECT="$GOOGLE_CLOUD_PROJECT" \
  -e FIRESTORE_DATABASE="${FIRESTORE_DATABASE:-(default)}" \
  freeonsteam:local
```

The final image runs as the non-root `node` user. The same image runs the private sync job with `node dist/sync.cjs`.

## Google Cloud deployment

The default deployment region is Northern Virginia (`us-east4`). Set the project and run the deployment script from Bash, Git Bash, WSL, or Cloud Shell:

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-east4"
./scripts/deploy.sh
```

The script checks authentication and billing, prints the resource plan, enables only required APIs, creates or reuses infrastructure, builds the image with Cloud Build, deploys the service and job, configures Scheduler, runs one synchronization, and verifies the result.

See [Deployment](docs/DEPLOYMENT.md) for exact commands and rollback, and [Operations](docs/OPERATIONS.md) for ongoing maintenance.

## Synchronization behavior

1. Request every relevant Steam sale search page using `specials=1`, `maxprice=free`, `category1=998`, `cc=BR`, and `l=english`.
2. Extract and deduplicate Steam App IDs.
3. Request app details sequentially with timeout, retry, backoff, and delay controls.
4. Apply strict promotion validation.
5. Atomically upsert valid offers, deactivate offers no longer present, and record success metadata.
6. Exit nonzero on genuine failures so Cloud Run marks the execution failed.

No public synchronization endpoint exists. Only the private Cloud Run Job writes Firestore.

## Limitations

- Steam storefront endpoints are public but unofficial and undocumented; their format can change.
- Steam does not always expose a reliable promotion end time, so `promotionEndsAt` can be `null`.
- An apparent zero price is insufficient without original-price, discount, type, and access checks.
- Regional and account-specific restrictions may differ from the `BR` validation result.
- The conservative filter can reject uncertain offers rather than risk presenting a false positive.

Read [Steam data limitations](docs/STEAM_DATA_LIMITATIONS.md) before relying on the dataset.

## API

`GET /api/games` returns active validated games, update time, and stale state. `GET /api/health` reports whether a recent successful synchronization exists. See [API documentation](docs/API.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Changes to filtering must include mocked fixtures proving both accepted and rejected behavior.

## License

FreeOnSteam is available under the [MIT License](LICENSE).
