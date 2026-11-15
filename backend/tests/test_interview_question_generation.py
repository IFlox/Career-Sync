"""
Isolated tests for runtime AI interview question generation.

All provider calls are mocked through CareerSyncAIEngine._call_llm_json.
No network access or real API key is used.
"""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from services.ai_engine import (
    AIProviderUnavailableError,
    INTERVIEW_QUESTION_TIMEOUT_SECONDS,
    CareerSyncAIEngine,
)
from services.interview_agent import (
    InterviewAgentService,
    InterviewQuestionUnavailableError,
)


def valid_payload():
    return {
        "question": "How would you design an idempotent job submission endpoint that safely retries after a timeout?",
        "skill": "System Design",
        "difficulty": 7,
        "expected_keywords": ["idempotency key", "retry", "unique constraint"],
        "content_origin": "AI_GENERATED",
    }


class GenerateInterviewQuestionValidationTests(unittest.TestCase):
    def assert_invalid(self, payload, **kwargs):
        with patch.object(CareerSyncAIEngine, "_call_llm_json", return_value=payload):
            with self.assertRaises(AIProviderUnavailableError):
                CareerSyncAIEngine.generate_interview_question_with_ai(
                    skill="System Design",
                    difficulty=7,
                    **kwargs
                )

    def test_valid_ai_payload_is_returned_with_expected_shape(self):
        with patch.object(CareerSyncAIEngine, "_call_llm_json", return_value=valid_payload()):
            result = CareerSyncAIEngine.generate_interview_question_with_ai(
                skill="System Design",
                difficulty=7,
                target_role="Distributed Backend Developer",
                previous_question_text="Explain cache invalidation."
            )

        self.assertEqual(result["content_origin"], "AI_GENERATED")
        self.assertEqual(result["skill"], "System Design")
        self.assertEqual(result["difficulty"], 7)
        self.assertEqual(
            result["expected_keywords"],
            ["idempotency key", "retry", "unique constraint"]
        )
        self.assertTrue(result["question"])

    def test_prompt_uses_only_runtime_inputs_and_no_seeded_question_content(self):
        with patch.object(
            CareerSyncAIEngine,
            "_call_llm_json",
            return_value=valid_payload()
        ) as mocked_call:
            CareerSyncAIEngine.generate_interview_question_with_ai(
                skill="System Design",
                difficulty=7,
                target_role="Distributed Backend Developer",
                previous_question_text="Explain cache invalidation."
            )

        prompt = mocked_call.call_args.args[0]
        self.assertIn("Distributed Backend Developer", prompt)
        self.assertIn("System Design", prompt)
        self.assertIn("Explain cache invalidation.", prompt)
        self.assertNotIn("sliding window", prompt)
        self.assertNotIn("hierarchical chunking", prompt)
        self.assertNotIn("cross-encoder", prompt)
        self.assertEqual(
            mocked_call.call_args.kwargs.get("timeout_seconds"),
            INTERVIEW_QUESTION_TIMEOUT_SECONDS
        )

    def test_empty_question_is_rejected(self):
        payload = valid_payload()
        payload["question"] = "   "
        self.assert_invalid(payload)

    def test_difficulty_outside_range_is_rejected(self):
        for difficulty in (0, 11, -3, "7", True):
            with self.subTest(difficulty=difficulty):
                payload = valid_payload()
                payload["difficulty"] = difficulty
                self.assert_invalid(payload)

    def test_empty_expected_keywords_are_rejected(self):
        for keywords in ([], [""], [1]):
            with self.subTest(keywords=keywords):
                payload = valid_payload()
                payload["expected_keywords"] = keywords
                self.assert_invalid(payload)

    def test_url_in_question_or_keywords_is_rejected(self):
        url_payload = valid_payload()
        url_payload["question"] = "Review https://example.com/jobs before answering."
        self.assert_invalid(url_payload)

        keyword_payload = valid_payload()
        keyword_payload["expected_keywords"] = ["idempotency key", "www.example.com"]
        self.assert_invalid(keyword_payload)

    def test_unsupported_verification_or_institution_claims_are_rejected(self):
        for question in (
            "This question is verified by the placement cell. Explain retries.",
            "As asked in a Google interview, explain idempotency.",
            "Explain the university's preferred cache strategy.",
        ):
            with self.subTest(question=question):
                payload = valid_payload()
                payload["question"] = question
                self.assert_invalid(payload)

    def test_origin_must_be_ai_generated(self):
        payload = valid_payload()
        payload["content_origin"] = "CURATED"
        self.assert_invalid(payload)

    def test_returned_skill_label_is_aligned_with_the_requested_skill(self):
        payload = valid_payload()
        payload["skill"] = "Some Invented Topic"
        with patch.object(CareerSyncAIEngine, "_call_llm_json", return_value=payload):
            result = CareerSyncAIEngine.generate_interview_question_with_ai(
                skill="System Design",
                difficulty=7
            )

        self.assertEqual(result["skill"], "System Design")

    def test_repeating_the_previous_question_is_rejected(self):
        with patch.object(CareerSyncAIEngine, "_call_llm_json", return_value=valid_payload()):
            with self.assertRaises(AIProviderUnavailableError):
                CareerSyncAIEngine.generate_interview_question_with_ai(
                    skill="System Design",
                    difficulty=7,
                    previous_question_text=valid_payload()["question"]
                )


