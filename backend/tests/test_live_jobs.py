"""
Isolated tests for runtime live job listings.

The external provider is mocked through requests.get or LiveJobProvider.get_jobs.
No network access is used, and no seeded/curated job may appear in any result.
"""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from services.live_jobs import (
    LiveJobProvider,
    LiveJobValidationError,
    LiveJobsUnavailableError,
    _extract_skills_from_text,
    _normalize_skills,
    _parse_listing,
    validate_live_job,
    validate_live_jobs,
)


def provider_listing(**overrides):
    listing = {
        "slug": "acme-backend-engineer-berlin",
        "title": "Backend Engineer",
        "company_name": "Acme GmbH",
        "location": "Berlin",
        "description": "<p>Build Python services with Docker.</p>",
        "url": "https://jobs.acme.example.org/roles/123",
        "tags": ["Python", "Docker", "Full Time"],
        "remote": False,
        "job_types": ["full_time"],
    }
    listing.update(overrides)
    return listing


def live_job(**overrides):
    job = {
        "id": "live-acme-backend-engineer-berlin",
        "source_job_id": "acme-backend-engineer-berlin",
        "title": "Backend Engineer",
        "company": "Acme GmbH",
        "location": "Berlin",
        "description": "Build Python services with Docker.",
        "required_skills": ["Python", "Docker"],
        "requiredSkills": ["Python", "Docker"],
        "tags": ["Python", "Docker", "Full Time"],
        "source_url": "https://jobs.acme.example.org/roles/123",
        "source_name": "Arbeitnow",
        "source_label": "Arbeitnow live job board",
        "fetched_at": "2026-01-02T03:04:05+00:00",
        "content_origin": "LIVE_DATA",
        "data_mode": "LIVE_DATA",
        "is_live": True,
    }
    job.update(overrides)
    return job


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class LiveJobProviderTests(unittest.TestCase):
    def setUp(self):
        LiveJobProvider.reset_cache()

    def test_live_listing_preserves_source_data_and_provenance(self):
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse({"data": [provider_listing()]}),
        ):
            jobs = LiveJobProvider.get_jobs(force_refresh=True)

        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual(job["source_job_id"], "acme-backend-engineer-berlin")
        self.assertEqual(job["title"], "Backend Engineer")
        self.assertEqual(job["company"], "Acme GmbH")
        self.assertEqual(job["location"], "Berlin")
        self.assertEqual(job["description"], "Build Python services with Docker.")
        self.assertEqual(job["required_skills"], ["Python", "Docker"])
        self.assertEqual(job["source_url"], "https://jobs.acme.example.org/roles/123")
        self.assertEqual(job["source_name"], "Arbeitnow")
        self.assertTrue(job["fetched_at"])
        self.assertEqual(job["content_origin"], "LIVE_DATA")
        self.assertEqual(job["data_mode"], "LIVE_DATA")
        self.assertTrue(job["is_live"])

        # No university tier, CGPA rule, demo label, or AI origin is invented.
        self.assertNotIn("tier", job)
        self.assertNotIn("min_cgpa", job)
        self.assertNotIn("provider", job)
        self.assertNotEqual(job["content_origin"], "AI_GENERATED")
        self.assertNotEqual(job["data_mode"], "DEMO_DATA")

    def test_non_technical_listings_are_filtered_out(self):
        payload = {
            "data": [
                provider_listing(),
                provider_listing(
                    slug="sales-manager-1",
                    title="Sales Manager",
                    description="Own the regional sales pipeline.",
                    url="https://sales.example.org/jobs/1",
                    tags=["Sales"],
                ),
            ]
        }
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse(payload),
        ):
            jobs = LiveJobProvider.get_jobs(force_refresh=True)

        self.assertEqual([job["title"] for job in jobs], ["Backend Engineer"])

    def test_unusable_listings_are_rejected(self):
        payload = {
            "data": [
                provider_listing(slug="", id=""),
                provider_listing(slug="no-title", title=""),
                provider_listing(slug="no-url", url=""),
                provider_listing(slug="bad-url", url="javascript:alert(1)"),
                provider_listing(
                    slug="bad-host",
                    url="https://example.com/jobs/1",
                ),
                provider_listing(slug="empty-desc", description="<p> </p>"),
                provider_listing(slug="no-company", company_name=""),
            ]
        }
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse(payload),
        ):
            jobs = LiveJobProvider.get_jobs(force_refresh=True)

        self.assertEqual(jobs, [])

    def test_duplicate_listings_are_deduplicated(self):
        payload = {"data": [provider_listing(), provider_listing()]}
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse(payload),
        ):
            jobs = LiveJobProvider.get_jobs(force_refresh=True)

        self.assertEqual(len(jobs), 1)

    def test_provider_failure_raises_unavailable_and_never_returns_seeds(self):
        with patch(
            "services.live_jobs.requests.get",
            side_effect=RuntimeError("provider down"),
        ):
            with self.assertRaises(LiveJobsUnavailableError):
                LiveJobProvider.get_jobs(force_refresh=True)

    def test_non_200_provider_response_is_unavailable(self):
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse({"data": []}, status_code=503),
        ):
            with self.assertRaises(LiveJobsUnavailableError):
                LiveJobProvider.get_jobs(force_refresh=True)

    def test_empty_provider_feed_returns_empty_list(self):
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse({"data": []}),
        ):
            jobs = LiveJobProvider.get_jobs(force_refresh=True)

        self.assertEqual(jobs, [])
        self.assertEqual(LiveJobProvider.cache_status(), ("EMPTY", 0))

    def test_provider_payload_without_data_is_unavailable(self):
        with patch(
            "services.live_jobs.requests.get",
            return_value=FakeResponse({"jobs": []}),
        ):
            with self.assertRaises(LiveJobsUnavailableError):
                LiveJobProvider.get_jobs(force_refresh=True)


