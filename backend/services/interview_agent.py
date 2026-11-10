"""
CareerSync Interview Agent
Unified service for adaptive question retrieval, response validation,
and deterministic rubric evaluation.
"""

import re
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from data_seeds import INTERVIEW_QUESTION_BANK


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
    def get_question(cls, skill: str, difficulty: int = 6) -> Dict[str, Any]:
        """
        Retrieves the question closest to the requested difficulty level.
        Falls back to a foundational question if the skill is unknown.
        """
        clamped_diff = max(1, min(10, difficulty))
        questions = INTERVIEW_QUESTION_BANK.get(skill)

        if not questions:
            # Fallback for unrecognized skills
            return {
                "id": "gen-q1",
                "level": "General Technical",
                "question": f"Explain the core engineering concepts, architecture trade-offs, and best practices associated with {skill}.",
                "keywords": ["scalability", "trade-offs", "performance", "architecture", "testing"],
                "difficulty": clamped_diff
            }

        # Select question minimizing distance to target difficulty
        closest = min(questions, key=lambda q: abs(q.get("difficulty", 6) - clamped_diff))
        return closest

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