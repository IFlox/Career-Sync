"""
Isolated tests for runtime AI learning roadmap generation.

All provider calls are mocked through CareerSyncAIEngine._call_llm_json or
CareerSyncAIEngine.generate_learning_roadmap_with_ai. No network access is used.
"""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from services.ai_engine import (
    AIProviderUnavailableError,
    LEARNING_ROADMAP_TIMEOUT_SECONDS,
    CareerSyncAIEngine,
)
from services.upskilling_planner import (
    RoadmapUnavailableError,
    UpskillingPlannerService,
)


def roadmap_week(week, **overrides):
    item = {
        "week": week,
        "skill": "Docker",
        "title": f"Container build lab {week}",
        "learning_objective": "Practice building and running a container locally.",
        "activity_type": "HANDS_ON_LAB",
        "estimated_hours": 4,
        "study_note": "Write a Dockerfile and compare layer sizes.",
        "search_query": "docker multi-stage build tutorial",
        "content_origin": "AI_GENERATED",
    }
    item.update(overrides)
    return item


def valid_payload():
    return {
        "roadmap": [roadmap_week(week) for week in range(1, 5)],
        "content_origin": "AI_GENERATED",
    }


class GenerateLearningRoadmapValidationTests(unittest.TestCase):
    def generate(self, payload, skills=None, hours=10, **kwargs):
        with patch.object(CareerSyncAIEngine, "_call_llm_json", return_value=payload):
            return CareerSyncAIEngine.generate_learning_roadmap_with_ai(
                target_role="Distributed Backend Developer",
                missing_skills=skills if skills is not None else ["Docker"],
                available_hours_per_week=hours,
                **kwargs
            )

    def assert_invalid(self, payload, **kwargs):
        with self.assertRaises(AIProviderUnavailableError):
            self.generate(payload, **kwargs)

    def test_valid_ai_plan_is_returned_with_expected_fields(self):
        result = self.generate(valid_payload(), completed_weeks=[2])

        self.assertEqual(result["content_origin"], "AI_GENERATED")
        self.assertEqual(len(result["roadmap"]), 4)
        weeks = [item["week"] for item in result["roadmap"]]
        self.assertEqual(weeks, [1, 2, 3, 4])

        first = result["roadmap"][0]
        self.assertEqual(first["skill"], "Docker")
        self.assertEqual(first["activity_type"], "HANDS_ON_LAB")
        self.assertEqual(first["estimated_hours"], 4)
        self.assertEqual(first["content_origin"], "AI_GENERATED")
        self.assertTrue(first["search_query"])
        self.assertNotIn("url", first)
        self.assertNotIn("provider", first)

    def test_prompt_contains_only_runtime_inputs_and_no_seeded_content(self):
        with patch.object(
            CareerSyncAIEngine,
            "_call_llm_json",
            return_value=valid_payload()
        ) as mocked_call:
            CareerSyncAIEngine.generate_learning_roadmap_with_ai(
                target_role="Distributed Backend Developer",
                missing_skills=["Docker", "Kubernetes"],
                learning_style="VIDEO_FIRST",
                available_hours_per_week=12,
                completed_weeks=[2]
            )

        prompt = mocked_call.call_args.args[0]
        self.assertIn("Distributed Backend Developer", prompt)
        self.assertIn("Docker, Kubernetes", prompt)
        self.assertIn("VIDEO_FIRST", prompt)
        self.assertIn("12.0 hours", prompt)
        self.assertIn("week 2", prompt)

        # Seeded catalog / hackathon content must never be fed to the model.
        for seeded in (
            "Build a Local RAG Agent with Pinecone & FastAPI",
            "https://docs.docker.com",
            "Official Documentation",
            "GitHub Production Lab",
            "NPTEL",
            "Smart India Hackathon",
        ):
            self.assertNotIn(seeded, prompt)

        self.assertEqual(
            mocked_call.call_args.kwargs.get("timeout_seconds"),
            LEARNING_ROADMAP_TIMEOUT_SECONDS
        )

    def test_roadmap_must_be_a_list(self):
        for roadmap in (None, {}, "weeks", 4):
            with self.subTest(roadmap=roadmap):
                payload = valid_payload()
                payload["roadmap"] = roadmap
                self.assert_invalid(payload)

    def test_roadmap_must_span_exactly_four_weeks(self):
        for count in (0, 1, 3, 5):
            with self.subTest(count=count):
                payload = {
                    "roadmap": [roadmap_week(week) for week in range(1, count + 1)],
                    "content_origin": "AI_GENERATED",
                }
                self.assert_invalid(payload)

    def test_duplicate_or_gapped_weeks_are_rejected(self):
        duplicate = valid_payload()
        duplicate["roadmap"][1]["week"] = 1
        self.assert_invalid(duplicate)

        gapped = valid_payload()
        gapped["roadmap"][1]["week"] = 4
        self.assert_invalid(gapped)

    def test_unordered_weeks_are_returned_in_order(self):
        payload = valid_payload()
        payload["roadmap"] = [
            roadmap_week(3),
            roadmap_week(1),
            roadmap_week(4),
            roadmap_week(2),
        ]
        result = self.generate(payload)
        self.assertEqual([item["week"] for item in result["roadmap"]], [1, 2, 3, 4])

    def test_required_text_fields_must_be_non_empty(self):
        for field in ("skill", "title", "learning_objective", "study_note", "search_query"):
            with self.subTest(field=field):
                payload = valid_payload()
                payload["roadmap"][0][field] = "   "
                self.assert_invalid(payload)

    def test_activity_type_must_be_supported(self):
        for activity in ("PODCAST", "READING", "", None):
            with self.subTest(activity=activity):
                payload = valid_payload()
                payload["roadmap"][0]["activity_type"] = activity
                self.assert_invalid(payload)

    def test_estimated_hours_must_be_positive_and_within_budget(self):
        for hours in (0, -2, "4", None, 11, 99):
            with self.subTest(hours=hours):
                payload = valid_payload()
                payload["roadmap"][0]["estimated_hours"] = hours
                self.assert_invalid(payload, hours=10)

    def test_content_origin_must_be_ai_generated(self):
        payload = valid_payload()
        payload["content_origin"] = "CURATED"
        self.assert_invalid(payload)

        item_payload = valid_payload()
        item_payload["roadmap"][0]["content_origin"] = "SEEDED"
        self.assert_invalid(item_payload)

    def test_urls_are_rejected(self):
        for field in ("title", "learning_objective", "study_note", "search_query"):
            with self.subTest(field=field):
                payload = valid_payload()
                payload["roadmap"][0][field] = "See https://example.com/learn for details."
                self.assert_invalid(payload)

    def test_verification_and_institutional_claims_are_rejected(self):
        claims = (
            "This official curriculum is verified.",
            "Accredited institutional material for the week.",
            "University-approved study plan.",
            "Placement cell guaranteed material.",
        )
        for claim in claims:
            with self.subTest(claim=claim):
                payload = valid_payload()
                payload["roadmap"][0]["study_note"] = claim
                self.assert_invalid(payload)

    def test_named_learning_providers_are_rejected(self):
        for provider in ("coursera", "NPTEL", "Udemy", "freeCodeCamp", "YouTube"):
            with self.subTest(provider=provider):
                payload = valid_payload()
                payload["roadmap"][0]["search_query"] = f"{provider} docker tutorial"
                self.assert_invalid(payload)

    def test_requested_skill_may_still_be_named_as_a_topic(self):
        payload = valid_payload()
        for item in payload["roadmap"]:
            item["skill"] = "Amazon Web Services"
            item["title"] = "Amazon Web Services deployment lab"
            item["search_query"] = "Amazon Web Services deploy lab"

        result = self.generate(payload, skills=["Amazon Web Services"])
        self.assertEqual(result["roadmap"][0]["skill"], "Amazon Web Services")

    def test_total_provider_failure_raises_unavailable(self):
        with patch.object(
            CareerSyncAIEngine,
            "_call_llm_json",
            side_effect=AIProviderUnavailableError("provider down")
        ):
            with self.assertRaises(AIProviderUnavailableError):
                CareerSyncAIEngine.generate_learning_roadmap_with_ai(
                    target_role="Backend Developer",
                    missing_skills=["Docker"]
                )


