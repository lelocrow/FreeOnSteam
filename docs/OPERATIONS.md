# Operations

Export the production settings before using this runbook:

```bash
export GCP_PROJECT_ID="YOUR_PROJECT_ID"
export GCP_REGION="us-east4"
export FIRESTORE_DATABASE="(default)"
export WEB_SERVICE_NAME="freeonsteam-web"
export SYNC_JOB_NAME="freeonsteam-sync"
export SCHEDULER_JOB_NAME="freeonsteam-every-30-minutes"
export ARTIFACT_REPOSITORY="freeonsteam"
```

## Run synchronization manually

```bash
./scripts/run-sync.sh
```

Equivalent command:

```bash
gcloud run jobs execute "$SYNC_JOB_NAME" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --wait
```

A genuine failure exits nonzero. Do not repeatedly retry an upstream format failure; inspect logs first.

## Inspect executions

```bash
gcloud run jobs executions list \
  --job="$SYNC_JOB_NAME" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --limit=10

gcloud run jobs executions describe EXECUTION_NAME \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"
```

## Check Cloud Logging

Recent sync logs:

```bash
gcloud logging read \
  'resource.type="cloud_run_job" AND resource.labels.job_name="'"$SYNC_JOB_NAME"'"' \
  --project="$GCP_PROJECT_ID" \
  --freshness=24h \
  --limit=100 \
  --format=json
```

Application events include `steam_sync_started`, `steam_sync_completed`, and `steam_sync_failed`. Completion logs include candidate, valid, and rejected counts. Failure reasons are concise and sanitized.

Recent web errors:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="'"$WEB_SERVICE_NAME"'" AND severity>=ERROR' \
  --project="$GCP_PROJECT_ID" \
  --freshness=24h \
  --limit=100
```

## Check Scheduler history

```bash
gcloud scheduler jobs describe "$SCHEDULER_JOB_NAME" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

gcloud logging read \
  'resource.type="cloud_scheduler_job" AND resource.labels.job_id="'"$SCHEDULER_JOB_NAME"'"' \
  --project="$GCP_PROJECT_ID" \
  --freshness=24h \
  --limit=50
```

Confirm the schedule is `*/30 * * * *`, the time zone is `America/Sao_Paulo`, and state is `ENABLED`.

## Verify service health

```bash
./scripts/verify-deployment.sh
```

Or inspect endpoints directly:

```bash
SERVICE_URL="$(gcloud run services describe "$WEB_SERVICE_NAME" --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format='value(status.url)')"
curl -i "$SERVICE_URL/"
curl -i "$SERVICE_URL/api/games"
curl -i "$SERVICE_URL/api/health"
```

Health returns `503 degraded` before the first successful sync or when the last success exceeds the stale threshold.

## Inspect Firestore sync metadata

```bash
ACCESS_TOKEN="$(gcloud auth print-access-token)"
curl -fsS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://firestore.googleapis.com/v1/projects/${GCP_PROJECT_ID}/databases/${FIRESTORE_DATABASE}/documents/syncState/current"
```

Do not edit active game records by hand during an execution.

## Handle a Steam format change

Symptoms include malformed JSON retries, search pages with a nonzero count but no App IDs, a sudden zero candidate count combined with response changes, or widespread ambiguous pricing rejections.

1. Pause Scheduler so repeated failures do not generate noise.
2. Preserve the existing Firestore dataset; do not clear or replace it.
3. Capture only non-sensitive response structure needed for a mocked regression fixture.
4. Update the isolated adapter or schema in `src/lib/steam`.
5. Add tests that reproduce the format change and retain all exclusion guarantees.
6. Run `npm run check` and build the Docker image.
7. Deploy the new immutable image.
8. Run one manual sync and verify Firestore, API, and homepage.
9. Resume Scheduler.

## Disable or resume scheduled synchronization

Pause without deleting the job:

```bash
gcloud scheduler jobs pause "$SCHEDULER_JOB_NAME" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"
```

Resume:

```bash
gcloud scheduler jobs resume "$SCHEDULER_JOB_NAME" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"
```

## Rollback

Pause Scheduler, select a known-good Artifact Registry tag, update both the service and job, run a manual sync, verify, and resume Scheduler. Exact commands are in [Deployment](DEPLOYMENT.md#rollback).

## Cost considerations

This is designed for low traffic and low sync volume:

- Cloud Run web instances scale to zero with a maximum of three instances.
- The single-task job runs every 30 minutes and sends conservative sequential requests.
- Firestore stores one small document per promotion plus one global sync document.
- Public API cache headers reduce repeated Firestore reads at the edge.
- Artifact Registry and Cloud Build storage grow with deployments; apply an organization-appropriate image retention policy after confirming rollback requirements.
- Cloud Logging uses the platform default and no separate observability stack.

Review the current Google Cloud pricing pages and configure billing budgets or alerts. Never assume usage remains inside a free tier.
