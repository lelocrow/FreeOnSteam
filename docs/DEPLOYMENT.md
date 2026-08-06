# Deployment

This runbook deploys FreeOnSteam to Northern Virginia (`us-east4`). Cloud Run services and jobs, Cloud Scheduler, Artifact Registry, and Firestore Native all support this region. Verify current support before changing regions:

- [Cloud Run locations](https://cloud.google.com/run/docs/locations)
- [Firestore locations](https://cloud.google.com/firestore/docs/locations)
- [Cloud Scheduler locations](https://cloud.google.com/scheduler/docs/locations)
- [Artifact Registry locations](https://cloud.google.com/artifact-registry/docs/repositories/repo-locations)

The workflow creates no service-account keys and does not delete or replace resources.

## Resources

Default names are:

| Resource | Name | Region or scope |
| --- | --- | --- |
| Artifact Registry repository | `freeonsteam` | `us-east4` |
| Cloud Run service | `freeonsteam-web` | `us-east4` |
| Cloud Run Job | `freeonsteam-sync` | `us-east4` |
| Cloud Scheduler job | `freeonsteam-every-30-minutes` | `us-east4` |
| Firestore database | `(default)` | `us-east4` when newly created |
| Web service account | `freeonsteam-web` | Project |
| Sync service account | `freeonsteam-sync` | Project |
| Scheduler service account | `freeonsteam-scheduler` | Project |

If the selected Firestore database already exists, the bootstrap script reuses it and never attempts to relocate or replace it. Firestore location is immutable.

## Required permissions

The deploying identity needs permission to enable services, inspect billing, create Artifact Registry repositories, create service accounts and IAM bindings, create Firestore databases, submit Cloud Builds, deploy Cloud Run resources, and manage Cloud Scheduler. Project Owner is sufficient for a personal project but broader than required; a managed environment should grant only the corresponding administrative roles temporarily.

## Authenticate and select the project

```bash
gcloud auth login
gcloud auth list
gcloud projects describe "YOUR_PROJECT_ID"
gcloud billing projects describe "YOUR_PROJECT_ID"
```

Export the deployment configuration:

```bash
export GCP_PROJECT_ID="YOUR_PROJECT_ID"
export GCP_REGION="us-east4"
export FIRESTORE_DATABASE="(default)"
export WEB_SERVICE_NAME="freeonsteam-web"
export SYNC_JOB_NAME="freeonsteam-sync"
export SCHEDULER_JOB_NAME="freeonsteam-every-30-minutes"
export ARTIFACT_REPOSITORY="freeonsteam"
```

## Automated deployment

From the repository root:

```bash
npm ci
npm run check
./scripts/deploy.sh
```

Before creating anything, `bootstrap-gcp.sh` prints the project, region, database, repository, service, job, scheduler, and service accounts. The scripts are idempotent and safe to rerun.

## Exact manual workflow

The automation is the source of truth. The equivalent high-level commands are included for recovery and auditing.

Enable only required APIs:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  --project="$GCP_PROJECT_ID"
```

Create Firestore only if the selected database does not exist:

```bash
gcloud firestore databases describe \
  --database="$FIRESTORE_DATABASE" \
  --project="$GCP_PROJECT_ID" || \
gcloud firestore databases create \
  --database="$FIRESTORE_DATABASE" \
  --location="$GCP_REGION" \
  --type=firestore-native \
  --project="$GCP_PROJECT_ID"
```

Create Artifact Registry and the service accounts by running the bootstrap script:

```bash
./scripts/bootstrap-gcp.sh
```

Build the immutable image:

```bash
IMAGE_TAG="$(git rev-parse --short HEAD)"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/freeonsteam:${IMAGE_TAG}"
gcloud builds submit . --tag="$IMAGE_URI" --project="$GCP_PROJECT_ID"
```

Deploy the web service:

```bash
gcloud run deploy "$WEB_SERVICE_NAME" \
  --image="$IMAGE_URI" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --service-account="freeonsteam-web@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --port=8080 --cpu=1 --memory=512Mi --min=0 --max=3 \
  --concurrency=80 --timeout=30s \
  --set-env-vars="FIRESTORE_DATABASE=${FIRESTORE_DATABASE},STALE_AFTER_MINUTES=90"
```

Deploy the private job:

```bash
gcloud run jobs deploy "$SYNC_JOB_NAME" \
  --image="$IMAGE_URI" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --service-account="freeonsteam-sync@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --command=node --args=dist/sync.cjs \
  --cpu=1 --memory=512Mi --tasks=1 --max-retries=1 --task-timeout=20m \
  --set-env-vars="FIRESTORE_DATABASE=${FIRESTORE_DATABASE},STEAM_COUNTRY=BR,STEAM_LANGUAGE=english,STEAM_MAX_PAGES=20"
```

Grant the Scheduler identity permission on only that job:

```bash
gcloud run jobs add-iam-policy-binding "$SYNC_JOB_NAME" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --member="serviceAccount:freeonsteam-scheduler@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --condition=None
```

Create the OAuth Scheduler invocation:

```bash
SCHEDULER_URI="https://run.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${SYNC_JOB_NAME}:run"
gcloud scheduler jobs create http "$SCHEDULER_JOB_NAME" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --schedule="*/30 * * * *" \
  --time-zone="America/Sao_Paulo" \
  --uri="$SCHEDULER_URI" \
  --http-method=POST \
  --oauth-service-account-email="freeonsteam-scheduler@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --oauth-token-scope="https://www.googleapis.com/auth/cloud-platform" \
  --headers="Content-Type=application/json" \
  --message-body='{}' \
  --attempt-deadline=600s
```

Run and verify:

```bash
./scripts/run-sync.sh
./scripts/verify-deployment.sh
```

## Rollback

Images are tagged with the Git commit hash and retained in Artifact Registry. List available revisions and images:

```bash
gcloud run revisions list \
  --service="$WEB_SERVICE_NAME" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

gcloud artifacts docker images list \
  "${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/freeonsteam" \
  --include-tags \
  --project="$GCP_PROJECT_ID"
```

Rollback the web service and job to a known image without changing Firestore or Scheduler:

```bash
ROLLBACK_IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/freeonsteam:KNOWN_GOOD_TAG"

gcloud run services update "$WEB_SERVICE_NAME" \
  --image="$ROLLBACK_IMAGE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

gcloud run jobs update "$SYNC_JOB_NAME" \
  --image="$ROLLBACK_IMAGE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

./scripts/run-sync.sh
./scripts/verify-deployment.sh
```

If a new sync implementation is suspect, pause Scheduler before executing the rollback instructions in [Operations](OPERATIONS.md).