class LiveJobValidationTests(unittest.TestCase):
    def test_valid_listing_passes(self):
        self.assertEqual(validate_live_job(live_job())["source_job_id"], "acme-backend-engineer-berlin")

    def test_missing_source_id_or_title_is_rejected(self):
        for field in ("source_job_id", "title", "id"):
            with self.subTest(field=field):
                with self.assertRaises(LiveJobValidationError):
                    validate_live_job(live_job(**{field: "   "}))

    def test_missing_or_malformed_source_url_is_rejected(self):
        for url in (
            "",
            "not a url",
            "ftp://jobs.example.org/1",
            "https://example.com/jobs/1",
            "http://localhost/jobs/1",
            "http://127.0.0.1/jobs/1",
            "https://user:pass@jobs.example.org/1",
        ):
            with self.subTest(url=url):
                with self.assertRaises(LiveJobValidationError):
                    validate_live_job(live_job(source_url=url))

    def test_empty_description_is_rejected(self):
        with self.assertRaises(LiveJobValidationError):
            validate_live_job(live_job(description="   "))

    def test_missing_provenance_is_rejected(self):
        cases = (
            {"source_name": ""},
            {"content_origin": "AI_GENERATED"},
            {"data_mode": "DEMO_DATA"},
            {"is_live": False},
            {"fetched_at": "not-a-date"},
            {"required_skills": "Python"},
        )
        for case in cases:
            with self.subTest(case=case):
                with self.assertRaises(LiveJobValidationError):
                    validate_live_job(live_job(**case))

    def test_unsupported_fabricated_fields_are_rejected(self):
        for field, value in (
            ("tier", "Tier-1"),
            ("min_cgpa", 6.5),
            ("provider", "Coursera"),
            ("verified", True),
            ("institutional", True),
            ("placement_guarantee", True),
        ):
            with self.subTest(field=field):
                with self.assertRaises(LiveJobValidationError):
                    validate_live_job(live_job(**{field: value}))

    def test_application_added_claims_are_rejected(self):
        for value in (
            "Verified Employer Feed",
            "Official Campus Partner Drive",
            "Institutional Placement Guarantee",
            "Guaranteed placement listing",
        ):
            with self.subTest(value=value):
                with self.assertRaises(LiveJobValidationError):
                    validate_live_job(live_job(source_label=value))

    def test_duplicate_identity_is_dropped(self):
        jobs = validate_live_jobs([live_job(), live_job()])
        self.assertEqual(len(jobs), 1)

        same_url = live_job(
            id="live-other",
            source_job_id="other",
            source_url="https://jobs.acme.example.org/roles/123",
        )
        self.assertEqual(len(validate_live_jobs([live_job(), same_url])), 1)


