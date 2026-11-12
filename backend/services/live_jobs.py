"""
Live Industry Job Provider
Fetches live tech roles from open feeds with caching, offline fallback, and guaranteed unique IDs.
"""
import time
import requests
from typing import List, Dict, Any
from data_seeds import TARGET_JOBS as CURATED_JOBS

CACHE_TTL_SECONDS = 7200  # 2 Hours
_job_cache: Dict[str, Any] = {
    "timestamp": 0,
    "jobs": [],
    "feed_status": "UNINITIALIZED"
}


class LiveJobProvider:
    @classmethod
    def get_jobs(cls) -> List[Dict[str, Any]]:
        current_time = time.time()
        if _job_cache["jobs"] and (current_time - _job_cache["timestamp"]) < CACHE_TTL_SECONDS:
            return _job_cache["jobs"]

        live_jobs = cls._fetch_live_jobs()
        if live_jobs:
            _job_cache["jobs"] = live_jobs
            _job_cache["timestamp"] = current_time
            _job_cache["feed_status"] = "LIVE_DATA"
            return live_jobs

        # Fallback to curated partner roles explicitly marked as DEMO_DATA
        _job_cache["feed_status"] = "DEMO_DATA"
        return [
            {
                **job,
                "data_mode": "DEMO_DATA",
                "source_label": "Curated Campus Partner Drive",
                "is_live": False,
                "updated_at": "Curated Sample Opportunity"
            }
            for job in CURATED_JOBS
        ]

    @staticmethod
    def _fetch_live_jobs() -> List[Dict[str, Any]]:
        url = "https://www.arbeitnow.com/api/job-board-api"
        try:
            resp = requests.get(url, timeout=5, headers={"User-Agent": "CareerSync-Agent/2.4"})
            if resp.status_code != 200:
                return []

            data = resp.json().get("data", [])
            known_skills = [
                "Python", "Docker", "Kubernetes", "FastAPI", "SQL", "PostgreSQL",
                "Redis", "System Design", "AWS", "Linux", "PyTorch", "RAG Pipelines",
                "React", "Node.js", "Go", "C++", "Terraform", "CI/CD"
            ]
            technical_terms = (
                "software", "engineer", "developer", "developer", "devops",
                "data", "machine learning", "ai ", "cloud", "backend",
                "frontend", "platform", "infrastructure", "security", "qa",
                "quality assurance", "sre", "systems"
            )

            parsed_jobs = []
            seen_ids = set()

            for idx, item in enumerate(data[:8]):
                title = item.get("title", "Software Engineer")
                tags = [t.title() for t in item.get("tags", [])]
                desc = item.get("description", "")

                searchable_text = f"{title} {desc} {' '.join(tags)}".lower()
                if not any(term in searchable_text for term in technical_terms):
                    continue

                skills = [s for s in known_skills if s.lower() in desc.lower() or s in tags]
                if not skills:
                    skills = [tag for tag in tags if tag.lower() in {
                        "python", "java", "javascript", "typescript", "c++", "go",
                        "rust", "react", "kotlin", "ruby", "php"
                    }]
                if not skills:
                    continue

                is_tier_1 = any(k in title.lower() for k in ["senior", "lead", "architect", "ai", "staff", "cloud"])
                tier = "Tier-1" if is_tier_1 else "Tier-2"

                # Guaranteed unique ID: combine slug with loop index
                raw_slug = item.get("slug") or f"job-{idx}"
                unique_id = f"live-{raw_slug}-{idx}"

                if unique_id in seen_ids:
                    unique_id = f"{unique_id}-{int(time.time())}"
                seen_ids.add(unique_id)

                parsed_jobs.append({
                    "id": unique_id,
                    "title": title,
                    "company": item.get("company_name", "Tech Employer"),
                    "location": item.get("location") or "Location not provided",
                    "tier": tier,
                    "min_cgpa": 6.5 if tier == "Tier-1" else 5.5,
                    "required_skills": skills[:6],
                    "requiredSkills": skills[:6],
                    "description": item.get("description", "")[:280] + "...",
                    "data_mode": "LIVE_DATA",
                    "source_label": "Live Public Feed (Arbeitnow)",
                    "is_live": True,
                    "updated_at": "Verified Live Listing"
                })

            # Keep all curated roles available with stable IDs for the demo workspace.
            for job in CURATED_JOBS:
                parsed_jobs.append({
                    **job,
                    "data_mode": "DEMO_DATA",
                    "source_label": "Curated Campus Partner Drive",
                    "is_live": False,
                    "updated_at": "Curated Sample Opportunity"
                })

            return parsed_jobs

        except Exception as e:
            print(f"[LIVE JOBS] Live feed notice: {e}. Using curated partner roles.")
            return []