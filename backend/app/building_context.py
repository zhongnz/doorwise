import os
import re
from typing import Any, Dict, Iterable, Optional


def normalize_phone(value: Optional[str]) -> str:
    if not value:
        return ""

    return re.sub(r"\s+", " ", value).strip()


def normalize_vendor_name(value: str) -> str:
    lowered = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    return " ".join(lowered.split())


def parse_vendor_list(raw: Optional[str]) -> list[str]:
    if not raw:
        return []

    values = re.split(r"[\n,;]+", raw)
    normalized: list[str] = []
    seen: set[str] = set()

    for value in values:
        clean = value.strip()
        if not clean:
            continue
        key = normalize_vendor_name(clean)
        if not key or key in seen:
            continue
        seen.add(key)
        normalized.append(clean)

    return normalized


DEFAULT_BUILDING_CONTEXT = {
    "building_name": os.getenv("BUILDING_NAME", "").strip(),
    "management_phone": normalize_phone(os.getenv("BUILDING_MANAGEMENT_PHONE")),
    "super_phone": normalize_phone(os.getenv("BUILDING_SUPER_PHONE")),
    "approved_vendors": parse_vendor_list(os.getenv("APPROVED_VENDORS")),
    "trusted_id_organizations": parse_vendor_list(os.getenv("TRUSTED_ID_ORGANIZATIONS")),
}


def merge_building_context(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    context = {
        "building_name": DEFAULT_BUILDING_CONTEXT["building_name"],
        "management_phone": DEFAULT_BUILDING_CONTEXT["management_phone"],
        "super_phone": DEFAULT_BUILDING_CONTEXT["super_phone"],
        "approved_vendors": list(DEFAULT_BUILDING_CONTEXT["approved_vendors"]),
        "trusted_id_organizations": list(DEFAULT_BUILDING_CONTEXT["trusted_id_organizations"]),
    }

    if not payload:
        return context

    building_name = str(payload.get("building_name") or "").strip()
    management_phone = normalize_phone(payload.get("management_phone"))
    super_phone = normalize_phone(payload.get("super_phone"))
    approved_vendors = payload.get("approved_vendors") or []
    trusted_id_organizations = payload.get("trusted_id_organizations") or []

    if building_name:
        context["building_name"] = building_name
    if management_phone:
        context["management_phone"] = management_phone
    if super_phone:
        context["super_phone"] = super_phone

    merged_vendors: list[str] = []
    seen: set[str] = set()
    for vendor in [*context["approved_vendors"], *approved_vendors]:
        clean = str(vendor).strip()
        if not clean:
            continue
        key = normalize_vendor_name(clean)
        if not key or key in seen:
            continue
        seen.add(key)
        merged_vendors.append(clean)

    context["approved_vendors"] = merged_vendors
    merged_trusted_orgs: list[str] = []
    seen_trusted_orgs: set[str] = set()
    for organization in [*context["trusted_id_organizations"], *trusted_id_organizations]:
        clean = str(organization).strip()
        if not clean:
            continue
        key = normalize_vendor_name(clean)
        if not key or key in seen_trusted_orgs:
            continue
        seen_trusted_orgs.add(key)
        merged_trusted_orgs.append(clean)

    context["trusted_id_organizations"] = merged_trusted_orgs
    return context


def format_contact_line(label: str, value: str) -> str:
    if not value:
        return ""
    return f"{label}: {value}"


def contact_lines(context: Dict[str, Any]) -> Iterable[str]:
    management_line = format_contact_line("Management", context.get("management_phone", ""))
    super_line = format_contact_line("Super", context.get("super_phone", ""))

    for line in [management_line, super_line]:
        if line:
            yield line