class SkillNormalizationTests(unittest.TestCase):
    FETCHED_AT = "2026-01-02T03:04:05+00:00"

    def test_go_to_market_is_never_a_go_skill(self):
        self.assertEqual(_normalize_skills(["Go To Market"]), [])
        self.assertEqual(_normalize_skills(["Go-to-Market"]), [])
        self.assertEqual(_normalize_skills(["Go To Market", "Python"]), ["Python"])

    def test_explicit_go_language_signals_are_detected(self):
        for tag in [
            "Golang",
            "Go language",
            "Go developer",
            "Go programming",
            "Go",
            "Go, Python",
        ]:
            with self.subTest(tag=tag):
                self.assertIn("Go", _normalize_skills([tag]))

    def test_broad_category_tags_are_not_required_skills(self):
        for tag in [
            "Engineering",
            "Backend",
            "Technology",
            "Product",
            "IT",
            "Software",
        ]:
            with self.subTest(tag=tag):
                self.assertEqual(_normalize_skills([tag]), [])

    def test_parsed_listing_only_uses_explicit_go_tags(self):
        market_tag = _parse_listing(
            provider_listing(tags=["Go To Market"]),
            self.FETCHED_AT,
        )
        golang_tag = _parse_listing(
            provider_listing(tags=["Golang"]),
            self.FETCHED_AT,
        )

        self.assertNotIn("Go", market_tag["required_skills"])
        self.assertIn("Go", golang_tag["required_skills"])

    def test_skills_are_extracted_from_title_and_description(self):
        text = (
            "We build Python services on Docker and Kubernetes, deploy to AWS, "
            "and model data in SQL."
        )
        self.assertEqual(
            sorted(_extract_skills_from_text(text)),
            sorted(["Python", "Docker", "Kubernetes", "AWS", "SQL"]),
        )

    def test_parsed_listing_combines_tag_title_and_description_signals(self):
        job = _parse_listing(
            provider_listing(
                title="Python Engineer",
                description=(
                    "<p>Build Docker images on Kubernetes, deploy to AWS, "
                    "and write SQL.</p>"
                ),
                tags=["Python"],
            ),
            self.FETCHED_AT,
        )

        expected = ["Python", "Docker", "Kubernetes", "AWS", "SQL"]
        self.assertEqual(sorted(job["required_skills"]), sorted(expected))
        self.assertEqual(job["requiredSkills"], job["required_skills"])

    def test_go_to_market_is_never_extracted_from_text(self):
        for text in [
            "Our Go To Market team partners with sales.",
            "This go-to-market role owns launch strategy.",
            "Sit with the go to market organisation.",
        ]:
            with self.subTest(text=text):
                self.assertNotIn("Go", _extract_skills_from_text(text))

    def test_explicit_go_phrases_are_extracted_from_text(self):
        for text in [
            "We write services in Golang.",
            "Experience with the Go language is required.",
            "Hiring a Go developer for our platform team.",
            "Go programming experience preferred.",
        ]:
            with self.subTest(text=text):
                self.assertIn("Go", _extract_skills_from_text(text))

    def test_duplicate_mentions_produce_one_skill(self):
        text = "Python, python, PYTHON. We love Python."
        self.assertEqual(_extract_skills_from_text(text), ["Python"])

        job = _parse_listing(
            provider_listing(
                title="Python Engineer",
                description="<p>Python services.</p>",
                tags=["python"],
            ),
            self.FETCHED_AT,
        )
        self.assertEqual(job["required_skills"], ["Python"])

    def test_category_words_are_not_skills_in_text(self):
        text = "Engineering and Backend roles inside the Technology and Product org."
        self.assertEqual(_extract_skills_from_text(text), [])

    def test_prose_ambiguous_words_are_not_skills(self):
        text = (
            "Decisions rest on data, we spark creativity, and you can rest "
            "assured that Spring onboarding is swift."
        )
        extracted = _extract_skills_from_text(text)
        for label in ["REST", "Spark", "Spring", "Swift"]:
            self.assertNotIn(label, extracted)
        self.assertIn("Spring Boot", _extract_skills_from_text("Java and Spring Boot."))
        self.assertIn("REST APIs", _extract_skills_from_text("Design REST APIs."))


