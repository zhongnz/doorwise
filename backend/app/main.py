import asyncio
import base64
import binascii
import os
import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

from .building_context import contact_lines, merge_building_context  # noqa: E402
from .id_review import review_supporting_id  # noqa: E402
from .nyc_data import (  # noqa: E402
    QueryResult,
    check_dob_now_approved_permits,
    check_hpd_violations,
    check_multiple_dwelling_registrations,
    check_registration_contacts,
    normalize_borough,
    normalize_street,
    validate_address_against_open_data,
)
from .voice import router as voice_router  # noqa: E402

app = FastAPI(title="DoorWise API")

frontend_origins = {
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
}
configured_frontend = os.getenv("FRONTEND_URL")
if configured_frontend:
    frontend_origins.add(configured_frontend.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(frontend_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)


class AddressInput(BaseModel):
    houseNumber: str
    street: str
    borough: str
    apartment: Optional[str] = None


class BuildingContextInput(BaseModel):
    building_name: Optional[str] = None
    management_phone: Optional[str] = None
    super_phone: Optional[str] = None
    approved_vendors: List[str] = Field(default_factory=list)
    trusted_id_organizations: List[str] = Field(default_factory=list)


class VerificationRequest(BaseModel):
    address: AddressInput
    visitor_claim: str
    building_context: Optional[BuildingContextInput] = None


class IdReviewRequest(BaseModel):
    address: AddressInput
    visitor_claim: str
    mime_type: str
    image_base64: str
    building_context: Optional[BuildingContextInput] = None
    source: Optional[str] = None


def format_address(address: AddressInput) -> str:
    line = (
        f"{address.houseNumber.strip()} "
        f"{normalize_street(address.street).title()}, "
        f"{normalize_borough(address.borough).title()}"
    )
    if address.apartment:
        line += f" Apt {address.apartment.strip()}"
    return line


def normalize_text(value: str) -> str:
    lowered = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    return " ".join(lowered.split())


def abbreviation_for_text(value: str) -> str:
    words = [word for word in normalize_text(value).split() if word and word not in {"of", "the", "and"}]
    if len(words) < 2:
        return ""
    return "".join(word[0] for word in words)


def dataset_summary(result: QueryResult) -> Dict[str, Any]:
    return {
        "key": result.key,
        "label": result.label,
        "count": len(result.records),
        "status": "ok" if result.ok else "unavailable",
        "error": result.error,
    }


def summarize_record(result: QueryResult, record: Dict[str, Any]) -> Dict[str, Any]:
    selected_fields: Dict[str, Any] = {}
    field_map = {
        "hpd_violations": [
            "violationid",
            "violationstatus",
            "novissueddate",
            "class",
            "novdescription",
        ],
        "multiple_dwelling_registrations": [
            "registrationid",
            "lastregistrationdate",
            "registrationenddate",
            "bin",
        ],
        "registration_contacts": [
            "type",
            "corporationname",
            "firstname",
            "lastname",
            "businesscity",
            "businessstate",
        ],
        "dob_now_approved_permits": [
            "job_filing_number",
            "work_type",
            "permit_status",
            "applicant_business_name",
            "work_permit",
        ],
    }

    for key in field_map.get(result.key, []):
        if record.get(key):
            selected_fields[key] = record.get(key)

    return {
        "dataset": result.label,
        "fields": selected_fields,
    }


def matched_records(results: List[QueryResult]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for result in results:
        if not result.ok:
            continue
        for record in result.records[:2]:
            items.append(summarize_record(result, record))
    return items


def classify_claim(claim: str) -> str:
    text = normalize_text(claim)

    management_keywords = [
        "landlord",
        "management",
        "property manager",
        "owner",
        "leasing office",
        "super",
        "building office",
    ]
    contractor_keywords = [
        "contractor",
        "repair",
        "maintenance",
        "plumber",
        "electrician",
        "installer",
        "vendor",
        "work order",
        "renovation",
        "construction",
        "permit",
        "exterminator",
    ]
    inspector_keywords = [
        "hpd",
        "dob inspector",
        "housing preservation",
        "inspection",
        "inspector",
        "department of buildings",
    ]

    if any(keyword in text for keyword in management_keywords):
        return "management"
    if any(keyword in text for keyword in contractor_keywords):
        return "contractor"
    if any(keyword in text for keyword in inspector_keywords):
        return "inspector"
    return "unknown"


def detect_inspector_agency(claim: str) -> str:
    text = normalize_text(claim)
    if "hpd" in text or "housing preservation" in text:
        return "HPD"
    if "dob" in text or "department of buildings" in text:
        return "DOB"
    return "city"


def has_active_registration(records: List[Dict[str, Any]]) -> bool:
    today = date.today()
    for record in records:
        end_date = record.get("registrationenddate")
        if not end_date:
            return True
        try:
            if date.fromisoformat(str(end_date)[:10]) >= today:
                return True
        except ValueError:
            return True
    return False


def contact_candidates(records: List[Dict[str, Any]]) -> List[str]:
    candidates: List[str] = []
    for record in records:
        company = str(record.get("corporationname") or "").strip()
        first_name = str(record.get("firstname") or "").strip()
        last_name = str(record.get("lastname") or "").strip()
        full_name = " ".join(part for part in [first_name, last_name] if part)
        for value in [company, full_name]:
            if value:
                candidates.append(value)
    return candidates


def find_claim_match(claim: str, candidates: List[str]) -> str:
    normalized_claim = normalize_text(claim)
    for candidate in candidates:
        normalized_candidate = normalize_text(candidate)
        if len(normalized_candidate) < 4:
            continue
        if normalized_candidate in normalized_claim:
            return candidate
    return ""


def find_trusted_organization_match(organization_name: str, candidates: List[str]) -> str:
    organization = str(organization_name or "").strip()
    if not organization:
        return ""

    for candidate in candidates:
        if text_values_overlap(organization, candidate):
            return candidate
    return ""


def find_trusted_organization_claim_match(claim: str, context: Dict[str, Any]) -> str:
    normalized_claim = normalize_text(claim)
    if not normalized_claim:
        return ""

    for candidate in list(context.get("trusted_id_organizations", [])):
        normalized_candidate = normalize_text(candidate)
        candidate_abbreviation = abbreviation_for_text(candidate)
        if (
            (normalized_candidate and normalized_candidate in normalized_claim)
            or (candidate_abbreviation and candidate_abbreviation in normalized_claim)
        ):
            return candidate

    return ""


def text_values_overlap(left: str, right: str) -> bool:
    normalized_left = normalize_text(left)
    normalized_right = normalize_text(right)
    if len(normalized_left) < 4 or len(normalized_right) < 4:
        left_abbreviation = abbreviation_for_text(left)
        right_abbreviation = abbreviation_for_text(right)
        if left_abbreviation and left_abbreviation == normalized_right:
            return True
        if right_abbreviation and right_abbreviation == normalized_left:
            return True
        return normalized_left == normalized_right and bool(normalized_left)

    if normalized_left in normalized_right or normalized_right in normalized_left:
        return True

    left_abbreviation = abbreviation_for_text(left)
    right_abbreviation = abbreviation_for_text(right)
    if left_abbreviation and left_abbreviation == normalized_right:
        return True
    if right_abbreviation and right_abbreviation == normalized_left:
        return True
    return False


def permit_business_candidates(records: List[Dict[str, Any]]) -> List[str]:
    candidates: List[str] = []
    for record in records:
        for key in ["applicant_business_name", "owner_business_name"]:
            value = str(record.get(key) or "").strip()
            if value:
                candidates.append(value)
    return candidates


def find_matching_permit_business(vendor_name: str, records: List[Dict[str, Any]]) -> str:
    for candidate in permit_business_candidates(records):
        if text_values_overlap(vendor_name, candidate):
            return candidate
    return ""


def management_contacts(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    management_types = {"Agent", "SiteManager", "HeadOfficer", "Officer", "CorporateOwner", "IndividualOwner"}
    filtered = [record for record in records if str(record.get("type") or "") in management_types]
    return filtered or records


def contact_display_names(records: List[Dict[str, Any]], limit: int = 2) -> List[str]:
    names: List[str] = []
    for record in records[:limit]:
        company = str(record.get("corporationname") or "").strip()
        full_name = " ".join(
            part
            for part in [str(record.get("firstname") or "").strip(), str(record.get("lastname") or "").strip()]
            if part
        )
        if company:
            names.append(company)
        elif full_name:
            names.append(full_name)
    return names


def build_escalation_contact(context: Dict[str, Any], fallback: str) -> str:
    configured_contacts = list(contact_lines(context))
    if configured_contacts:
        return " | ".join(configured_contacts)
    return fallback


def build_response_payload(
    *,
    decision: str,
    confidence: str,
    playbook: str,
    reasoning: str,
    recommended_script: str,
    recommended_action: str,
    escalation_contact: str,
    results: List[QueryResult],
) -> Dict[str, Any]:
    return {
        "decision": decision,
        "verdict": decision,
        "confidence": confidence,
        "playbook": playbook,
        "reasoning": reasoning,
        "recommended_script": recommended_script,
        "recommended_action": recommended_action,
        "escalation_contact": escalation_contact,
        "matched_records": matched_records(results),
        "datasets": [dataset_summary(result) for result in results],
    }


def build_inspector_playbook(claim: str, context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    agency = detect_inspector_agency(claim)
    hpd_violations = results_by_key.get("hpd_violations")
    dob_permits = results_by_key.get("dob_now_approved_permits")
    active_signal = False
    reasoning = ""

    if agency == "HPD" and hpd_violations and hpd_violations.ok and hpd_violations.records:
        active_signal = True
        reasoning = (
            "Open HPD violations exist at this address, so an HPD inspection claim is plausible, "
            "but same-day access still needs identity confirmation."
        )
    elif agency == "DOB" and dob_permits and dob_permits.ok and dob_permits.records:
        active_signal = True
        reasoning = (
            "DoorWise found DOB NOW permit activity at this address, so a DOB-related inspection claim "
            "is plausible, but it still needs a callback or visual ID check."
        )
    else:
        reasoning = (
            "DoorWise did not find enough inspection-related support for this address to treat the visit "
            "as expected."
        )

    if active_signal:
        return build_response_payload(
            decision="CALL_TO_CONFIRM",
            confidence="medium",
            playbook="inspector",
            reasoning=reasoning,
            recommended_script="Please hold your city ID to the camera and state your agency and inspection order number.",
            recommended_action="Call building management or the super before opening the door.",
            escalation_contact=build_escalation_contact(
                context,
                "No building callback number is configured. Use your building's posted management number.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    return build_response_payload(
        decision="DO_NOT_OPEN",
        confidence="low",
        playbook="inspector",
        reasoning=reasoning,
        recommended_script="Please restate your agency, badge number, and who scheduled this inspection.",
        recommended_action="Do not open the door until the visit is confirmed by management or a known building contact.",
        escalation_contact=build_escalation_contact(
            context,
            "No building callback number is configured. Use your building's posted management number.",
        ),
        results=[result for result in results_by_key.values() if result],
    )


def build_contractor_playbook(claim: str, context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    permits = results_by_key.get("dob_now_approved_permits")
    vendor_name = find_claim_match(claim, list(context.get("approved_vendors", [])))
    permit_match = permits and permits.ok and bool(permits.records)
    permit_business_match = ""
    if vendor_name and permit_match:
        permit_business_match = find_matching_permit_business(vendor_name, permits.records)

    if vendor_name and permit_business_match:
        return build_response_payload(
            decision="PROCEED_AFTER_ID_CHECK",
            confidence="high",
            playbook="contractor",
            reasoning=(
                f'The claim matches approved vendor "{vendor_name}", and the DOB NOW permit activity also points to '
                f'"{permit_business_match}" at this address.'
            ),
            recommended_script="Please hold your company ID to the camera and confirm the apartment and work order.",
            recommended_action="Proceed only after checking ID and keeping access limited to the stated job.",
            escalation_contact=build_escalation_contact(
                context,
                "No building callback number is configured. Keep access limited and notify building staff.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    if vendor_name or permit_match:
        reason_parts = []
        if vendor_name:
            reason_parts.append(f'The claim matches approved vendor "{vendor_name}".')
        if permit_match:
            reason_parts.append("DoorWise found DOB NOW permit activity at this address.")
        if vendor_name and permit_match and not permit_business_match:
            reason_parts.append(
                "The permit record does not clearly name the same vendor, so this still needs a callback."
            )

        return build_response_payload(
            decision="CALL_TO_CONFIRM",
            confidence="medium",
            playbook="contractor",
            reasoning=" ".join(reason_parts),
            recommended_script="Please wait while I confirm your company, work order, and apartment with building staff.",
            recommended_action="Call management or the super before opening the door.",
            escalation_contact=build_escalation_contact(
                context,
                "No building callback number is configured. Use your building's posted management number.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    return build_response_payload(
        decision="DO_NOT_OPEN",
        confidence="low",
        playbook="contractor",
        reasoning=(
            "DoorWise did not find an approved vendor match or supporting permit activity for this address."
        ),
        recommended_script="Please state your company, who sent you, and the work order number.",
        recommended_action="Do not open until the contractor is confirmed by management or the super.",
        escalation_contact=build_escalation_contact(
            context,
            "No building callback number is configured. Use your building's posted management number.",
        ),
        results=[result for result in results_by_key.values() if result],
    )


def build_management_playbook(claim: str, context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    registrations = results_by_key.get("multiple_dwelling_registrations")
    contacts = results_by_key.get("registration_contacts")
    active_registration = bool(registrations and registrations.ok and has_active_registration(registrations.records))
    contact_match = ""
    known_contacts: List[Dict[str, Any]] = []
    if contacts and contacts.ok:
        known_contacts = management_contacts(contacts.records)
        contact_match = find_claim_match(claim, contact_candidates(known_contacts))

    if active_registration and contact_match:
        return build_response_payload(
            decision="CALL_TO_CONFIRM",
            confidence="medium",
            playbook="management",
            reasoning=(
                f'The claim matches "{contact_match}" from the building registration contacts, '
                "but this visit still needs callback confirmation before entry."
            ),
            recommended_script="Please wait while I call management to confirm your visit and unit access.",
            recommended_action="Call the management number on file before opening the door.",
            escalation_contact=build_escalation_contact(
                context,
                "No management callback number is configured. Use your building's posted management number.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    if active_registration and known_contacts:
        displayed_names = ", ".join(contact_display_names(known_contacts))
        reasoning = "This building has an active multiple dwelling registration and named management contacts on file"
        if displayed_names:
            reasoning += f" ({displayed_names})"
        reasoning += ", but the visitor did not state a matching management name."

        return build_response_payload(
            decision="CALL_TO_CONFIRM",
            confidence="medium" if (context.get("management_phone") or context.get("super_phone")) else "low",
            playbook="management",
            reasoning=reasoning,
            recommended_script="Please wait while I verify your name and company with building management.",
            recommended_action="Call management or the super before opening the door.",
            escalation_contact=build_escalation_contact(
                context,
                "No management callback number is configured. Use your building's posted management number.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    if active_registration:
        return build_response_payload(
            decision="CALL_TO_CONFIRM",
            confidence="low",
            playbook="management",
            reasoning=(
                "This building has an active multiple dwelling registration, but DoorWise did not find named "
                "management contacts to match against the visitor statement."
            ),
            recommended_script="Please wait while I verify your name and company with building management.",
            recommended_action="Call management or the super before opening the door.",
            escalation_contact=build_escalation_contact(
                context,
                "No management callback number is configured. Use your building's posted management number.",
            ),
            results=[result for result in results_by_key.values() if result],
        )

    return build_response_payload(
        decision="DO_NOT_OPEN",
        confidence="low",
        playbook="management",
        reasoning=(
            "DoorWise could not confirm a registered management contact or active building registration for this address."
        ),
        recommended_script="Please state your full name, company, and who gave notice for this visit.",
        recommended_action="Do not open until the visitor is confirmed through a known management or super number.",
        escalation_contact=build_escalation_contact(
            context,
            "No management callback number is configured. Use your building's posted management number.",
        ),
        results=[result for result in results_by_key.values() if result],
    )


def build_trusted_id_playbook(claim: str, context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    organization_match = find_trusted_organization_claim_match(claim, context)

    return build_response_payload(
        decision="CALL_TO_CONFIRM",
        confidence="medium",
        playbook="trusted-id",
        reasoning=(
            f'The claim mentions trusted organization "{organization_match}", so DoorWise should verify a visible ID '
            "before any access decision."
        ),
        recommended_script=f'Please hold your {organization_match} ID to the camera or upload a clear image now.',
        recommended_action="Capture or upload the ID image before allowing entry.",
        escalation_contact=build_escalation_contact(
            context,
            "No building callback number is configured. Use a known building contact if the ID remains unclear.",
        ),
        results=[result for result in results_by_key.values() if result],
    )


def build_unknown_playbook(context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    return build_response_payload(
        decision="DO_NOT_OPEN",
        confidence="low",
        playbook="unknown",
        reasoning=(
            "DoorWise currently supports inspector, contractor, and management entry requests."
        ),
        recommended_script="Please state your full name, company, and building-related reason for visiting.",
        recommended_action="Do not open until the visit is restated in one of the supported building-access categories.",
        escalation_contact=build_escalation_contact(
            context,
            "No building callback number is configured. Use your building's posted management number.",
        ),
        results=[result for result in results_by_key.values() if result],
    )


async def collect_playbook_evidence(playbook: str, address: AddressInput) -> Dict[str, QueryResult]:
    tasks: Dict[str, Any] = {
        "multiple_dwelling_registrations": check_multiple_dwelling_registrations(
            address.houseNumber,
            address.street,
            address.borough,
        ),
        "registration_contacts": check_registration_contacts(
            address.houseNumber,
            address.street,
            address.borough,
        ),
    }

    if playbook == "inspector":
        tasks["hpd_violations"] = check_hpd_violations(
            address.houseNumber,
            address.street,
            address.borough,
        )
        tasks["dob_now_approved_permits"] = check_dob_now_approved_permits(
            address.houseNumber,
            address.street,
            address.borough,
        )
    elif playbook == "contractor":
        tasks["dob_now_approved_permits"] = check_dob_now_approved_permits(
            address.houseNumber,
            address.street,
            address.borough,
        )

    keys = list(tasks.keys())
    values = await asyncio.gather(*tasks.values())
    return dict(zip(keys, values))


def generate_playbook_response(claim: str, context: Dict[str, Any], results_by_key: Dict[str, QueryResult]) -> Dict[str, Any]:
    playbook = classify_claim(claim)

    if playbook == "inspector":
        return build_inspector_playbook(claim, context, results_by_key)
    if playbook == "contractor":
        return build_contractor_playbook(claim, context, results_by_key)
    if playbook == "management":
        return build_management_playbook(claim, context, results_by_key)
    if find_trusted_organization_claim_match(claim, context):
        return build_trusted_id_playbook(claim, context, results_by_key)
    return build_unknown_playbook(context, results_by_key)


def apply_id_review_policy(review: Dict[str, Any], playbook: str, context: Dict[str, Any]) -> Dict[str, Any]:
    trusted_match = find_trusted_organization_match(
        str(review.get("organization_name") or ""),
        list(context.get("trusted_id_organizations", [])),
    )
    claim_alignment = str(review.get("claim_alignment") or "")
    evidence_quality = str(review.get("evidence_quality") or "")
    document_present = bool(review.get("document_present"))

    if trusted_match:
        review["trusted_organization_match"] = trusted_match

    if not trusted_match:
        return review

    if document_present and claim_alignment in {"match", "partial"} and evidence_quality in {"clear", "usable"}:
        review["policy_decision"] = "PROCEED_AFTER_ID_CHECK"
        review["policy_reasoning"] = (
            f'The document appears to match trusted organization "{trusted_match}", so the building policy can allow '
            "entry after a final visual ID check."
        )
        review["policy_action"] = (
            "Proceed after checking that the person holding the ID matches the visible photo and keep access limited "
            "to the stated purpose."
        )
        review["policy_script"] = "Please hold your ID steady for one more moment while I confirm the organization and photo."
        review["policy_confidence"] = "high" if claim_alignment == "match" else "medium"
    else:
        review["policy_decision"] = "CALL_TO_CONFIRM"
        review["policy_reasoning"] = (
            f'The ID points to trusted organization "{trusted_match}", but the image or claim match is not strong enough '
            "to open on ID alone."
        )
        review["policy_action"] = "Retake the ID image or call a known building contact before allowing entry."
        review["policy_script"] = "Please wait while I confirm your ID details with building staff."
        review["policy_confidence"] = "medium" if document_present else "low"

    review["policy_playbook"] = "trusted-id"
    return review


def decode_image_payload(image_base64: str) -> bytes:
    try:
        return base64.b64decode(image_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("The uploaded image could not be decoded.") from exc


@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "DoorWise Backend"}


@app.post("/api/address/validate")
async def validate_address(address: AddressInput) -> Dict[str, Any]:
    result = await validate_address_against_open_data(
        address.houseNumber,
        address.street,
        address.borough,
    )

    return {
        "address": {
            "houseNumber": address.houseNumber.strip(),
            "street": normalize_street(address.street).title(),
            "borough": normalize_borough(address.borough).title(),
            "apartment": address.apartment.strip() if address.apartment else None,
            "label": format_address(address),
        },
        **result,
    }


@app.post("/api/verify")
async def verify_visitor(req: VerificationRequest) -> Dict[str, Any]:
    try:
        context_payload = req.building_context.model_dump() if req.building_context else None
        building_context = merge_building_context(context_payload)
        results_by_key = await collect_playbook_evidence(classify_claim(req.visitor_claim), req.address)
        response = generate_playbook_response(req.visitor_claim, building_context, results_by_key)

        response.update(
            {
                "claim_type": response["playbook"],
                "address_label": format_address(req.address),
                "building_context": building_context,
            }
        )
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/review-id")
async def review_uploaded_id(req: IdReviewRequest) -> Dict[str, Any]:
    try:
        building_context = merge_building_context(req.building_context.model_dump() if req.building_context else None)
        playbook = classify_claim(req.visitor_claim)
        image_bytes = decode_image_payload(req.image_base64)
        review = await review_supporting_id(
            image_bytes=image_bytes,
            mime_type=req.mime_type,
            visitor_claim=req.visitor_claim,
            playbook=playbook,
            address_label=format_address(req.address),
            building_context=building_context,
        )
        review = apply_id_review_policy(review, playbook, building_context)

        return {
            **review,
            "claim_type": playbook,
            "address_label": format_address(req.address),
            "source": req.source or "upload",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def get_frontend_dir() -> Optional[Path]:
    static_dir = ROOT_DIR / "static"
    dist_dir = ROOT_DIR / "dist"

    if static_dir.exists():
        return static_dir
    if dist_dir.exists():
        return dist_dir
    return None


def resolve_frontend_file(path: str) -> Optional[Path]:
    frontend_dir = get_frontend_dir()
    if not frontend_dir:
        return None

    candidate = (frontend_dir / path).resolve()
    if frontend_dir.resolve() not in candidate.parents and candidate != frontend_dir.resolve():
        return None
    if candidate.is_file():
        return candidate
    if "." in Path(path).name:
        return None
    return frontend_dir / "index.html"


@app.get("/")
async def serve_root() -> FileResponse:
    file_path = resolve_frontend_file("")
    if not file_path:
        raise HTTPException(status_code=404, detail="Frontend bundle not found.")
    return FileResponse(file_path)


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found.")

    file_path = resolve_frontend_file(full_path)
    if not file_path:
        raise HTTPException(status_code=404, detail="Frontend bundle not found.")
    return FileResponse(file_path)
