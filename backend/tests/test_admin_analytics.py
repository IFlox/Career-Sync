"""
Tests for the admin cohort skill-gap calculation.

Students and live listings are mocked; the matching engine runs for real and
makes no network or AI calls.
"""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from database import StudentRepository
from routes.admin_routes import _compute_batch_missing_skills, get_cohort_overview
from services.live_jobs import (
    LiveJobProvider,
    LiveJobsUnavailableError,
    _parse_listing,
)


def student(**overrides):
    profile = {
        "id": "stud-01",
        "name": "Test Student",
        "skills": ["Python"],
        "cgpa": 8.0,
        "quality_score": 75,
        "admin_status": "Pending",
        "sla_hours_pending": 0,
    }
    profile.update(overrides)
    return profile


def live_job(job_id, skills):
    return {
        "id": job_id,
        "title": "Backend Engineer",
        "location": "Remote",
        "required_skills": list(skills),
        "requiredSkills": list(skills),
        "content_origin": "LIVE_DATA",
        "data_mode": "LIVE_DATA",
    }


class BatchMissingSkillsTests(unittest.TestCase):
    def test_one_student_with_one_missing_skill(self):
        result = _compute_batch_missing_skills(
            [student(skills=["Python"])],
            [live_job("live-1", ["Python", "Docker"])],
        )

        self.assertEqual(result, [{"skill": "Docker", "missing_percentage": 100}])

    def test_same_skill_missing_across_jobs_counted_once_per_student(self):
        result = _compute_batch_missing_skills(
            [student(skills=["Python", "Kubernetes"])],
            [
                live_job("live-1", ["Python", "Docker"]),
                live_job("live-2", ["Docker", "Kubernetes"]),
            ],
        )

        self.assertEqual(result, [{"skill": "Docker", "missing_percentage": 100}])

    def test_skills_sorted_by_missing_student_count(self):
        jobs = [
            live_job("live-1", ["Python", "Docker", "Kubernetes"]),
            live_job("live-2", ["Docker", "Kubernetes"]),
        ]
        students = [
            student(id="stud-01", skills=["Python"]),
            student(id="stud-02", skills=["Python", "Docker"]),
        ]

        result = _compute_batch_missing_skills(students, jobs)

        self.assertEqual(
            result,
            [
                {"skill": "Kubernetes", "missing_percentage": 100},
                {"skill": "Docker", "missing_percentage": 50},
            ],
        )

    def test_returns_top_four_skills_only(self):
        skills = ["Docker", "Kubernetes", "Redis", "Kafka", "Terraform"]
        result = _compute_batch_missing_skills(
            [student(skills=[])],
            [live_job("live-1", skills)],
        )

        self.assertEqual(len(result), 4)
        self.assertEqual(
            [entry["skill"] for entry in result],
            ["Docker", "Kafka", "Kubernetes", "Redis"],
        )
        self.assertTrue(all(entry["missing_percentage"] == 100 for entry in result))

    def test_empty_students_or_jobs_return_empty_list(self):
        job = live_job("live-1", ["Docker"])

        self.assertEqual(_compute_batch_missing_skills([], [job]), [])
        self.assertEqual(_compute_batch_missing_skills([student()], []), [])
        self.assertEqual(
            _compute_batch_missing_skills([student()], [live_job("live-1", [])]),
            [],
        )

    def test_jobs_without_required_skills_are_excluded(self):
        result = _compute_batch_missing_skills(
            [student(skills=["Python"])],
            [
                live_job("live-empty", []),
                live_job("live-1", ["Python", "Docker"]),
            ],
        )

        self.assertEqual(result, [{"skill": "Docker", "missing_percentage": 100}])


