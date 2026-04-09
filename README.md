# DoorWise

DoorWise is a voice-first access verification product for NYC multifamily housing. It helps residents and building staff decide whether to open the door when someone claims to be from management, inspection, repair, or a building-approved organization that should be checked by ID.

It gives you one place to:

- check whether the building has matching city-record support
- capture a building-access claim with Gemini Live voice, with text fallback when needed
- verify that claim against a focused set of NYC datasets
- see the decision, what to say, what to do, and who to call before opening the door

## What ships today

- React + Vite frontend with landing, setup, and dashboard flows
- FastAPI backend with city-record check and playbook-driven verification endpoints
- Browser camera preview when permissions are available
- Gemini Live websocket integration as the primary claim-intake path, with text fallback
- Optional Gemini ID review from an uploaded image or captured camera frame
- Browser notification support for final verdict alerts
- Local incident log for recent verification decisions
- Static frontend serving from FastAPI for single-container deployment

## Current records used

| Dataset | ID | Current usage |
| --- | --- | --- |
| HPD Violations | `wvxf-dwi5` | open and historical housing-code evidence |
| Multiple Dwelling Registrations | `tesw-yqqr` | confirms an active building registration record |
| Registration Contacts | `feu5-w2e2` | supports owner and managing-agent lookups |
| DOB NOW Approved Permits | `rbx6-tga4` | supports contractor and repair permit checks |

You can still set `SOCRATA_APP_TOKEN` if you want more reliable access to NYC Open Data in general, but the current product stays intentionally focused on the dataset set above.

## Quick start

### Frontend

```bash
npm install
npm run dev
```

Vite proxies `/api` and `/ws` to the backend during local development.

### Backend

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

### Environment

Copy `.env.example` to `.env` and fill in the values you need:

```bash
GOOGLE_API_KEY=your_key_here
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-latest
GEMINI_VISION_MODEL=gemini-2.5-flash-lite
SOCRATA_APP_TOKEN=optional_token_here
BUILDING_MANAGEMENT_PHONE=optional_phone_here
BUILDING_SUPER_PHONE=optional_phone_here
APPROVED_VENDORS=optional,comma,separated,vendors
TRUSTED_ID_ORGANIZATIONS=New York University,NYU
```

## Production build

```bash
npm run build
docker build -t doorwise .
```

The FastAPI app serves the built frontend from `dist/` or `static/`, so the Docker image can run as a single service.

## Deploy to Google Cloud Run

This repo is set up for single-container deployment on Cloud Run.

1. Install the Google Cloud CLI and sign in.
2. Set your project and optional region.
3. Put your runtime secrets in `.env`.
4. Run the deploy script.

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

./scripts/deploy-cloud-run.sh
```

The script will:

- load `.env` if present
- require `GOOGLE_API_KEY`
- enable the Cloud Run, Cloud Build, and Artifact Registry APIs
- deploy the app from source with the included Dockerfile

Optional variables:

```bash
SERVICE_NAME=doorwise
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-latest
SOCRATA_APP_TOKEN=optional_token_here
```

## Current limitations

- Voice is the primary experience in the product story, while text remains the fallback path when microphone access or live connectivity is unavailable.
- The camera view is a live preview only in the current MVP; it does not run person detection continuously.
- DoorWise currently supports three core playbooks: inspector, contractor, and management access requests, plus trusted-organization ID review when the building config allows it.
- Gemini ID review is supporting evidence first, but it can trigger a building-defined trusted-ID policy when you configure allowed organizations such as NYU.
- If Google AI Studio free-tier quota is exhausted, DoorWise falls back to a safe manual-review response instead of crashing the ID workflow.
- Browser alerts are supported today; a dedicated phone notification path is still future work.
- Building callback numbers, approved vendors, and trusted ID organizations are only used when you configure them in setup or environment variables.

## Expansion paths

- scheduled maintenance and vendor roster imports
- richer camera analysis and badge extraction
- mobile push or SMS alerts
- deeper property-management integrations

## Demo

For a live investor or customer walkthrough, use the guided script in [DEMO_SCRIPT.md](/home/ptz/dev/DoorGuard-NYC/DEMO_SCRIPT.md).

## Proprietary Notice

DoorWise is proprietary and confidential. See [LICENSE](/home/ptz/dev/DoorGuard-NYC/LICENSE) for the current repository terms.
