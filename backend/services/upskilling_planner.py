"""
CareerSync Personalized Upskilling Planner
Generates a 4-week preparation roadmap dynamically adapted to:
1. Target Role & Priority Missing Gaps
2. Candidate's Preferred Learning Style (Projects vs Videos vs Docs)
3. Available Study Budget (Hours / Week)
"""

from typing import Dict, Any, List
from data_seeds import VERIFIED_LEARNING_CATALOG, HACKATHON_SEEDS


class UpskillingPlannerService:
    @classmethod
    def generate_roadmap(
        cls,
        target_job: Dict[str, Any],
        missing_skills: List[str],
        preferences: Dict[str, Any],
        completed_weeks: List[int] = None
    ) -> Dict[str, Any]:
        style = preferences.get("learning_style", "PROJECT_BASED")
        weekly_budget = preferences.get("available_hours_per_week", 10)
        completed = completed_weeks or []

        # If candidate has fewer than 4 missing skills, add role core topics
        role_skills = target_job.get("required_skills") or target_job.get("requiredSkills") or []
        curated_skills = list(missing_skills)
        for s in role_skills:
            if len(curated_skills) >= 4:
                break
            if s not in curated_skills:
                curated_skills.append(s)

        if not curated_skills:
            curated_skills = ["System Design", "Docker", "FastAPI", "Redis"]

        roadmap_items = []
        for idx, skill in enumerate(curated_skills[:4]):
            week_num = idx + 1
            skill_catalog = VERIFIED_LEARNING_CATALOG.get(skill, {})

            # Select resource matching preferred style, or fall back to any available
            resource = skill_catalog.get(style) or skill_catalog.get("PROJECT_BASED") or skill_catalog.get("DOCS_READING") or {
                "title": f"Production Implementation Guide for {skill}",
                "provider": "Official Architecture Reference",
                "url": "https://docs.docker.com",
                "duration": f"{min(8, weekly_budget)} Hours",
                "format": "🛠️ Hands-on Project Lab" if style == "PROJECT_BASED" else "📖 Official Documentation"
            }

            # Adapt estimated hours to student's weekly budget
            allocated_hours = min(weekly_budget, int(resource.get("duration", "6").split()[0]))

            roadmap_items.append({
                "week": week_num,
                "skill": skill,
                "title": resource["title"],
                "provider": resource["provider"],
                "url": resource["url"],
                "format_badge": resource.get("format", "🛠️ Hands-on Project Lab"),
                "allocated_hours": allocated_hours,
                "weekly_budget": weekly_budget,
                "is_completed": week_num in completed,
                "practical_deliverable": f"Deliverable: Complete sample implementation for {skill} and document architectural trade-offs."
            })

        return {
            "target_role": target_job.get("title", "Software Engineer"),
            "learning_style": style,
            "weekly_hour_budget": weekly_budget,
            "roadmap": roadmap_items,
            "target_hackathons": HACKATHON_SEEDS[:2]
        }