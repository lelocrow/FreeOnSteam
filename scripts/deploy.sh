#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_command gcloud
require_command git

"${SCRIPT_DIR}/bootstrap-gcp.sh"

GIT_REVISION="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/freeonsteam:${GIT_REVISION}"

echo "Building ${IMAGE_URI} with Cloud Build..."
gcloud builds submit "${REPO_ROOT}" --tag="${IMAGE_URI}" --project="${GCP_PROJECT_ID}"

echo "Deploying public Cloud Run service..."
gcloud run deploy "${WEB_SERVICE_NAME}" \
  --image="${IMAGE_URI}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --service-account="${WEB_SERVICE_ACCOUNT_EMAIL}" \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min=0 \
  --max=3 \
  --concurrency=80 \
  --timeout=30s \
  --set-env-vars="FIRESTORE_DATABASE=${FIRESTORE_DATABASE},STALE_AFTER_MINUTES=90"

SERVICE_URL="$(gcloud run services describe "${WEB_SERVICE_NAME}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
gcloud run services update "${WEB_SERVICE_NAME}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --update-env-vars="SITE_URL=${SERVICE_URL}" >/dev/null

echo "Deploying private synchronization job..."
gcloud run jobs deploy "${SYNC_JOB_NAME}" \
  --image="${IMAGE_URI}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --service-account="${SYNC_SERVICE_ACCOUNT_EMAIL}" \
  --command=node \
  --args=dist/sync.cjs \
  --cpu=1 \
  --memory=512Mi \
  --tasks=1 \
  --max-retries=1 \
  --task-timeout=20m \
  --set-env-vars="FIRESTORE_DATABASE=${FIRESTORE_DATABASE},STEAM_COUNTRY=BR,STEAM_LANGUAGE=english,STEAM_MAX_PAGES=20"

gcloud run jobs add-iam-policy-binding "${SYNC_JOB_NAME}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --member="serviceAccount:${SCHEDULER_SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/run.invoker" \
  --quiet >/dev/null

SCHEDULER_URI="https://run.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${SYNC_JOB_NAME}:run"
if gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  echo "Updating Cloud Scheduler job..."
  gcloud scheduler jobs update http "${SCHEDULER_JOB_NAME}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --schedule="*/30 * * * *" \
    --time-zone="${SCHEDULER_TIME_ZONE}" \
    --uri="${SCHEDULER_URI}" \
    --http-method=POST \
    --oauth-service-account-email="${SCHEDULER_SERVICE_ACCOUNT_EMAIL}" \
    --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
    --update-headers="Content-Type=application/json" \
    --message-body='{}' \
    --attempt-deadline=600s
else
  echo "Creating Cloud Scheduler job..."
  gcloud scheduler jobs create http "${SCHEDULER_JOB_NAME}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --schedule="*/30 * * * *" \
    --time-zone="${SCHEDULER_TIME_ZONE}" \
    --uri="${SCHEDULER_URI}" \
    --http-method=POST \
    --oauth-service-account-email="${SCHEDULER_SERVICE_ACCOUNT_EMAIL}" \
    --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
    --headers="Content-Type=application/json" \
    --message-body='{}' \
    --attempt-deadline=600s
fi

"${SCRIPT_DIR}/run-sync.sh"
"${SCRIPT_DIR}/verify-deployment.sh"

cat <<RESULT
FreeOnSteam deployment complete
  URL:                  ${SERVICE_URL}
  Image:                ${IMAGE_URI}
  Cloud Run service:    ${WEB_SERVICE_NAME}
  Cloud Run job:        ${SYNC_JOB_NAME}
  Scheduler:            ${SCHEDULER_JOB_NAME} (*/30 * * * *, ${SCHEDULER_TIME_ZONE})
  Firestore database:   ${FIRESTORE_DATABASE}
RESULT
