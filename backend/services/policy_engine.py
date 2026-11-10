"""
Institutional Placement SOP Policy Engine
Enforces sovereign university placement rules deterministically.
"""
import os
import json
from typing import Dict, Any, List

POLICY_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "university_policy.json")

class UniversityPolicyEngine:
    @staticmethod
    def load_policy() -> Dict[str, Any]:
        try:
            with open(POLICY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {
                "institution_name": "JK Lakshmipat University",
                "rules": {
                    "tier_1_min_cgpa": 6.0,
                    "tier_2_min_cgpa": 5.0,
                    "max_concurrent_applications": 3,
                    "review_sla_hours": 48
                }
            }

    @classmethod
    def evaluate_eligibility(cls, student_cgpa: float, active_apps_count: int, job_tier: str) -> Dict[str, Any]:
        policy = cls.load_policy()
        rules = policy.get("rules", {})
        violations = []
        is_eligible = True

        # Rule 1: CGPA Tier Restriction
        if job_tier == "Tier-1" and student_cgpa < rules.get("tier_1_min_cgpa", 6.0):
            is_eligible = False
            violations.append(
                f"SOP Policy: Minimum {rules.get('tier_1_min_cgpa', 6.0)} CGPA required for Tier-1 placements. Current CGPA: {student_cgpa}."
            )

        # Rule 2: Active Applications Cap
        max_apps = rules.get("max_concurrent_applications", 3)
        if active_apps_count >= max_apps:
            is_eligible = False
            violations.append(
                f"Application Cap: Student already holds {active_apps_count} active applications (University Limit: {max_apps})."
            )

        return {
            "is_eligible": is_eligible,
            "violations": violations,
            "policy_applied": policy.get("institution_name", "University Policy")
        }