from typing import Dict, Any
from data_seeds import INTERVIEW_QUESTION_BANK

class InterviewAgentService:
    """
    Adaptive mock interview bot: Selects questions for skill gaps,
    scores answers (0-10), and dynamically scales difficulty.
    """

    @classmethod
    def get_question(cls, skill: str, difficulty: int = 6) -> Dict[str, Any]:
        questions = INTERVIEW_QUESTION_BANK.get(skill, INTERVIEW_QUESTION_BANK["RAG Pipelines"])
        # Match closest difficulty
        closest = min(questions, key=lambda q: abs(q["difficulty"] - difficulty))
        return closest

    @classmethod
    def evaluate_answer(cls, question: Dict[str, Any], answer_text: str, current_difficulty: int) -> Dict[str, Any]:
        if not answer_text or len(answer_text.strip()) < 5:
            return {
                "score": 2,
                "adaptation_note": "Answer was too brief. Difficulty decreased to consolidate basics.",
                "next_difficulty": max(3, current_difficulty - 1),
                "feedback": "Please elaborate on concrete engineering trade-offs and component choices."
            }

        text_lower = answer_text.lower()
        keywords = question.get("keywords", [])
        matched_kw = [kw for kw in keywords if kw.lower() in text_lower]

        ratio = len(matched_kw) / max(1, len(keywords))
        score = int(round(ratio * 8)) + (2 if len(answer_text.split()) > 20 else 0)
        score = max(2, min(10, score))

        # Adaptive difficulty adjustment rule
        if score > 8:
            next_diff = min(10, current_difficulty + 1)
            adaptation_note = f"Outstanding precision! Difficulty increased to Level {next_diff}/10."
        elif score < 5:
            next_diff = max(3, current_difficulty - 1)
            adaptation_note = f"Fundamentals need reinforcement. Difficulty lowered to Level {next_diff}/10."
        else:
            next_diff = current_difficulty
            adaptation_note = f"Solid answer. Maintained difficulty target at Level {next_diff}/10."

        return {
            "score": score,
            "next_difficulty": next_diff,
            "adaptation_note": adaptation_note,
            "matched_keywords": matched_kw,
            "missing_keywords": [kw for kw in keywords if kw.lower() not in text_lower],
            "feedback": (
                "Excellent technical articulation with verified terminology."
                if score >= 7 else
                f"Good start, but remember to mention key concepts like {', '.join(keywords[:2])}."
            )
        }