class UpskillingPlannerRuntimeTests(unittest.TestCase):
    GENERATED = {
        "roadmap": [
            {
                "week": week,
                "skill": "Docker",
                "title": f"Container build lab {week}",
                "learning_objective": "Practice container builds.",
                "activity_type": "HANDS_ON_LAB",
                "estimated_hours": 4.0,
                "study_note": "Compare image layers.",
                "search_query": "docker build tutorial",
                "content_origin": "AI_GENERATED",
            }
            for week in range(1, 5)
        ],
        "content_origin": "AI_GENERATED",
    }

    def test_generate_roadmap_maps_ai_plan_and_preserves_milestones(self):
        with patch.object(
            CareerSyncAIEngine,
            "generate_learning_roadmap_with_ai",
            return_value=self.GENERATED
        ):
            result = UpskillingPlannerService.generate_roadmap(
                target_job={"title": "Distributed Backend Developer"},
                missing_skills=["Docker"],
                preferences={
                    "learning_style": "PROJECT_BASED",
                    "available_hours_per_week": 8,
                },
                completed_weeks=[1, 3]
            )

        self.assertEqual(result["content_origin"], "AI_GENERATED")
        self.assertEqual(result["data_mode"], "AI_GENERATED")
        self.assertEqual(result["weekly_hour_budget"], 8)
        self.assertEqual(len(result["roadmap"]), 4)

        completed = {item["week"]: item["is_completed"] for item in result["roadmap"]}
        self.assertEqual(completed, {1: True, 2: False, 3: True, 4: False})

        first = result["roadmap"][0]
        self.assertEqual(first["allocated_hours"], 4.0)
        self.assertEqual(first["weekly_budget"], 8)
        self.assertEqual(first["format_badge"], "Hands-on Lab")
        self.assertEqual(first["content_origin"], "AI_GENERATED")
        self.assertNotIn("provider", first)
        self.assertNotIn("url", first)

    def test_generate_roadmap_passes_live_inputs_only(self):
        with patch.object(
            CareerSyncAIEngine,
            "generate_learning_roadmap_with_ai",
            return_value=self.GENERATED
        ) as mocked_call:
            UpskillingPlannerService.generate_roadmap(
                target_job={
                    "title": "Distributed Backend Developer",
                    "required_skills": ["System Design", "PostgreSQL"],
                },
                missing_skills=["Docker"],
                preferences={"learning_style": "VIDEO_FIRST", "available_hours_per_week": 6},
                completed_weeks=[2, 2, 9]
            )

        kwargs = mocked_call.call_args.kwargs
        self.assertEqual(kwargs["target_role"], "Distributed Backend Developer")
        self.assertEqual(kwargs["missing_skills"], ["Docker", "System Design", "PostgreSQL"])
        self.assertEqual(kwargs["learning_style"], "VIDEO_FIRST")
        self.assertEqual(kwargs["available_hours_per_week"], 6.0)
        self.assertEqual(kwargs["completed_weeks"], [2])

    def test_generate_roadmap_raises_explicit_unavailable_error(self):
        with patch.object(
            CareerSyncAIEngine,
            "generate_learning_roadmap_with_ai",
            side_effect=AIProviderUnavailableError("provider down")
        ):
            with self.assertRaises(RoadmapUnavailableError) as context:
                UpskillingPlannerService.generate_roadmap(
                    target_job={"title": "Backend Developer"},
                    missing_skills=["Docker"],
                    preferences={}
                )

        self.assertIn("unavailable", str(context.exception).lower())

    def test_roadmap_route_returns_503_when_generation_is_unavailable(self):
        from routes.student_routes import get_upskilling_roadmap
        from services.matching_engine import SemanticMatchingEngine
        from services.progress_tracker import ProgressTrackerService
        from database import PreferenceRepository, StudentRepository
        from services.live_jobs import LiveJobProvider

        with patch.object(StudentRepository, "get_by_id", return_value={"id": "stud-01"}), \
                patch.object(
                    LiveJobProvider,
                    "get_jobs",
                    return_value=[{"id": "job-ai-sys", "title": "AI Systems & RAG Engineer"}]
                ), \
                patch.object(PreferenceRepository, "get_preferences", return_value={}), \
                patch.object(
                    ProgressTrackerService,
                    "get_progress",
                    return_value={"completed_milestones": [2]}
                ), \
                patch.object(
                    SemanticMatchingEngine,
                    "evaluate",
                    return_value={"missing_skills": ["Docker"]}
                ), \
                patch.object(
                    UpskillingPlannerService,
                    "generate_roadmap",
                    side_effect=RoadmapUnavailableError("provider down")
                ):
            with self.assertRaises(HTTPException) as context:
                get_upskilling_roadmap(student_id="stud-01", job_id="job-ai-sys")

        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("unavailable", context.exception.detail.lower())

    def test_roadmap_route_returns_ai_plan_shape(self):
        from routes.student_routes import get_upskilling_roadmap
        from services.matching_engine import SemanticMatchingEngine
        from services.progress_tracker import ProgressTrackerService
        from database import PreferenceRepository, StudentRepository
        from services.live_jobs import LiveJobProvider

        plan = {
            "target_role": "AI Systems & RAG Engineer",
            "learning_style": "PROJECT_BASED",
            "weekly_hour_budget": 8.0,
            "roadmap_weeks": 4,
            "roadmap": [
                {
                    "week": 1,
                    "skill": "Docker",
                    "title": "Container build lab",
                    "is_completed": True,
                    "content_origin": "AI_GENERATED",
                }
            ],
            "content_origin": "AI_GENERATED",
            "data_mode": "AI_GENERATED",
        }

        with patch.object(StudentRepository, "get_by_id", return_value={"id": "stud-01"}), \
                patch.object(
                    LiveJobProvider,
                    "get_jobs",
                    return_value=[{"id": "job-ai-sys", "title": "AI Systems & RAG Engineer"}]
                ), \
                patch.object(PreferenceRepository, "get_preferences", return_value={}), \
                patch.object(
                    ProgressTrackerService,
                    "get_progress",
                    return_value={"completed_milestones": [1]}
                ), \
                patch.object(
                    SemanticMatchingEngine,
                    "evaluate",
                    return_value={"missing_skills": ["Docker"]}
                ), \
                patch.object(
                    UpskillingPlannerService,
                    "generate_roadmap",
                    return_value=plan
                ) as mocked_plan:
            result = get_upskilling_roadmap(student_id="stud-01", job_id="job-ai-sys")

        self.assertEqual(result, plan)
        mocked_plan.assert_called_once()
        self.assertEqual(mocked_plan.call_args.kwargs["completed_weeks"], [1])


class NoSeededLearningContentTests(unittest.TestCase):
    def test_data_seeds_no_longer_defines_learning_seeds(self):
        import data_seeds

        self.assertFalse(hasattr(data_seeds, "VERIFIED_LEARNING_CATALOG"))
        self.assertFalse(hasattr(data_seeds, "VERIFIED_RESOURCES"))
        self.assertFalse(hasattr(data_seeds, "HACKATHON_SEEDS"))

    def test_upskilling_planner_does_not_import_seed_catalogs(self):
        import services.upskilling_planner as planner

        self.assertFalse(hasattr(planner, "VERIFIED_LEARNING_CATALOG"))
        self.assertFalse(hasattr(planner, "HACKATHON_SEEDS"))


if __name__ == "__main__":
    unittest.main()
