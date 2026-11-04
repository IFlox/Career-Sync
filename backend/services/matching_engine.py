import numpy as np
from typing import Dict, Any, List

class SemanticMatchingEngine:
    """
    Computes vector cosine similarity, missing skill delta,
    and university SOP rule constraints (CGPA & Concurrent Application limits).
    """

    @staticmethod
    def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    @classmethod
    def evaluate(cls, candidate: Dict[str, Any], target_job: Dict[str, Any]) -> Dict[str, Any]:
        candidate_skills = [s.strip().lower() for s in candidate.get("skills", [])]
        required_skills = target_job.get("required_skills", [])

        # 1. Deterministic Skill Gap
        matched = []
        missing = []
        for req in required_skills:
            if req.lower() in candidate_skills:
                matched.append(req)
            else:
                missing.append(req)

        # 2. Vector Cosine Similarity
        # Build shared vocabulary vector
        vocab = list(set([r.lower() for r in required_skills] + candidate_skills))
        vec_job = np.array([1 if word in [r.lower() for r in required_skills] else 0 for word in vocab])
        vec_cand = np.array([1 if word in candidate_skills else 0 for word in vocab])

        cosine_sim = cls._cosine_similarity(vec_job, vec_cand)
        cgpa_ratio = min(1.0, candidate.get("cgpa", 7.0) / 10.0)

        # Overall percentage: 70% skill vector cosine match + 30% CGPA metric
        match_percentage = int(np.round((cosine_sim * 70.0) + (cgpa_ratio * 30.0)))
        match_percentage = min(99, max(20, match_percentage))

        # 3. University SOP Constraints
        sop_violations = []
        is_eligible = True

        # Rule 1: CGPA Guardrail for Tier-1 Roles (< 6.0 restricted)
        if target_job.get("tier") == "Tier-1" and candidate.get("cgpa", 0.0) < 6.0:
            is_eligible = False
            sop_violations.append(
                f"SOP Restriction: Role requires minimum CGPA 6.0 for Tier-1 Drives. Current candidate CGPA is {candidate.get('cgpa')}. Restricted to Tier-2."
            )

        # Rule 2: Active Application Concurrency Cap (Max 3)
        if candidate.get("active_apps_count", 0) >= 3:
            sop_violations.append(
                f"Application Cap Alert: Candidate already has {candidate.get('active_apps_count')} active concurrent drives (University Limit: 3)."
            )

        return {
            "match_percentage": match_percentage,
            "matched_skills": matched,
            "missing_skills": missing,
            "is_eligible": is_eligible,
            "sop_violations": sop_violations,
            "tier": target_job.get("tier"),
            "target_role": target_job.get("title")
        }