class LiveJobRouteTests(unittest.TestCase):
    def test_catalogue_returns_503_when_provider_fails(self):
        from routes.student_routes import get_live_job_catalogue

        with patch.object(
            LiveJobProvider,
            "get_jobs",
            side_effect=LiveJobsUnavailableError("provider down"),
        ):
            with self.assertRaises(HTTPException) as context:
                get_live_job_catalogue()

        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("unavailable", context.exception.detail.lower())

    def test_catalogue_empty_feed_is_explicit(self):
        from routes.student_routes import get_live_job_catalogue

        with patch.object(LiveJobProvider, "get_jobs", return_value=[]):
            result = get_live_job_catalogue()

        self.assertEqual(result["jobs"], [])
        self.assertEqual(result["feed_metadata"]["status"], "EMPTY")
        self.assertEqual(result["feed_metadata"]["total"], 0)
        self.assertEqual(result["data_mode"], "LIVE_DATA")

    def test_ranked_jobs_returns_only_live_listings(self):
        from routes.student_routes import get_ranked_jobs_for_student
        from database import PreferenceRepository, StudentRepository

        with patch.object(
            StudentRepository,
            "get_by_id",
            return_value={"id": "stud-01", "skills": ["Python"], "cgpa": 8.0},
        ), patch.object(
            PreferenceRepository,
            "get_preferences",
            return_value={},
        ), patch.object(
            PreferenceRepository,
            "get_feedback",
            return_value=[],
        ), patch.object(
            LiveJobProvider,
            "get_jobs",
            return_value=[live_job()],
        ):
            result = get_ranked_jobs_for_student("stud-01")

        self.assertEqual(len(result["ranked_jobs"]), 1)
        job = result["ranked_jobs"][0]
        self.assertEqual(job["data_mode"], "LIVE_DATA")
        self.assertEqual(job["content_origin"], "LIVE_DATA")
        self.assertEqual(job["source_name"], "Arbeitnow")
        self.assertEqual(result["data_provenance"]["demo_count"], 0)
        self.assertEqual(result["data_provenance"]["live_count"], 1)
        self.assertEqual(result["data_provenance"]["status"], "LIVE_DATA")

    def test_ranked_jobs_provider_failure_returns_503(self):
        from routes.student_routes import get_ranked_jobs_for_student
        from database import PreferenceRepository, StudentRepository

        with patch.object(
            StudentRepository,
            "get_by_id",
            return_value={"id": "stud-01", "skills": [], "cgpa": 8.0},
        ), patch.object(
            PreferenceRepository,
            "get_preferences",
            return_value={},
        ), patch.object(
            PreferenceRepository,
            "get_feedback",
            return_value=[],
        ), patch.object(
            LiveJobProvider,
            "get_jobs",
            side_effect=LiveJobsUnavailableError("provider down"),
        ):
            with self.assertRaises(HTTPException) as context:
                get_ranked_jobs_for_student("stud-01")

        self.assertEqual(context.exception.status_code, 503)

    def test_ranked_jobs_empty_feed_returns_no_jobs(self):
        from routes.student_routes import get_ranked_jobs_for_student
        from database import PreferenceRepository, StudentRepository

        with patch.object(
            StudentRepository,
            "get_by_id",
            return_value={"id": "stud-01", "skills": [], "cgpa": 8.0},
        ), patch.object(
            PreferenceRepository,
            "get_preferences",
            return_value={},
        ), patch.object(
            PreferenceRepository,
            "get_feedback",
            return_value=[],
        ), patch.object(LiveJobProvider, "get_jobs", return_value=[]):
            result = get_ranked_jobs_for_student("stud-01")

        self.assertEqual(result["ranked_jobs"], [])
        self.assertEqual(result["data_provenance"]["status"], "EMPTY")
        self.assertEqual(result["data_provenance"]["total_count"], 0)

    def test_roadmap_does_not_fall_back_to_seeded_jobs(self):
        from routes.student_routes import get_upskilling_roadmap
        from database import StudentRepository

        with patch.object(
            StudentRepository,
            "get_by_id",
            return_value={"id": "stud-01"},
        ), patch.object(
            LiveJobProvider,
            "get_jobs",
            side_effect=LiveJobsUnavailableError("provider down"),
        ):
            with self.assertRaises(HTTPException) as context:
                get_upskilling_roadmap("stud-01", "job-ai-sys")

        self.assertEqual(context.exception.status_code, 503)

    def test_application_without_tier_uses_unspecified_provenance(self):
        from routes.student_routes import ApplicationSubmitRequest, submit_campus_application
        from database import StudentRepository
        from services.progress_tracker import ProgressTrackerService

        payload = ApplicationSubmitRequest(
            student_id="stud-01",
            job_id="live-acme-backend-engineer-berlin",
            job_title="Backend Engineer",
            company="Acme GmbH",
        )
        self.assertIsNone(payload.tier)

        with patch.object(
            StudentRepository,
            "get_by_id",
            return_value={"id": "stud-01", "cgpa": 8.0, "active_apps_count": 1},
        ), patch.object(
            StudentRepository,
            "record_application",
        ) as record_mock, patch.object(
            ProgressTrackerService,
            "log_application",
        ):
            result = submit_campus_application(payload)

        self.assertEqual(result["data_mode"], "LIVE_DATA")
        self.assertEqual(record_mock.call_args.kwargs["tier"], "UNSPECIFIED")


class NoSeededJobContentTests(unittest.TestCase):
    def test_data_seeds_no_longer_defines_target_jobs(self):
        import data_seeds

        self.assertFalse(hasattr(data_seeds, "TARGET_JOBS"))

    def test_live_jobs_module_does_not_import_seeds(self):
        import services.live_jobs as live_jobs

        self.assertFalse(hasattr(live_jobs, "TARGET_JOBS"))
        self.assertFalse(hasattr(live_jobs, "CURATED_JOBS"))

    def test_policy_engine_neutral_on_unspecified_tier(self):
        from services.policy_engine import UniversityPolicyEngine

        result = UniversityPolicyEngine.evaluate_eligibility(
            student_cgpa=5.0,
            active_apps_count=0,
            job_tier=None,
        )
        self.assertTrue(result["is_eligible"])
        self.assertEqual(result["violations"], [])


if __name__ == "__main__":
    unittest.main()