class CohortOverviewRouteTests(unittest.TestCase):
    def test_overview_uses_computed_skill_gaps_and_preserves_other_fields(self):
        students = [
            student(
                id="stud-01",
                skills=["Python"],
                cgpa=5.5,
                quality_score=80,
                admin_status="Approved",
                sla_hours_pending=60,
            )
        ]

        with patch.object(StudentRepository, "get_all", return_value=students), patch.object(
            LiveJobProvider,
            "get_jobs",
            return_value=[live_job("live-1", ["Python", "Docker"])],
        ):
            result = get_cohort_overview(authorized=True)

        self.assertEqual(result["cohort_size"], 1)
        self.assertEqual(result["average_quality_score"], 80)
        self.assertEqual(result["high_risk_count"], 1)
        self.assertEqual(result["approved_count"], 1)
        self.assertEqual(result["sla_escalations_count"], 1)
        self.assertEqual(result["live_job_count"], 1)
        self.assertEqual(result["jobs_with_skill_data"], 1)
        self.assertEqual(result["skill_data_coverage_percentage"], 100)
        self.assertEqual(
            result["batch_missing_skills"],
            [{"skill": "Docker", "missing_percentage": 100}],
        )

    def test_overview_returns_empty_skill_list_without_students(self):
        with patch.object(StudentRepository, "get_all", return_value=[]), patch.object(
            LiveJobProvider, "get_jobs"
        ) as get_jobs:
            result = get_cohort_overview(authorized=True)

        self.assertEqual(result["batch_missing_skills"], [])
        self.assertEqual(result["live_job_count"], 0)
        self.assertEqual(result["jobs_with_skill_data"], 0)
        self.assertEqual(result["skill_data_coverage_percentage"], 0)
        get_jobs.assert_not_called()

    def test_overview_returns_empty_skill_list_when_no_live_jobs(self):
        with patch.object(
            StudentRepository, "get_all", return_value=[student()]
        ), patch.object(LiveJobProvider, "get_jobs", return_value=[]):
            result = get_cohort_overview(authorized=True)

        self.assertEqual(result["batch_missing_skills"], [])
        self.assertEqual(result["live_job_count"], 0)
        self.assertEqual(result["jobs_with_skill_data"], 0)
        self.assertEqual(result["skill_data_coverage_percentage"], 0)

    def test_overview_surfaces_provider_failure_as_503(self):
        with patch.object(
            StudentRepository, "get_all", return_value=[student()]
        ), patch.object(
            LiveJobProvider,
            "get_jobs",
            side_effect=LiveJobsUnavailableError("provider down"),
        ):
            with self.assertRaises(HTTPException) as context:
                get_cohort_overview(authorized=True)

        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("unavailable", context.exception.detail.lower())


class SkillDataMetadataTests(unittest.TestCase):
    def _overview(self, students, jobs):
        with patch.object(
            StudentRepository, "get_all", return_value=students
        ), patch.object(LiveJobProvider, "get_jobs", return_value=jobs):
            return get_cohort_overview(authorized=True)

    def test_coverage_counts_only_jobs_with_skill_data(self):
        result = self._overview(
            [student(skills=[])],
            [
                live_job("live-1", ["Python"]),
                live_job("live-2", []),
                live_job("live-3", []),
            ],
        )

        self.assertEqual(result["live_job_count"], 3)
        self.assertEqual(result["jobs_with_skill_data"], 1)
        self.assertEqual(result["skill_data_coverage_percentage"], 33.3)

    def test_zero_skill_data_returns_empty_gaps_and_zero_coverage(self):
        result = self._overview(
            [student(skills=["Python"])],
            [live_job("live-1", []), live_job("live-2", [])],
        )

        self.assertEqual(result["batch_missing_skills"], [])
        self.assertEqual(result["live_job_count"], 2)
        self.assertEqual(result["jobs_with_skill_data"], 0)
        self.assertEqual(result["skill_data_coverage_percentage"], 0)

    def test_no_students_metadata_is_zero_and_provider_is_not_consulted(self):
        with patch.object(
            StudentRepository, "get_all", return_value=[]
        ), patch.object(LiveJobProvider, "get_jobs") as get_jobs:
            result = get_cohort_overview(authorized=True)

        self.assertEqual(result["live_job_count"], 0)
        self.assertEqual(result["jobs_with_skill_data"], 0)
        self.assertEqual(result["skill_data_coverage_percentage"], 0)
        self.assertEqual(result["batch_missing_skills"], [])
        get_jobs.assert_not_called()

    def test_low_nonzero_coverage_is_not_rounded_to_zero(self):
        jobs = [live_job("live-1", ["Python"])] + [
            live_job(f"live-{index}", []) for index in range(2, 201)
        ]

        result = self._overview([student(skills=["Python"])], jobs)

        self.assertEqual(result["live_job_count"], 200)
        self.assertEqual(result["jobs_with_skill_data"], 1)
        self.assertEqual(result["skill_data_coverage_percentage"], 0.5)

    def test_metadata_reflects_description_derived_skills(self):
        fetched_at = "2026-01-02T03:04:05+00:00"

        def parsed(slug, description, tags=()):
            return _parse_listing(
                {
                    "slug": slug,
                    "title": "Engineer",
                    "company_name": "Acme GmbH",
                    "location": "Berlin",
                    "description": description,
                    "url": f"https://jobs.acme.de/roles/{slug}",
                    "tags": list(tags),
                },
                fetched_at,
            )

        jobs = [
            parsed(
                "skill-rich",
                "<p>Python, Docker, Kubernetes, AWS, and SQL.</p>",
            ),
            parsed("go-to-market", "<p>Our Go To Market team owns launches.</p>"),
            parsed("categories", "<p>Engineering and Backend organisation.</p>"),
        ]

        result = self._overview([student(skills=[])], jobs)

        self.assertEqual(result["live_job_count"], 3)
        self.assertEqual(result["jobs_with_skill_data"], 1)
        self.assertEqual(result["skill_data_coverage_percentage"], 33.3)

    def test_full_coverage_reports_one_hundred(self):
        result = self._overview(
            [student(skills=["Python"])],
            [live_job("live-1", ["Python", "Docker"])],
        )

        self.assertEqual(result["live_job_count"], 1)
        self.assertEqual(result["jobs_with_skill_data"], 1)
        self.assertEqual(result["skill_data_coverage_percentage"], 100)


