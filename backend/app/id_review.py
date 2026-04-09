import asyncio
import os
from typing import Any, Dict, Literal, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

DEFAULT_VISION_MODEL = "gemini-2.5-flash"


def get_api_key() -> Optional[str]:
    return os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")


def get_vision_model() -> str:
    configured = (os.getenv("GEMINI_VISION_MODEL") or DEFAULT_VISION_MODEL).strip()
    if configured.startswith("models/"):
        return configured.removeprefix("models/")
    return configured


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
- This review is supporting evidence only. It does not authorize entry by itself.
- Keep reasoning concise and practical.

Visitor claim: {visitor_claim}
Detected playbook: {playbook}
Building address: {address_label}
Building name: {building_name}
Approved vendors: {approved_vendors}
Management phone on file: {management_phone}
Super phone on file: {super_phone}
""".strip()


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
    model_name = get_vision_model()

    with genai.Client(api_key=api_key) as client:
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

    parsed = response.parsed
    if isinstance(parsed, IdReviewResult):
        result = parsed
    elif parsed:
        result = IdReviewResult.model_validate(parsed)
    elif response.text:
        result = IdReviewResult.model_validate_json(response.text)
    else:
        raise RuntimeError("Gemini returned an empty ID review response.")

    payload = result.model_dump()
    payload["model"] = model_name
    return payload


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
