import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend.app.main import app, classify_claim
from backend.app.nyc_data import QueryResult


class DoorWiseApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_classify_claim_scopes_to_three_playbooks(self):
        self.assertEqual(classify_claim("HPD inspector here for an inspection"), "inspector")
        self.assertEqual(classify_claim("Ace Plumbing contractor with a work order"), "contractor")
        self.assertEqual(classify_claim("Property management is here"), "management")
        self.assertEqual(classify_claim("Package delivery for apartment 3B"), "unknown")

    @patch("backend.app.main.validate_address_against_open_data", new_callable=AsyncMock)
    def test_address_validation_endpoint(self, validate_address):
        validate_address.return_value = {
            "is_valid": True,
            "can_continue": True,
            "datasets": [],
            "summary": {"evidence_count": 1, "available_sources": 1, "checked_sources": 1},
        }

        response = self.client.post(
            "/api/address/validate",
            json={
                "houseNumber": "370",
                "street": "Jay Street",
                "borough": "BROOKLYN",
                "apartment": "317",
            },
        )

        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["address"]["street"], "Jay St")
        self.assertTrue(payload["is_valid"])

    @patch("backend.app.main.check_multiple_dwelling_registrations", new_callable=AsyncMock)
    @patch("backend.app.main.check_registration_contacts", new_callable=AsyncMock)
    @patch("backend.app.main.check_dob_now_approved_permits", new_callable=AsyncMock)
    def test_verify_contractor_returns_proceed_after_id_check(
        self,
        check_dob_now_approved_permits,
        check_registration_contacts,
        check_multiple_dwelling_registrations,
    ):
        check_multiple_dwelling_registrations.return_value = QueryResult(
            "multiple_dwelling_registrations",
            "Multiple Dwelling Registrations",
            [{"registrationid": "1", "registrationenddate": "2030-01-01T00:00:00.000"}],
            True,
        )
        check_registration_contacts.return_value = QueryResult(
            "registration_contacts",
            "Registration Contacts",
            [],
            True,
        )
        check_dob_now_approved_permits.return_value = QueryResult(
            "dob_now_approved_permits",
            "DOB NOW Approved Permits",
            [{
                "job_filing_number": "J-100",
                "permit_status": "Permit Issued",
                "applicant_business_name": "Ace Plumbing LLC",
            }],
            True,
        )

        response = self.client.post(
            "/api/verify",
            json={
                "address": {
                    "houseNumber": "370",
                    "street": "Jay St",
                    "borough": "Brooklyn",
                    "apartment": "317",
                },
                "visitor_claim": "Ace Plumbing contractor here for a repair",
                "building_context": {
                    "management_phone": "212-555-0100",
                    "approved_vendors": ["Ace Plumbing"],
                },
            },
        )

        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["decision"], "PROCEED_AFTER_ID_CHECK")
        self.assertEqual(payload["playbook"], "contractor")
        self.assertEqual(payload["datasets"][-1]["count"], 1)

    @patch("backend.app.main.check_multiple_dwelling_registrations", new_callable=AsyncMock)
    @patch("backend.app.main.check_registration_contacts", new_callable=AsyncMock)
    @patch("backend.app.main.check_dob_now_approved_permits", new_callable=AsyncMock)
    def test_verify_contractor_requires_permit_vendor_alignment_for_high_confidence(
        self,
        check_dob_now_approved_permits,
        check_registration_contacts,
        check_multiple_dwelling_registrations,
    ):
        check_multiple_dwelling_registrations.return_value = QueryResult(
            "multiple_dwelling_registrations",
            "Multiple Dwelling Registrations",
            [{"registrationid": "1", "registrationenddate": "2030-01-01T00:00:00.000"}],
            True,
        )
        check_registration_contacts.return_value = QueryResult(
            "registration_contacts",
            "Registration Contacts",
            [],
            True,
        )
        check_dob_now_approved_permits.return_value = QueryResult(
            "dob_now_approved_permits",
            "DOB NOW Approved Permits",
            [{
                "job_filing_number": "J-100",
                "permit_status": "Permit Issued",
                "applicant_business_name": "Other Vendor Inc",
            }],
            True,
        )

        response = self.client.post(
            "/api/verify",
            json={
                "address": {
                    "houseNumber": "370",
                    "street": "Jay St",
                    "borough": "Brooklyn",
                    "apartment": "317",
                },
                "visitor_claim": "Ace Plumbing contractor here for a repair",
                "building_context": {
                    "management_phone": "212-555-0100",
                    "approved_vendors": ["Ace Plumbing"],
                },
            },
        )

        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["decision"], "CALL_TO_CONFIRM")
        self.assertEqual(payload["playbook"], "contractor")

    @patch("backend.app.main.check_multiple_dwelling_registrations", new_callable=AsyncMock)
    @patch("backend.app.main.check_registration_contacts", new_callable=AsyncMock)
    @patch("backend.app.main.check_hpd_violations", new_callable=AsyncMock)
    @patch("backend.app.main.check_dob_now_approved_permits", new_callable=AsyncMock)
    def test_verify_inspector_returns_call_to_confirm_when_supported(
        self,
        check_dob_now_approved_permits,
        check_hpd_violations,
        check_registration_contacts,
        check_multiple_dwelling_registrations,
    ):
        check_multiple_dwelling_registrations.return_value = QueryResult(
            "multiple_dwelling_registrations",
            "Multiple Dwelling Registrations",
            [{"registrationid": "1", "registrationenddate": "2030-01-01T00:00:00.000"}],
            True,
        )
        check_registration_contacts.return_value = QueryResult(
            "registration_contacts",
            "Registration Contacts",
            [],
            True,
        )
        check_hpd_violations.return_value = QueryResult(
            "hpd_violations",
            "HPD Violations",
            [{"violationid": "V-1", "violationstatus": "Open"}],
            True,
        )
        check_dob_now_approved_permits.return_value = QueryResult(
            "dob_now_approved_permits",
            "DOB NOW Approved Permits",
            [],
            True,
        )

        response = self.client.post(
            "/api/verify",
            json={
                "address": {
                    "houseNumber": "370",
                    "street": "Jay St",
                    "borough": "Brooklyn",
                    "apartment": "317",
                },
                "visitor_claim": "HPD inspector here for an inspection",
                "building_context": {
                    "super_phone": "646-555-0111",
                },
            },
        )

        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["decision"], "CALL_TO_CONFIRM")
        self.assertEqual(payload["playbook"], "inspector")

    @patch("backend.app.main.check_multiple_dwelling_registrations", new_callable=AsyncMock)
    @patch("backend.app.main.check_registration_contacts", new_callable=AsyncMock)
    def test_verify_management_returns_call_to_confirm_for_active_registration(
        self,
        check_registration_contacts,
        check_multiple_dwelling_registrations,
    ):
        check_multiple_dwelling_registrations.return_value = QueryResult(
            "multiple_dwelling_registrations",
            "Multiple Dwelling Registrations",
            [{"registrationid": "1", "registrationenddate": "2030-01-01T00:00:00.000"}],
            True,
        )
        check_registration_contacts.return_value = QueryResult(
            "registration_contacts",
            "Registration Contacts",
            [{"corporationname": "Jay Street Management", "type": "Agent"}],
            True,
        )

        response = self.client.post(
            "/api/verify",
            json={
                "address": {
                    "houseNumber": "370",
                    "street": "Jay St",
                    "borough": "Brooklyn",
                    "apartment": "317",
                },
                "visitor_claim": "Jay Street Management is here for unit access",
                "building_context": {
                    "management_phone": "212-555-0100",
                },
            },
        )

        payload = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["decision"], "CALL_TO_CONFIRM")
        self.assertEqual(payload["playbook"], "management")


if __name__ == "__main__":
    unittest.main()
