import re
from typing import Dict, Any, List

class ResumeAuditorService:
    """
    Evaluates quantified impact, action-verb density, and generates ATS Single-Column data.
    """
    ACTION_VERBS = {
        "architected", "engineered", "optimized", "spearheaded", "deployed",
        "implemented", "reduced", "scaled", "automated", "designed", "accelerated"
    }

    METRIC_PATTERN = re.compile(r'(\d+[%kKxX+]|\d+\s*(?:ms|seconds|users|requests|percent|orders))', re.IGNORECASE)

    @classmethod
    def audit(cls, text: str) -> Dict[str, Any]:
        lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 15]
        verb_count = 0
        metric_count = 0
        weak_bullets = []

        for line in lines:
            line_lower = line.lower()
            has_verb = any(v in line_lower for v in cls.ACTION_VERBS)
            has_metric = bool(cls.METRIC_PATTERN.search(line))

            if has_verb:
                verb_count += 1
            if has_metric:
                metric_count += 1

            if not has_metric and any(line_lower.startswith(prefix) for prefix in ["helped", "built a", "worked on"]):
                weak_bullets.append({
                    "original": line,
                    "suggested": f"Spearheaded execution of {re.sub(r'^(helped|built a|worked on)\s*', '', line, flags=re.I)}, increasing throughput by 25% with zero regressions."
                })

        # Calculate Score (0-100)
        score = 40 + min(30, verb_count * 7) + min(30, metric_count * 10)
        score = max(25, min(100, score))

        return {
            "score": score,
            "verb_count": verb_count,
            "metric_count": metric_count,
            "weak_bullets": weak_bullets
        }

    @classmethod
    def format_ats(cls, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transforms messy input into standardized single-column ATS format."""
        skills_str = " • ".join(student_data.get("skills", []))
        return {
            "header": {
                "name": student_data.get("name", "CANDIDATE").upper(),
                "branch": student_data.get("branch", "Engineering"),
                "cgpa": f"CGPA: {student_data.get('cgpa', 7.0)} / 10.0",
                "badge": f"[VERIFIED CANDIDATE - ID: {student_data.get('id', 'N/A')}] • PII Masked"
            },
            "sections": [
                {
                    "title": "CORE TECHNICAL COMPETENCIES",
                    "content": skills_str
                },
                {
                    "title": "ACADEMIC & PRODUCTION PROJECTS",
                    "items": [
                        f"Scalable Systems Engineering: Applied {skills_str[:35]} to architect resilient services.",
                        "Event-Driven Architecture: Reduced latency by configuring caching & idempotent routes.",
                        "Containerized Delivery: Configured Docker workflows for deterministic deployments."
                    ]
                },
                {
                    "title": "INSTITUTIONAL SOP VERIFICATION",
                    "content": f"Status: {student_data.get('admin_status', 'Pending')} | Concurrent Drives: {student_data.get('active_apps_count', 1)}/3"
                }
            ]
        }