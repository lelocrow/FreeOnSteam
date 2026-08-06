#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command gcloud

SERVICE_URL="$(gcloud run services describe "${WEB_SERVICE_NAME}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)')"
if [[ -z "${SERVICE_URL}" ]]; then
  echo "Cloud Run service URL was not found." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "Checking homepage..."
HOME_STATUS="$(curl -sS -o "${TMP_DIR}/home.html" -w '%{http_code}' "${SERVICE_URL}/")"
[[ "${HOME_STATUS}" == "200" ]]
grep -q "FreeOnSteam" "${TMP_DIR}/home.html"

echo "Checking games API..."
curl -fsS "${SERVICE_URL}/api/games" -o "${TMP_DIR}/games.json"
grep -q '"updatedAt"' "${TMP_DIR}/games.json"
grep -q '"stale"' "${TMP_DIR}/games.json"
grep -q '"games"' "${TMP_DIR}/games.json"

echo "Checking health API..."
curl -fsS "${SERVICE_URL}/api/health" -o "${TMP_DIR}/health.json"
grep -q '"status":"ok"' "${TMP_DIR}/health.json"

echo "Checking Firestore synchronization metadata..."
ACCESS_TOKEN="$(gcloud auth print-access-token)"
curl -fsS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "https://firestore.googleapis.com/v1/projects/${GCP_PROJECT_ID}/databases/${FIRESTORE_DATABASE}/documents/syncState/current" \
  -o "${TMP_DIR}/sync-state.json"
grep -q '"stringValue": "success"' "${TMP_DIR}/sync-state.json"

echo "Checking Scheduler configuration..."
SCHEDULE="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(schedule)')"
STATE="$(gcloud scheduler jobs describe "${SCHEDULER_JOB_NAME}" --location="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --format='value(state)')"
[[ "${SCHEDULE}" == "*/30 * * * *" ]]
[[ "${STATE}" == "ENABLED" ]]

echo "Deployment verified: ${SERVICE_URL}"
