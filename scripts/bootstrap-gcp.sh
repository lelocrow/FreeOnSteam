#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_command gcloud

ACCOUNT="$(active_account)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "No active gcloud account. Run: gcloud auth login" >&2
  exit 1
fi

gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectId)' >/dev/null
BILLING_ENABLED="$(gcloud billing projects describe "${GCP_PROJECT_ID}" --format='value(billingEnabled)')"
if [[ "${BILLING_ENABLED}" != "True" && "${BILLING_ENABLED}" != "true" ]]; then
  echo "Billing is not enabled for ${GCP_PROJECT_ID}." >&2
  exit 1
fi

cat <<SUMMARY
FreeOnSteam resource plan
  Project:              ${GCP_PROJECT_ID}
  Region:               ${GCP_REGION} (Northern Virginia)
  Firestore database:   ${FIRESTORE_DATABASE}
  Artifact repository:  ${ARTIFACT_REPOSITORY}
  Cloud Run service:    ${WEB_SERVICE_NAME}
  Cloud Run job:        ${SYNC_JOB_NAME}
  Scheduler job:        ${SCHEDULER_JOB_NAME}
  Service accounts:     ${WEB_SERVICE_ACCOUNT}, ${SYNC_SERVICE_ACCOUNT}, ${SCHEDULER_SERVICE_ACCOUNT}
SUMMARY

echo "Enabling required Google Cloud APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  --project="${GCP_PROJECT_ID}"

if ! gcloud firestore databases describe --database="${FIRESTORE_DATABASE}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating Firestore Native database in ${GCP_REGION}..."
  gcloud firestore databases create \
    --database="${FIRESTORE_DATABASE}" \
    --location="${GCP_REGION}" \
    --type=firestore-native \
    --project="${GCP_PROJECT_ID}"
else
  echo "Using existing Firestore database ${FIRESTORE_DATABASE}."
fi

if ! gcloud artifacts repositories describe "${ARTIFACT_REPOSITORY}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create "${ARTIFACT_REPOSITORY}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="FreeOnSteam production containers" \
    --project="${GCP_PROJECT_ID}"
fi

create_service_account() {
  local account_id="$1"
  local display_name="$2"
  if ! gcloud iam service-accounts describe "${account_id}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
    gcloud iam service-accounts create "${account_id}" --display-name="${display_name}" --project="${GCP_PROJECT_ID}"
  fi
}

create_service_account "${WEB_SERVICE_ACCOUNT}" "FreeOnSteam web service"
create_service_account "${SYNC_SERVICE_ACCOUNT}" "FreeOnSteam synchronization job"
create_service_account "${SCHEDULER_SERVICE_ACCOUNT}" "FreeOnSteam scheduler invoker"

echo "Applying least-privilege Firestore roles..."
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${WEB_SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/datastore.viewer" \
  --condition=None --quiet >/dev/null
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${SYNC_SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/datastore.user" \
  --condition=None --quiet >/dev/null

BUILD_SERVICE_ACCOUNT="$(gcloud builds get-default-service-account --project="${GCP_PROJECT_ID}" 2>/dev/null || true)"
if [[ -n "${BUILD_SERVICE_ACCOUNT}" ]]; then
  gcloud artifacts repositories add-iam-policy-binding "${ARTIFACT_REPOSITORY}" \
    --location="${GCP_REGION}" \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/artifactregistry.writer" \
    --project="${GCP_PROJECT_ID}" \
    --condition=None --quiet >/dev/null
fi

echo "Google Cloud prerequisites are ready."
