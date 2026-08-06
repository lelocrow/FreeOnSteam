#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib.sh"

require_command gcloud

echo "Executing ${SYNC_JOB_NAME} in ${GCP_REGION}..."
gcloud run jobs execute "${SYNC_JOB_NAME}" \
  --region="${GCP_REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --wait
