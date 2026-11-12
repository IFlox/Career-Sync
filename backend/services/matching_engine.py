"""
CareerSync Composite Semantic & Preference Matching Engine (Sprint 2)
Computes:
1. Skill Fit (45%): Vector cosine similarity & required skill coverage
2. Preference Alignment (30%): Role, location, and technology stack overlap
3. Academic SOP Eligibility (15%): University CGPA tier and application caps
4. Recommendation Feedback (10%): Bookmark boost (+10%) or Hidden penalty (-50%)
Attaches data_mode provenance metadata to every evaluation output.
"""

import numpy as np
from typing import Dict, Any, List, Optional


class SemanticMatchingEngine:
    @staticmethod
    def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    @classmethod
    def evaluate(
        cls,
        candidate: Dict[str, Any],
        target_job: Dict[str, Any],
        preferences: Optional[Dict[str, Any]] = None,
        feedback_list: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        candidate_skills = [s.strip().lower() for s in candidate.get("skills", [])]
        required_skills = target_job.get("required_skills") or target_job.get("requiredSkills") or []

        # 1. Skill Fit Calculation (45% Weight)
        matched_skills = []
        missing_skills = []
        for req in required_skills:
            if req.lower() in candidate_skills:
                matched_skills.append(req)
            else:
                missing_skills.append(req)

        vocab = list(set([r.lower() for r in required_skills] + candidate_skills))
        if vocab:
            vec_job = np.array([1 if word in [r.lower() for r in required_skills] else 0 for word in vocab])
            vec_cand = np.array([1 if word in candidate_skills else 0 for word in vocab])
            cosine_sim = cls._cosine_similarity(vec_job, vec_cand)
        else:
            cosine_sim = 0.5

        skill_coverage_ratio = len(matched_skills) / max(1, len(required_skills))
        skill_fit_score = (cosine_sim * 60.0) + (skill_coverage_ratio * 40.0)
        skill_fit_score = max(15.0, min(100.0, skill_fit_score))

        # 2. Preference Alignment Calculation (30% Weight)
        fit_reasons = []
        caution_notes = []

        pref = preferences or {}
        pref_roles = [r.lower() for r in pref.get("preferred_roles", [])]
        pref_locs = [l.lower() for l in pref.get("preferred_locations", [])]
        target_techs = [t.lower() for t in pref.get("target_technologies", [])]

        job_title = target_job.get("title", "").lower()
        job_location = target_job.get("location")
        job_loc = job_location.lower() if isinstance(job_location, str) else ""

        role_aligned = any(r in job_title or job_title in r for r in pref_roles)
        role_points = 35.0 if role_aligned else 15.0
        if role_aligned:
            fit_reasons.append("Directly matches your target role preferences")

        loc_aligned = (
            ("remote" in job_loc)
            or any(l in job_loc for l in pref_locs)
            or (not pref_locs and bool(job_loc))
        )
        loc_points = 30.0 if loc_aligned else 10.0
        if loc_aligned:
            fit_reasons.append(f"Work location ({job_location or 'Not provided'}) aligns with your choices")
        else:
            caution_notes.append(f"Job location ({job_location or 'Not provided'}) needs confirmation")

        matching_tech = [t for t in target_techs if any(t in req.lower() for req in required_skills)]
        tech_ratio = len(matching_tech) / max(1, len(target_techs)) if target_techs else 0.7
        tech_points = min(35.0, tech_ratio * 35.0)
        if matching_tech:
            fit_reasons.append(f"Utilizes {len(matching_tech)} of your target technologies: {', '.join([t.title() for t in matching_tech[:3]])}")

        pref_alignment_score = role_points + loc_points + tech_points

        # 3. Academic SOP Eligibility (15% Weight)
        sop_violations = []
        is_eligible = True
        cand_cgpa = float(candidate.get("cgpa", 7.5))
        active_apps = int(candidate.get("active_apps_count", 0))
        tier = target_job.get("tier", "Tier-2")

        if tier == "Tier-1" and cand_cgpa < 6.0:
            is_eligible = False
            sop_violations.append(f"University Rule: Minimum 6.0 CGPA required for Tier-1 drives (Current: {cand_cgpa})")
            eligibility_score = 30.0
        else:
            eligibility_score = 100.0

        if active_apps >= 3:
            sop_violations.append(f"Application Cap: Already enrolled in {active_apps}/3 concurrent drives")
            eligibility_score = min(eligibility_score, 40.0)

        # 4. Recommendation Feedback Multiplier (10% Weight)
        feedback_boost = 0.0
        is_saved = False
        is_hidden = False

        if feedback_list:
            job_id = target_job.get("id")
            for fb in feedback_list:
                if fb.get("entity_id") == job_id and fb.get("entity_type") == "JOB":
                    if fb.get("action") == "SAVED":
                        feedback_boost = 10.0
                        is_saved = True
                        fit_reasons.append("Bookmarked in your priority list")
                    elif fb.get("action") == "HIDDEN":
                        feedback_boost = -50.0
                        is_hidden = True
                        caution_notes.append("Marked as hidden by you")

        # Composite Weighted Score
        raw_composite = (
            (0.45 * skill_fit_score) +
            (0.30 * pref_alignment_score) +
            (0.15 * eligibility_score) +
            feedback_boost
        )

        match_percentage = int(np.round(raw_composite))
        match_percentage = max(5, min(99, match_percentage))

        if not fit_reasons:
            fit_reasons.append("Foundational technical overlap with campus requirements")

        # Attach explicit provenance metadata
        candidate_data_mode = candidate.get("data_mode", "DEMO_DATA")
        job_data_mode = target_job.get("data_mode", "DEMO_DATA")

        return {
            "match_percentage": match_percentage,
            "skill_fit_score": int(round(skill_fit_score)),
            "preference_alignment_score": int(round(pref_alignment_score)),
            "eligibility_score": int(round(eligibility_score)),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "is_eligible": is_eligible,
            "sop_violations": sop_violations,
            "tier": tier,
            "is_saved": is_saved,
            "is_hidden": is_hidden,
            "fit_reasons": fit_reasons,
            "caution_notes": caution_notes,
            "data_mode": "LIVE_DATA" if job_data_mode == "LIVE_DATA" and candidate_data_mode == "LIVE_DATA" else "DEMO_DATA",
            "source_provenance": {
                "candidate_mode": candidate_data_mode,
                "job_mode": job_data_mode,
                "job_source": target_job.get("source_label", "Curated Role")
            }
        }