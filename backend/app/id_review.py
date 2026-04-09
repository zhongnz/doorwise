import asyncio
import json
import os
from typing import Any, Dict, Literal, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

DEFAULT_VISION_MODEL = "gemini-2.5-flash-lite"
VISION_MODEL_FALLBACKS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
]


def get_api_key() -> Optional[str]:
    return os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")


def get_vision_model() -> str:
    configured = (os.getenv("GEMINI_VISION_MODEL") or DEFAULT_VISION_MODEL).strip()
    if configured.startswith("models/"):
        return configured.removeprefix("models/")
    return configured


def vision_model_candidates() -> list[str]:
    configured = get_vision_model()
    candidates: list[str] = []
    for candidate in [configured, *VISION_MODEL_FALLBACKS]:
        normalized = candidate.strip()
        if not normalized or normalized in candidates:
            continue
        candidates.append(normalized)
    return candidates


class IdReviewResult(BaseModel):
    document_present: bool = Field(description="Whether the image appears to show an identification document or work badge.")
    document_type: Literal["city_id", "company_id", "badge", "business_card", "unknown"] = Field(
        description="Best-fit category for the visible document."
    )
    person_name: Optional[str] = Field(default=None, description="Visible person name on the document, if readable.")
    organization_name: Optional[str] = Field(default=None, description="Visible organization, agency, or company name, if readable.")
    role_title: Optional[str] = Field(default=None, description="Visible role or title, if readable.")
    badge_or_employee_id: Optional[str] = Field(default=None, description="Visible badge, license, or employee number, if readable.")
    apartment_or_unit: Optional[str] = Field(default=None, description="Visible apartment or unit reference, if any.")
    expiration_date: Optional[str] = Field(default=None, description="Visible expiration date, if any.")
    claim_alignment: Literal["match", "partial", "mismatch", "unclear"] = Field(
        description="How well the document details align with the visitor's spoken or typed claim."
    )
    evidence_quality: Literal["clear", "usable", "poor"] = Field(
        description="How legible and usable the image is for extracting details."
    )
    reasoning: str = Field(description="Short explanation of what the image does or does not support.")
    recommended_action: str = Field(description="Practical next step for the user based on this document review.")


def build_id_review_prompt(
    *,
    visitor_claim: str,
    playbook: str,
    address_label: str,
    building_context: Dict[str, Any],
) -> str:
    approved_vendors = ", ".join(building_context.get("approved_vendors", [])) or "none configured"
    trusted_id_organizations = ", ".join(building_context.get("trusted_id_organizations", [])) or "none configured"
    building_name = building_context.get("building_name") or "not configured"
    management_phone = building_context.get("management_phone") or "not configured"
    super_phone = building_context.get("super_phone") or "not configured"

    return f"""
Review this image as supporting evidence for a building-access decision.

Important rules:
- Do not identify a person by their face.
- Only extract text or document details that are visible and reasonably legible.
- If the image is blurry, blocked, or not clearly an ID, say so.
- Compare the visible organization, person name, title, and badge details to the visitor claim.
- Pay special attention to organization text on university, employer, agency, or contractor IDs.
- This review is supporting evidence only. It does not authorize entry by itself.
- Keep reasoning concise and practical.

Visitor claim: {visitor_claim}
Detected playbook: {playbook}
Building address: {address_label}
Building name: {building_name}
Approved vendors: {approved_vendors}
Trusted ID organizations: {trusted_id_organizations}
Management phone on file: {management_phone}
Super phone on file: {super_phone}
""".strip()


def build_retry_prompt() -> str:
    return (
        "Return valid compact JSON only. "
        "Keep reasoning and recommended_action short. "
        "If text is unreadable or the image is not clearly an ID, set claim_alignment to 'unclear' and evidence_quality to 'poor'."
    )


def fallback_review(*, model_name: str, message: str, quota_exhausted: bool = False) -> Dict[str, Any]:
    result = IdReviewResult(
        document_present=False,
        document_type="unknown",
        person_name=None,
        organization_name=None,
        role_title=None,
        badge_or_employee_id=None,
        apartment_or_unit=None,
        expiration_date=None,
        claim_alignment="unclear",
        evidence_quality="poor",
        reasoning=message,
        recommended_action="Retake or upload a clearer ID image and treat this as unverified until a callback confirms the visitor.",
    )
    payload = result.model_dump()
    payload["model"] = model_name
    payload["fallback_used"] = True
    if quota_exhausted:
        payload["quota_exhausted"] = True
    return payload


def is_quota_exhausted_error(error: Exception) -> bool:
    text = str(error).lower()
    return (
        "resource_exhausted" in text
        or "quota exceeded" in text
        or "rate limit" in text
        or "429" in text
    )


def coerce_review_result(response: Any, model_name: str) -> Dict[str, Any]:
    parsed = response.parsed
    if isinstance(parsed, IdReviewResult):
        result = parsed
    elif parsed:
        result = IdReviewResult.model_validate(parsed)
    elif response.text:
        try:
            result = IdReviewResult.model_validate_json(response.text)
        except Exception:
            result = IdReviewResult.model_validate(json.loads(response.text))
    else:
        raise RuntimeError("Gemini returned an empty ID review response.")

    payload = result.model_dump()
    payload["model"] = model_name
    return payload


def _review_supporting_id_sync(
    *,
    image_bytes: bytes,
    mime_type: str,
    visitor_claim: str,
    playbook: str,
    address_label: str,
    building_context: Dict[str, Any],
) -> Dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("Gemini API key is not configured.")

    if not mime_type.startswith("image/"):
        raise ValueError("Only image uploads are supported for ID review.")

    prompt = build_id_review_prompt(
        visitor_claim=visitor_claim,
        playbook=playbook,
        address_label=address_label,
        building_context=building_context,
    )
    with genai.Client(api_key=api_key) as client:
        last_error: Optional[Exception] = None

        for model_name in vision_model_candidates():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        prompt,
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=IdReviewResult,
                        temperature=0.1,
                        max_output_tokens=500,
                    ),
                )
                try:
                    return coerce_review_result(response, model_name)
                except Exception:
                    retry_response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            f"{prompt}\n\n{build_retry_prompt()}",
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=IdReviewResult,
                            temperature=0.0,
                            max_output_tokens=350,
                        ),
                    )
                    try:
                        payload = coerce_review_result(retry_response, model_name)
                        payload["fallback_used"] = True
                        return payload
                    except Exception:
                        return fallback_review(
                            model_name=model_name,
                            message="Gemini could not return a reliable structured document review for this image.",
                        )
            except Exception as exc:
                last_error = exc
                if is_quota_exhausted_error(exc):
                    continue
                raise

        exhausted_model = vision_model_candidates()[0]
        if last_error and is_quota_exhausted_error(last_error):
            return fallback_review(
                model_name=exhausted_model,
                message=(
                    "Gemini ID review is temporarily unavailable because the current API quota is exhausted. "
                    "Try again later, switch to a different model, or enable billing in Google AI Studio."
                ),
                quota_exhausted=True,
            )

        raise last_error or RuntimeError("Gemini could not review the uploaded image.")


async def review_supporting_id(
    *,
    image_bytes: bytes,
    mime_type: str,
    visitor_claim: str,
    playbook: str,
    address_label: str,
    building_context: Dict[str, Any],
) -> Dict[str, Any]:
    return await asyncio.to_thread(
        _review_supporting_id_sync,
        image_bytes=image_bytes,
        mime_type=mime_type,
        visitor_claim=visitor_claim,
        playbook=playbook,
        address_label=address_label,
        building_context=building_context,
    )