class AverageQualityScoreTests(unittest.TestCase):
    def _overview(self, students):
        with patch.object(
            StudentRepository, "get_all", return_value=students
        ), patch.object(LiveJobProvider, "get_jobs", return_value=[]):
            return get_cohort_overview(authorized=True)

    def test_valid_scores_calculate_correctly(self):
        result = self._overview([
            student(id="stud-01", quality_score=80),
            student(id="stud-02", quality_score=90),
            student(id="stud-03", quality_score=70),
        ])

        self.assertEqual(result["average_quality_score"], 80)
        self.assertEqual(result["cohort_size"], 3)

    def test_missing_scores_are_excluded_from_the_average(self):
        without_key = student(id="stud-03")
        del without_key["quality_score"]

        result = self._overview([
            student(id="stud-01", quality_score=80),
            student(id="stud-02", quality_score=None),
            without_key,
        ])

        self.assertEqual(result["average_quality_score"], 80)
        self.assertEqual(result["cohort_size"], 3)

    def test_no_valid_scores_returns_null(self):
        without_key = student(id="stud-03")
        del without_key["quality_score"]

        result = self._overview([
            student(id="stud-01", quality_score=None),
            student(id="stud-02", quality_score="not a score"),
            without_key,
        ])

        self.assertIsNone(result["average_quality_score"])
        self.assertEqual(result["cohort_size"], 3)

    def test_other_overview_fields_and_thresholds_are_preserved(self):
        result = self._overview([
            student(
                id="stud-01",
                cgpa=5.5,
                quality_score=80,
                admin_status="Approved",
                sla_hours_pending=60,
            )
        ])

        self.assertEqual(
            set(result.keys()),
            {
                "cohort_size",
                "average_quality_score",
                "high_risk_count",
                "approved_count",
                "sla_escalations_count",
                "live_job_count",
                "jobs_with_skill_data",
                "skill_data_coverage_percentage",
                "batch_missing_skills",
            },
        )
        self.assertEqual(result["high_risk_count"], 1)
        self.assertEqual(result["approved_count"], 1)
        self.assertEqual(result["sla_escalations_count"], 1)
        self.assertEqual(result["batch_missing_skills"], [])

    def test_missing_score_still_counts_as_high_risk(self):
        without_key = student(id="stud-02", cgpa=8.0)
        del without_key["quality_score"]

        result = self._overview([
            student(id="stud-01", cgpa=8.0, quality_score=90),
            without_key,
        ])

        self.assertEqual(result["average_quality_score"], 90)
        self.assertEqual(result["high_risk_count"], 1)


if __name__ == "__main__":
    unittest.main()
