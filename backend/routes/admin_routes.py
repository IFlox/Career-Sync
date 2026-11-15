"""
CareerSync Placement Cell (TPO) Admin Routes (Sprint 1 Complete)
Standardized error codes: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity.
"""

import os
import io
import csv
from typing import Literal, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import StudentRepository, PreferenceRepository
from services.ai_engine import CareerSyncAIEngine, AIProviderUnavailableError
from services.live_jobs import LiveJobProvider, LiveJobsUnavailableError
from services.matching_engine import SemanticMatchingEngine
from services.admin_auth import ADMIN_PIN, create_admin_token, require_admin_configuration, verify_tpo_token

load_dotenv()

router = APIRouter(prefix="/admin", tags=["Placement Cell (TPO)"])

LIVE_JOBS_UNAVAILABLE_DETAIL = (
    "Live job listings are unavailable right now. Please retry."
)

class LoginRequest(BaseModel):
    pin: str = Field(..., min_length=1)

class StatusUpdateRequest(BaseModel):
    student_id: str
    new_status: Literal["Approved", "Revision Required", "Pending"]

class RemediationSyllabusRequest(BaseModel):
    target_skills: List[str] = ["Docker & Containerization", "System Design", "RAG Pipelines"]


def _live_jobs_or_503() -> List[dict]:
    """Loads runtime live listings; a provider failure is an explicit 503."""
    try:
        return LiveJobProvider.get_jobs()
    except LiveJobsUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=LIVE_JOBS_UNAVAILABLE_DETAIL
        ) from exc


def _compute_batch_missing_skills(students: List[dict], jobs: List[dict]) -> List[dict]:
    """
    Derives cohort skill gaps from live listings.

    Each student counts at most once per skill, no matter how many live jobs
    require it. Skills are reported with the canonical names supplied by
    live_jobs.py and ranked by the number of students missing them.
    """
    if not students or not jobs:
        return []

    usable_jobs = [
        job for job in jobs
        if isinstance(job.get("required_skills"), list) and job["required_skills"]
    ]
    if not usable_jobs:
        return []

    total_students = len(students)
    missing_counts: dict = {}
    canonical_names: dict = {}

    for student in students:
        student_missing: dict = {}
        for job in usable_jobs:
            evaluation = SemanticMatchingEngine.evaluate(
                candidate=student,
                target_job=job
            )
            for skill in evaluation.get("missing_skills") or []:
                name = str(skill).strip()
                if not name:
                    continue
                key = name.lower()
                student_missing.setdefault(key, name)

        for key, name in student_missing.items():
            missing_counts[key] = missing_counts.get(key, 0) + 1
            canonical_names.setdefault(key, name)

    if not missing_counts:
        return []

    ranked = sorted(
        missing_counts.items(),
        key=lambda item: (-item[1], canonical_names[item[0]].lower())
    )

    return [
        {
            "skill": canonical_names[key],
            "missing_percentage": round((count / total_students) * 100)
        }
        for key, count in ranked[:4]
    ]


def _skill_data_summary(jobs: List[dict]) -> dict:
    """Reports how many live listings actually carried skill data."""
    live_job_count = len(jobs)
    jobs_with_skill_data = sum(
        1 for job in jobs
        if isinstance(job.get("required_skills"), list) and job["required_skills"]
    )
    coverage_percentage = (
        round((jobs_with_skill_data / live_job_count) * 100, 1)
        if live_job_count
        else 0
    )
    return {
        "live_job_count": live_job_count,
        "jobs_with_skill_data": jobs_with_skill_data,
        "skill_data_coverage_percentage": coverage_percentage,
    }


@router.post("/auth/verify")
def verify_admin_pin(payload: LoginRequest):
    require_admin_configuration()
    if payload.pin == ADMIN_PIN:
        token = create_admin_token()
        return {"status": "authorized", "token": token, "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect admin access key."
    )


@router.get("/analytics/intent")
def get_cohort_intent_analytics(authorized: bool = Depends(verify_tpo_token)):
    students = StudentRepository.get_all()
    total = len(students)

    role_counts = {}
    loc_counts = {}

    for s in students:
        pref = PreferenceRepository.get_preferences(s["id"])
        for r in pref.get("preferred_roles", []):
            role_counts[r] = role_counts.get(r, 0) + 1
        for l in pref.get("preferred_locations", []):
            loc_counts[l] = loc_counts.get(l, 0) + 1

    top_roles = [
        {"role": k, "student_count": v, "percentage": round((v / max(1, total)) * 100)}
        for k, v in sorted(role_counts.items(), key=lambda item: item[1], reverse=True)[:4]
    ]

    top_locations = [
        {"location": k, "student_count": v, "percentage": round((v / max(1, total)) * 100)}
        for k, v in sorted(loc_counts.items(), key=lambda item: item[1], reverse=True)[:4]
    ]

    return {
        "cohort_size": total,
        "top_desired_roles": top_roles,
        "top_desired_locations": top_locations
    }


