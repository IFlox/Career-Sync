"""
CareerSync Interview Agent
Runtime AI question generation plus deterministic rubric evaluation.
No seeded question bank is used as question content or fallback.
"""

import re
import uuid
from typing import Dict, Any, List
from pydantic import BaseModel, Field

from services.ai_engine import CareerSyncAIEngine, AIProviderUnavailableError


class InterviewQuestionUnavailableError(Exception):
    """Raised when a runtime AI question cannot be generated or validated."""
    pass


class InterviewEvaluationSchema(BaseModel):
    score: int = Field(..., ge=0, le=10)
    next_difficulty: int = Field(..., ge=1, le=10)
    adaptation_note: str
    matched_keywords: List[str]
    missing_keywords: List[str]
    critique: str
    evaluated_by: str = "ai"  # "ai" or "deterministic_rubric"


class InterviewAgentService:
    @classmethod
    def get_question(
        cls,
        skill: str,
        difficulty: int = 6,
        target_role: str = "",
        previous_question_text: str = ""
    ) -> Dict[str, Any]:
        """
        Generates one interview question with AI. There is no seeded fallback:
        provider or validation failures raise InterviewQuestionUnavailableError
        so the API can return an explicit unavailable state.
        """
        clamped_diff = max(1, min(10, difficulty))
        try:
            generated = CareerSyncAIEngine.generate_interview_question_with_ai(
                skill=skill,
                difficulty=clamped_diff,
                target_role=target_role,
                previous_question_text=previous_question_text
            )
        except AIProviderUnavailableError as exc:
            raise InterviewQuestionUnavailableError(
                "AI interview question generation is unavailable right now. Please retry."
            ) from exc
        except Exception as exc:
            raise InterviewQuestionUnavailableError(
                "AI interview question generation is unavailable right now. Please retry."
            ) from exc

        return {
            "id": f"ai-q-{uuid.uuid4().hex[:12]}",
            "level": f"AI Generated • Difficulty {generated['difficulty']}/10",
            "question": generated["question"],
            "skill": generated["skill"],
            "keywords": generated["expected_keywords"],
            "expected_keywords": generated["expected_keywords"],
            "difficulty": generated["difficulty"],
            "content_origin": "AI_GENERATED",
            "data_mode": "AI_GENERATED"
        }

    @classmethod
    def build_evaluation_question(
        cls,
        question_text: str = "",
        expected_keywords: List[str] = None,
        skill: str = "",
        difficulty: int = 6
    ) -> Dict[str, Any]:
        """
        Builds the evaluation context from the question the candidate actually
        answered. This deliberately does not look up or generate a question.
        """
        keywords = []
        seen = set()
        for item in expected_keywords or []:
            if not isinstance(item, str):
                continue
            keyword = item.strip()
            if not keyword:
                continue
            key = keyword.lower()
            if key in seen:
                continue
            seen.add(key)
            keywords.append(keyword)

        try:
            clamped_diff = int(difficulty)
        except (TypeError, ValueError):
            clamped_diff = 6

        return {
            "question": str(question_text or "").strip(),
            "keywords": keywords[:20],
            "skill": str(skill or "").strip(),
            "difficulty": max(1, min(10, clamped_diff))
        }

    @classmethod
    def evaluate_locally(cls, question: Dict[str, Any], answer_text: str, current_diff: int) -> Dict[str, Any]:
        """
        Deterministic rubric evaluation.
        Calculates score based on whole-word boundary matching of ideal keywords.
        """
        clean_ans = answer_text.strip()
        words = clean_ans.split()
        keywords = question.get("keywords", [])

        if len(words) < 5:
            next_d = max(1, current_diff - 1)
            return {
                "score": 1 if len(words) == 0 else 2,
                "next_difficulty": next_d,
                "adaptation_note": f"Response lacked sufficient technical detail. Difficulty lowered to {next_d}/10.",
                "matched_keywords": [],
                "missing_keywords": keywords,
                "critique": "Your answer was too brief. Elaborate with specific system components and engineering trade-offs.",
                "evaluated_by": "deterministic_rubric"
            }

        # Whole-word regex matching to prevent substring false-positives
        matched = []
        missing = []
        for kw in keywords:
            pattern = rf"\b{re.escape(kw.lower())}\b"
            if re.search(pattern, clean_ans.lower()):
                matched.append(kw)
            else:
                missing.append(kw)

        # Base scoring: 0 to 7 based on keyword coverage
        coverage_ratio = len(matched) / max(1, len(keywords))
        raw_score = int(round(coverage_ratio * 7))

        # Elaboration bonus for substantial technical depth
        if len(words) >= 30:
            raw_score += 2
        elif len(words) >= 15:
            raw_score += 1

        final_score = max(2, min(10, raw_score))

        # Enforce server-side adaptive difficulty rule
        if final_score >= 8:
            next_diff = min(10, current_diff + 1)
            adaptation_note = f"Demonstrated strong technical command. Increasing difficulty to {next_diff}/10."
        elif final_score <= 4:
            next_diff = max(1, current_diff - 1)
            adaptation_note = f"Foundational concepts missed. Lowering difficulty to {next_diff}/10."
        else:
            next_diff = current_diff
            adaptation_note = f"Consistent technical answer. Maintaining target difficulty at {next_diff}/10."

        critique = (
            f"You demonstrated good articulation on {', '.join(matched)}."
            if matched else
            "Your answer was structured, but did not mention key architectural terminology."
        )
        if missing:
            critique += f" To improve, discuss trade-offs involving {', '.join(missing[:2])}."

        return {
            "score": final_score,
            "next_difficulty": next_diff,
            "adaptation_note": adaptation_note,
            "matched_keywords": matched,
            "missing_keywords": missing,
            "critique": critique,
            "evaluated_by": "deterministic_rubric"
        }