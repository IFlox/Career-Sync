"""
Live Industry Job Provider
Fetches live tech roles from open feeds with caching and offline fallback.
"""
import time
import requests
from typing import List, Dict, Any
from data_seeds import TARGET_JOBS as FALLBACK_JOBS

CACHE_TTL_SECONDS = 7200  # 2 Hours
_job_cache: Dict[str, Any] = {
    "timestamp": 0,
    "jobs": []
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
            return live_jobs

        # Fallback to campus partner jobs if external feed fails or is offline
        return [
            {**job, "source": "Campus Partner Drive", "is_live": False, "updated_at": "Today"}
            for job in FALLBACK_JOBS
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
                "React", "Node.js", "Go"
            ]

            parsed_jobs = []
            for item in data[:6]:  # Take top 6 live engineering roles
                title = item.get("title", "Software Engineer")
                tags = [t.title() for t in item.get("tags", [])]
                desc = item.get("description", "")

                # Extract matched technical skills
                skills = [s for s in known_skills if s.lower() in desc.lower() or s in tags]
                if not skills:
                    skills = ["Python", "Docker", "System Design"]

                # Classify Tier based on title seniority
                is_tier_1 = any(k in title.lower() for k in ["senior", "lead", "architect", "ai", "staff", "cloud"])
                tier = "Tier-1" if is_tier_1 else "Tier-2"

                parsed_jobs.append({
                    "id": f"live-{item.get('slug', str(int(time.time())))[:16]}",
                    "title": title,
                    "company": item.get("company_name", "Tech Employer"),
                    "tier": tier,
                    "min_cgpa": 6.5 if tier == "Tier-1" else 5.5,
                    "required_skills": skills[:6],
                    "requiredSkills": skills[:6],
                    "description": item.get("description", "")[:280] + "...",
                    "source": "Live Industry Feed (Arbeitnow API)",
                    "is_live": True,
                    "updated_at": "Live Feed"
                })

            # Append campus partner baseline jobs
            partner_jobs = [
                {**job, "source": "Campus Partner Drive", "is_live": False, "updated_at": "Verified Partner"}
                for job in FALLBACK_JOBS[:2]
            ]
            return parsed_jobs + partner_jobs

        except Exception as e:
            print(f"[LIVE JOBS] Feed unavailable: {e}. Switching to campus partner seeds.")
            return []