class InterviewAgentRuntimeTests(unittest.TestCase):
    def test_get_question_has_endpoint_compatible_shape(self):
        generated = {
            "question": "How do you prevent duplicate charges when a client retries a request?",
            "skill": "System Design",
            "difficulty": 7,
            "expected_keywords": ["idempotency key", "transaction"],
            "content_origin": "AI_GENERATED",
        }
        with patch.object(
            CareerSyncAIEngine,
            "generate_interview_question_with_ai",
            return_value=generated
        ):
            result = InterviewAgentService.get_question(
                skill="System Design",
                difficulty=7,
                target_role="Backend Developer",
                previous_question_text="What is a cache?"
            )

        self.assertEqual(result["question"], generated["question"])
        self.assertEqual(result["keywords"], generated["expected_keywords"])
        self.assertEqual(result["expected_keywords"], generated["expected_keywords"])
        self.assertEqual(result["content_origin"], "AI_GENERATED")
        self.assertEqual(result["data_mode"], "AI_GENERATED")
        self.assertIn("difficulty", result)
        self.assertIn("level", result)

    def test_get_question_raises_explicit_unavailable_error(self):
        with patch.object(
            CareerSyncAIEngine,
            "generate_interview_question_with_ai",
            side_effect=AIProviderUnavailableError("provider down")
        ):
            with self.assertRaises(InterviewQuestionUnavailableError) as context:
                InterviewAgentService.get_question(skill="Docker", difficulty=5)

        self.assertIn("unavailable", str(context.exception).lower())

    def test_evaluation_context_uses_only_supplied_question_data(self):
        context = InterviewAgentService.build_evaluation_question(
            question_text="Explain retry safety.",
            expected_keywords=["idempotency key", "retry", "retry"],
            skill="System Design",
            difficulty=7
        )

        self.assertEqual(context["question"], "Explain retry safety.")
        self.assertEqual(context["keywords"], ["idempotency key", "retry"])
        self.assertEqual(context["difficulty"], 7)

    def test_question_route_returns_503_when_generation_is_unavailable(self):
        from routes.student_routes import fetch_interview_question

        with patch.object(
            InterviewAgentService,
            "get_question",
            side_effect=InterviewQuestionUnavailableError("provider down")
        ):
            with self.assertRaises(HTTPException) as context:
                fetch_interview_question(skill="Docker", difficulty=5)

        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("unavailable", context.exception.detail.lower())

    def test_evaluation_never_generates_a_question(self):
        from routes.student_routes import (
            AnswerSubmitRequest,
            evaluate_interview_answer,
        )
        from services.progress_tracker import ProgressTrackerService

        payload = AnswerSubmitRequest(
            student_id="stud-01",
            skill="System Design",
            question_text="Explain retry safety.",
            expected_keywords=[],
            answer_text="I do not know, sorry.",
            current_difficulty=6
        )

        with patch.object(
            InterviewAgentService,
            "get_question",
            side_effect=AssertionError("evaluation must not generate a question")
        ), patch.object(
            ProgressTrackerService,
            "log_interview_attempt",
            return_value=None
        ):
            result = evaluate_interview_answer(payload)

        self.assertEqual(result["score"], 2)
        self.assertEqual(result["matched_keywords"], [])


class NoSeededQuestionBankTests(unittest.TestCase):
    def test_interview_agent_does_not_import_a_seeded_bank(self):
        import services.interview_agent as interview_agent

        self.assertFalse(hasattr(interview_agent, "INTERVIEW_QUESTION_BANK"))

    def test_data_seeds_no_longer_defines_an_interview_bank(self):
        import data_seeds

        self.assertFalse(hasattr(data_seeds, "INTERVIEW_QUESTION_BANK"))


if __name__ == "__main__":
    unittest.main()