@router.post("/remediation/syllabus")
def generate_remediation_syllabus(payload: RemediationSyllabusRequest, authorized: bool = Depends(verify_tpo_token)):
    skills_str = ", ".join(payload.target_skills)
    prompt = (
        "You are a Director of Campus Training & Placements at an Engineering Institute.\n"
        f"The placement cell has identified these recurring cohort skill gaps: {skills_str}.\n\n"
        "Generate a high-impact, practical 3-Day Technical Remediation Bootcamp Syllabus.\n"
        "Return ONLY a JSON object with this exact schema:\n"
        "{\n"
        '  "bootcamp_title": "string",\n'
        '  "target_cohort": "string",\n'
        '  "days": [\n'
        '    {\n'
        '      "day_number": 1,\n'
        '      "theme": "string",\n'
        '      "topics": ["string"],\n'
        '      "hands_on_lab": "string",\n'
        '      "estimated_hours": 6\n'
        '    }\n'
        "  ],\n"
        '  "recommended_mentors": ["string"],\n'
        '  "exit_assessment_criteria": "string"\n'
        "}"
    )

    try:
        ai_syllabus = CareerSyncAIEngine._call_llm_json(prompt)
        if isinstance(ai_syllabus.get("days"), list):
            return ai_syllabus
    except AIProviderUnavailableError:
        pass

    # Verified deterministic fallback curriculum (Grounded)
    return {
        "bootcamp_title": "Intensive 3-Day Systems & Containerization Placement Bootcamp",
        "target_cohort": "B.Tech Engineering Class of 2026",
        "days": [
            {
                "day_number": 1,
                "theme": "Containerization & Multi-Stage Builds (Docker)",
                "topics": ["Docker Daemon Architecture", "Writing Lean Multi-Stage Dockerfiles", "Layer Caching & Security Best Practices"],
                "hands_on_lab": "Containerize a multi-service FastAPI + Redis application and reduce image size from 800MB to 120MB.",
                "estimated_hours": 6
            },
            {
                "day_number": 2,
                "theme": "Distributed Systems & In-Memory Topologies (Redis & System Design)",
                "topics": ["High-Concurrency API Design", "Idempotency Keys & Distributed Locks", "Cache Eviction Patterns (Cache-Aside, Write-Through)"],
                "hands_on_lab": "Implement a distributed rate limiter and transactional lock in Redis with comprehensive unit tests.",
                "estimated_hours": 6
            },
            {
                "day_number": 3,
                "theme": "Vector Retrieval & Placement Mock Technical Assessment",
                "topics": ["Vector Embeddings & Pinecone Indexing", "Handling Context Window Bleeding in RAG", "Live Mock Technical Interviews"],
                "hands_on_lab": "Build an end-to-end semantic documentation search pipeline and participate in 1-on-1 mock interviews.",
                "estimated_hours": 6
            }
        ],
        "recommended_mentors": ["Senior Staff Architect", "DevOps Chapter Lead", "Campus Placement Alumni"],
        "exit_assessment_criteria": "Students must achieve 80%+ on the container optimization lab and pass an adaptive 10-minute technical viva."
    }


def _numeric_quality_score(value) -> Optional[float]:
    """Returns a real numeric quality score, or None when none was recorded."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


@router.get("/analytics/overview")
def get_cohort_overview(authorized: bool = Depends(verify_tpo_token)):
    students = StudentRepository.get_all()
    total = len(students)

    scored_students = [
        score for s in students
        if (score := _numeric_quality_score(s.get("quality_score"))) is not None
    ]
    avg_score = round(sum(scored_students) / len(scored_students)) if scored_students else None

    # Thresholds are unchanged. A missing score still counts toward high risk,
    # matching the previous behavior of treating it as zero.
    high_risk_count = sum(
        1 for s in students
        if (s.get("cgpa") or 0) < 6.0
        or (_numeric_quality_score(s.get("quality_score")) or 0) < 45
    )
    approved_count = sum(1 for s in students if s.get("admin_status") == "Approved")
    sla_escalated = sum(1 for s in students if (s.get("sla_hours_pending") or 0) > 48)

    if total:
        jobs = _live_jobs_or_503()
        skill_metadata = _skill_data_summary(jobs)
        batch_missing_skills = (
            _compute_batch_missing_skills(students, jobs)
            if skill_metadata["jobs_with_skill_data"] > 0
            else []
        )
    else:
        # No students means the overview never consults the live provider.
        skill_metadata = {
            "live_job_count": 0,
            "jobs_with_skill_data": 0,
            "skill_data_coverage_percentage": 0,
        }
        batch_missing_skills = []

    return {
        "cohort_size": total,
        "average_quality_score": avg_score,
        "high_risk_count": high_risk_count,
        "approved_count": approved_count,
        "sla_escalations_count": sla_escalated,
        **skill_metadata,
        "batch_missing_skills": batch_missing_skills
    }


@router.get("/matrix")
def get_verification_matrix(authorized: bool = Depends(verify_tpo_token)):
    students = StudentRepository.get_all()
    enriched = []
    for s in students:
        pref = PreferenceRepository.get_preferences(s["id"])
        enriched.append({
            **s,
            "preferences": pref
        })
    return {"students": enriched}


@router.patch("/matrix/status")
def update_student_status(payload: StatusUpdateRequest, authorized: bool = Depends(verify_tpo_token)):
    student = StudentRepository.get_by_id(payload.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student ID not found in database."
        )

    StudentRepository.update_status(payload.student_id, payload.new_status)
    return {
        "status": "updated",
        "student_id": payload.student_id,
        "new_status": payload.new_status
    }


@router.get("/export/csv")
def export_verified_csv(authorized: bool = Depends(verify_tpo_token)):
    students = StudentRepository.get_all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Name", "Branch", "CGPA", "Readiness Score",
        "Preferred Roles", "Preferred Locations", "Top Skills", "TPO Status"
    ])

    for s in students:
        if s.get("admin_status") == "Approved":
            pref = PreferenceRepository.get_preferences(s["id"])
            writer.writerow([
                s["id"],
                s["name"],
                s["branch"],
                s["cgpa"],
                s["quality_score"],
                ", ".join(pref.get("preferred_roles", [])),
                ", ".join(pref.get("preferred_locations", [])),
                ", ".join(s.get("skills", [])),
                s["admin_status"]
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=CareerSync_Verified_Batch.csv"}
    )