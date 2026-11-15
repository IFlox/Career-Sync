"""
CareerSync Personalized Upskilling Planner

Builds a four-week learning roadmap at runtime through the AI engine, adapted to:
1. Target role and priority missing skills
2. Preferred learning style (projects vs videos vs docs)
3. Available study budget (hours / week)
4. Already completed milestone weeks

No verified catalog, resource seed list, or hackathon seed is used as content or
fallback. When the AI engine fails, the planner raises an explicit unavailable
error so the route can return HTTP 503.
"""

import re
from typing import Dict, Any, List

from services.ai_engine import (
    ACTIVITY_TYPE_BADGES,
    AIProviderUnavailableError,
    CareerSyncAIEngine,
    LEARNING_ROADMAP_WEEKS,
)


class RoadmapUnavailableError(Exception):
    """Raised when a runtime AI learning plan cannot be generated or validated."""


def _clean_text(value: Any, limit: int = 80) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:limit]


def _coerce_weekly_hours(value: Any) -> float:
    try:
        hours = float(value)
    except (TypeError, ValueError):
        hours = 10.0
    return round(max(1.0, min(40.0, hours)), 1)


class UpskillingPlannerService:
    @classmethod
    def generate_roadmap(
        cls,
        target_job: Dict[str, Any],
        missing_skills: List[str],
        preferences: Dict[str, Any],
        completed_weeks: List[int] = None
    ) -> Dict[str, Any]:
        """
        Generates the learning plan. Seeded resources are never read here, and a
        provider failure raises RoadmapUnavailableError instead of inventing
        roadmap content.
        """
        target_job = target_job or {}
        preferences = preferences or {}

        style = _clean_text(preferences.get("learning_style") or "PROJECT_BASED", 40).upper() or "PROJECT_BASED"
        weekly_budget = _coerce_weekly_hours(preferences.get("available_hours_per_week", 10))

        completed = sorted({
            int(week)
            for week in (completed_weeks or [])
            if isinstance(week, (int, float)) and not isinstance(week, bool)
            and 1 <= int(week) <= LEARNING_ROADMAP_WEEKS
        })

        role_title = _clean_text(target_job.get("title") or "Software Engineer", 120)

        # Missing skills come from the deterministic match engine. Role skills
        # only widen the focus when fewer than four gaps were found; both are
        # live job/profile data, not learning seed content.
        focus_skills: List[str] = []
        role_skills = target_job.get("required_skills") or target_job.get("requiredSkills") or []
        for raw in list(missing_skills or []) + list(role_skills or []):
            skill = _clean_text(raw, 80)
            if skill and skill not in focus_skills:
                focus_skills.append(skill)
            if len(focus_skills) >= 6:
                break

        try:
            generated = CareerSyncAIEngine.generate_learning_roadmap_with_ai(
                target_role=role_title,
                missing_skills=focus_skills,
                learning_style=style,
                available_hours_per_week=weekly_budget,
                completed_weeks=completed
            )
        except AIProviderUnavailableError as exc:
            raise RoadmapUnavailableError(
                "AI learning roadmap generation is unavailable right now. Please retry."
            ) from exc
        except Exception as exc:
            raise RoadmapUnavailableError(
                "AI learning roadmap generation is unavailable right now. Please retry."
            ) from exc

        completed_set = set(completed)
        roadmap_items = []
        for entry in generated.get("roadmap", []):
            activity_type = entry["activity_type"]
            roadmap_items.append({
                "week": entry["week"],
                "skill": entry["skill"],
                "title": entry["title"],
                "learning_objective": entry["learning_objective"],
                "activity_type": activity_type,
                "estimated_hours": entry["estimated_hours"],
                "study_note": entry["study_note"],
                "search_query": entry["search_query"],
                # Compatibility fields used by the existing roadmap card.
                "allocated_hours": entry["estimated_hours"],
                "weekly_budget": weekly_budget,
                "format_badge": ACTIVITY_TYPE_BADGES.get(activity_type, "Learning Activity"),
                "is_completed": entry["week"] in completed_set,
                "content_origin": "AI_GENERATED",
                "data_mode": "AI_GENERATED"
            })

        return {
            "target_role": role_title,
            "learning_style": style,
            "weekly_hour_budget": weekly_budget,
            "roadmap_weeks": LEARNING_ROADMAP_WEEKS,
            "roadmap": roadmap_items,
            "content_origin": "AI_GENERATED",
            "data_mode": "AI_GENERATED"
        }
