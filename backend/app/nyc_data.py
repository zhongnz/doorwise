import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

DATASETS = {
    "hpd_violations": "wvxf-dwi5",
    "multiple_dwelling_registrations": "tesw-yqqr",
    "registration_contacts": "feu5-w2e2",
    "dob_now_approved_permits": "rbx6-tga4",
}

DATASET_LABELS = {
    "hpd_violations": "HPD Violations",
    "multiple_dwelling_registrations": "Multiple Dwelling Registrations",
    "registration_contacts": "Registration Contacts",
    "dob_now_approved_permits": "DOB NOW Approved Permits",
}

BASE_URL = "https://data.cityofnewyork.us/resource"


def normalize_optional_token(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    normalized = value.strip()
    lowered = normalized.lower()
    if lowered.startswith("your_") or lowered in {"optional_token_here", "none"}:
        return None

    return normalized


SOCRATA_APP_TOKEN = normalize_optional_token(os.getenv("SOCRATA_APP_TOKEN"))


@dataclass
class QueryResult:
    key: str
    label: str
    records: List[Dict[str, Any]]
    ok: bool
    error: Optional[str] = None


def sanitize_value(value: str) -> str:
    return value.strip().replace("'", "''")


def normalize_street(street: str) -> str:
    replacements = {
        " STREET": " ST",
        " ST.": " ST",
        " AVENUE": " AVE",
        " AVE.": " AVE",
        " ROAD": " RD",
        " RD.": " RD",
        " BOULEVARD": " BLVD",
        " BLVD.": " BLVD",
        " PLACE": " PL",
        " PLAZA": " PLZ",
    }
    normalized = sanitize_value(street).upper()
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return " ".join(normalized.split())


def normalize_borough(borough: str) -> str:
    value = sanitize_value(borough).upper()
    if value in {"THE BRONX", "BRONX"}:
        return "BRONX"
    if value in {"STATEN ISLAND", "STATEN"}:
        return "STATEN ISLAND"
    return value


async def query_nyc_data(dataset_key: str, where_clause: str, limit: int = 5) -> QueryResult:
    dataset_id = DATASETS.get(dataset_key)
    if not dataset_id:
        raise ValueError(f"Unknown dataset key: {dataset_key}")

    url = f"{BASE_URL}/{dataset_id}.json"
    params = {"$where": where_clause, "$limit": limit}
    headers = {"X-App-Token": SOCRATA_APP_TOKEN} if SOCRATA_APP_TOKEN else {}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()

            payload = response.json()
            if isinstance(payload, dict) and payload.get("error"):
                return QueryResult(
                    key=dataset_key,
                    label=DATASET_LABELS[dataset_key],
                    records=[],
                    ok=False,
                    error=str(payload.get("message") or "Unknown Socrata error"),
                )

            return QueryResult(
                key=dataset_key,
                label=DATASET_LABELS[dataset_key],
                records=payload if isinstance(payload, list) else [],
                ok=True,
            )
        except httpx.HTTPStatusError as exc:
            return QueryResult(
                key=dataset_key,
                label=DATASET_LABELS[dataset_key],
                records=[],
                ok=False,
                error=f"HTTP {exc.response.status_code}",
            )
        except Exception as exc:
            return QueryResult(
                key=dataset_key,
                label=DATASET_LABELS[dataset_key],
                records=[],
                ok=False,
                error=str(exc),
            )


async def check_hpd_violations(house_number: str, street: str, borough: str, *, open_only: bool = True) -> QueryResult:
    street_clean = normalize_street(street)
    status_filter = " AND violationstatus='Open'" if open_only else ""
    where = (
        f"housenumber='{sanitize_value(house_number)}' "
        f"AND streetname LIKE '%{street_clean}%' "
        f"AND boro='{normalize_borough(borough)}'"
        f"{status_filter}"
    )
    return await query_nyc_data("hpd_violations", where)


async def check_multiple_dwelling_registrations(house_number: str, street: str, borough: str) -> QueryResult:
    street_clean = normalize_street(street)
    where = (
        f"housenumber='{sanitize_value(house_number)}' "
        f"AND streetname LIKE '%{street_clean}%' "
        f"AND boro='{normalize_borough(borough)}'"
    )
    return await query_nyc_data("multiple_dwelling_registrations", where)


async def check_registration_contacts(house_number: str, street: str, borough: str) -> QueryResult:
    registrations = await check_multiple_dwelling_registrations(house_number, street, borough)
    if not registrations.ok:
        return QueryResult(
            key="registration_contacts",
            label=DATASET_LABELS["registration_contacts"],
            records=[],
            ok=False,
            error=registrations.error,
        )

    registration_ids = [record.get("registrationid") for record in registrations.records if record.get("registrationid")]
    if not registration_ids:
        return QueryResult(
            key="registration_contacts",
            label=DATASET_LABELS["registration_contacts"],
            records=[],
            ok=True,
        )

    id_list = ",".join(f"'{sanitize_value(str(registration_id))}'" for registration_id in registration_ids)
    where = f"registrationid IN({id_list})"
    return await query_nyc_data("registration_contacts", where, limit=50)


async def check_dob_now_approved_permits(house_number: str, street: str, borough: str) -> QueryResult:
    street_clean = normalize_street(street)
    where = (
        f"house_no='{sanitize_value(house_number)}' "
        f"AND street_name LIKE '%{street_clean}%' "
        f"AND borough='{normalize_borough(borough)}' "
        "AND permit_status='Permit Issued'"
    )
    return await query_nyc_data("dob_now_approved_permits", where)


async def validate_address_against_open_data(house_number: str, street: str, borough: str) -> Dict[str, Any]:
    checks = [
        await check_multiple_dwelling_registrations(house_number, street, borough),
        await check_hpd_violations(house_number, street, borough, open_only=False),
        await check_registration_contacts(house_number, street, borough),
        await check_dob_now_approved_permits(house_number, street, borough),
    ]

    evidence_count = sum(len(result.records) for result in checks if result.ok)
    available_sources = sum(1 for result in checks if result.ok)

    return {
        "is_valid": evidence_count > 0,
        "can_continue": True,
        "datasets": [
            {
                "key": result.key,
                "label": result.label,
                "count": len(result.records),
                "status": "ok" if result.ok else "unavailable",
                "error": result.error,
            }
            for result in checks
        ],
        "summary": {
            "evidence_count": evidence_count,
            "available_sources": available_sources,
            "checked_sources": len(checks),
        },
    }
