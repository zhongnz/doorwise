#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-doorwise}"
PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${REGION:-us-central1}"
MODEL_NAME="${GEMINI_LIVE_MODEL:-gemini-2.5-flash-native-audio-latest}"
ENV_FILE="${ROOT_DIR}/.env"
GCLOUD_BIN="${GCLOUD_BIN:-$(command -v gcloud 2>/dev/null || true)}"

if [[ -z "${GCLOUD_BIN}" && -x "${HOME}/google-cloud-sdk/bin/gcloud" ]]; then
  GCLOUD_BIN="${HOME}/google-cloud-sdk/bin/gcloud"
fi

if [[ -z "${GCLOUD_BIN}" ]]; then
  echo "gcloud is not installed. Install the Google Cloud CLI first." >&2
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-}}"
  MODEL_NAME="${GEMINI_LIVE_MODEL:-${MODEL_NAME}}"
fi

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Set PROJECT_ID or GOOGLE_CLOUD_PROJECT before deploying." >&2
  exit 1
fi

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "GOOGLE_API_KEY must be set in the environment or .env before deploying." >&2
  exit 1
fi

ACTIVE_ACCOUNT="$("${GCLOUD_BIN}" auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "${ACTIVE_ACCOUNT}" ]]; then
  echo "No active gcloud account found. Run: gcloud auth login" >&2
  exit 1
fi

TMP_ENV_FILE="$(mktemp)"
cleanup() {
  rm -f "${TMP_ENV_FILE}"
}
trap cleanup EXIT

python - <<'PY' > "${TMP_ENV_FILE}"
import os

def emit(key: str, value: str) -> None:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    print(f'{key}: "{escaped}"')

emit("GOOGLE_API_KEY", os.environ["GOOGLE_API_KEY"])
emit("GEMINI_LIVE_MODEL", os.environ.get("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest"))
emit("GEMINI_VISION_MODEL", os.environ.get("GEMINI_VISION_MODEL", "gemini-2.5-flash-lite"))

token = os.environ.get("SOCRATA_APP_TOKEN", "").strip()
if token and not token.lower().startswith("your_") and token.lower() not in {"optional_token_here", "none"}:
    emit("SOCRATA_APP_TOKEN", token)
PY

"${GCLOUD_BIN}" services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project "${PROJECT_ID}"

"${GCLOUD_BIN}" run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source "${ROOT_DIR}" \
  --port 8080 \
  --allow-unauthenticated \
  --env-vars-file "${TMP_ENV_FILE}"
