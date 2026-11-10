"""
CareerSync Student Routes (Phase 5 Complete Edition)
Integrates:
- Closed-loop Next Best Action engine
- Multi-style personalized roadmaps
- Preference-aware job ranking
- Real PDF ingestion & PII scrubbing
"""

import re
import time
import uuid
import socket
import ipaddress
import requests
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from database import StudentRepository, PreferenceRepository
from services.live_jobs import LiveJobProvider
from services.policy_engine import UniversityPolicyEngine
from services.pdf_parser import PDFResumeParser
from services.pii_scrubber import PIIScrubberService
from services.ai_engine import CareerSyncAIEngine
from services.resume_auditor import ResumeAuditorService
from services.matching_engine import SemanticMatchingEngine
from services.market_radar import MarketRadarService
from services.interview_agent import InterviewAgentService
from services.progress_tracker import ProgressTrackerService
from services.upskilling_planner import UpskillingPlannerService
from data_seeds import VERIFIED_LEARNING_CATALOG, HACKATHON_SEEDS

router = APIRouter(prefix="/students", tags=["Student Portal"])

MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024

class ResumeParseRequest(BaseModel):
    raw_text: str = Field(..., min_length=20, max_length=25000)
    target_job_id: Optional[str] = "job-ai-sys"

class AnswerSubmitRequest(BaseModel):
    student_id: str = "stud-01"
    skill: str = "RAG Pipelines"
    question_text: Optional[str] = None
    answer_text: str = Field(..., max_length=2000)
    current_difficulty: int = Field(6, ge=1, le=10)

class MilestoneToggleRequest(BaseModel):
    week_number: int
    current_readiness: int = 75

class UrlIngestRequest(BaseModel):
    url: str

class ApplicationSubmitRequest(BaseModel):
    student_id: str
    job_id: str
    job_title: str
    company: str
    tier: str

class PreferencesUpdateRequest(BaseModel):
    preferred_roles: List[str] = ["AI Systems & RAG Engineer", "Distributed Backend Developer"]
    preferred_locations: List[str] = ["Bangalore", "Pune", "Remote"]
    preferred_industries: List[str] = ["Enterprise AI", "FinTech", "SaaS"]
    target_technologies: List[str] = ["Python", "FastAPI", "Docker", "PostgreSQL"]
    min_expected_ctc_lpa: float = 6.0
    learning_style: str = "PROJECT_BASED"
    available_hours_per_week: int = 10

class FeedbackSubmitRequest(BaseModel):
    student_id: str
    entity_type: str
    entity_id: str
    action: str
    reason: Optional[str] = None


def validate_public_url(url_str: str) -> None:
    try:
        parsed = urlparse(url_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format.")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only HTTP and HTTPS URLs are permitted.")

    hostname = parsed.hostname
    if not hostname or hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        raise HTTPException(status_code=400, detail="Access to local or invalid hostnames is prohibited.")

    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to resolve hostname DNS.")

    for item in resolved_ips:
        ip_obj = ipaddress.ip_address(item[4][0])
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            raise HTTPException(status_code=400, detail="Access to private IP space is prohibited.")


# =====================================================================
# Phase 5: Closed-Loop Next Best Action Endpoint
# =====================================================================
@router.get("/{student_id}/recommendations/next-action")
def get_next_best_action(student_id: str, job_id: str = "job-ai-sys"):
    student = StudentRepository.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    all_jobs = LiveJobProvider.get_jobs()
    target_job = next((j for j in all_jobs if j["id"] == job_id), all_jobs[0])

    preferences = PreferenceRepository.get_preferences(student_id)
    match_res = SemanticMatchingEngine.evaluate(student, target_job, preferences)
    missing = match_res.get("missing_skills", ["System Design"])

    action = ProgressTrackerService.get_next_best_action(
        student_id=student_id,
        target_role_title=target_job.get("title", "Software Engineer"),
        missing_skills=missing,
        current_readiness=match_res.get("match_percentage", 75)
    )
    return action


# =====================================================================
# Student Preferences & Feedback Endpoints
# =====================================================================
@router.get("/{student_id}/preferences")
def get_student_preferences(student_id: str):
    return PreferenceRepository.get_preferences(student_id)


@router.put("/{student_id}/preferences")
def update_student_preferences(student_id: str, payload: PreferencesUpdateRequest):
    PreferenceRepository.upsert_preferences(student_id, payload.model_dump())
    return {
        "status": "success",
        "message": "Preferences updated successfully.",
        "preferences": PreferenceRepository.get_preferences(student_id)
    }


@router.post("/feedback")
def submit_recommendation_feedback(payload: FeedbackSubmitRequest):
    PreferenceRepository.save_feedback(
        student_id=payload.student_id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        action=payload.action,
        reason=payload.reason
    )
    return {"status": "success", "action": payload.action, "entity_id": payload.entity_id}


@router.get("/{student_id}/feedback")
def get_student_feedback(student_id: str):
    return {"feedback": PreferenceRepository.get_feedback(student_id)}


@router.get("/{student_id}/ranked-jobs")
def get_ranked_jobs_for_student(student_id: str):
    student = StudentRepository.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    preferences = PreferenceRepository.get_preferences(student_id)
    feedback_list = PreferenceRepository.get_feedback(student_id)
    all_jobs = LiveJobProvider.get_jobs()

    ranked_jobs = []
    for job in all_jobs:
        match_eval = SemanticMatchingEngine.evaluate(
            candidate=student,
            target_job=job,
            preferences=preferences,
            feedback_list=feedback_list
        )
        ranked_jobs.append({
            **job,
            "match_evaluation": match_eval,
            "composite_score": match_eval["match_percentage"]
        })

    ranked_jobs.sort(
        key=lambda j: (
            not j["match_evaluation"]["is_hidden"],
            j["match_evaluation"]["is_saved"],
            j["composite_score"]
        ),
        reverse=True
    )

    return {"ranked_jobs": ranked_jobs}


@router.get("/roadmap/{student_id}")
def get_upskilling_roadmap(student_id: str, job_id: str = "job-ai-sys"):
    student = StudentRepository.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found for roadmap.")

    all_jobs = LiveJobProvider.get_jobs()
    target_job = next((j for j in all_jobs if j["id"] == job_id), all_jobs[0])
    preferences = PreferenceRepository.get_preferences(student_id)
    progress_data = ProgressTrackerService.get_progress(student_id)
    completed_milestones = progress_data.get("completed_milestones", [])

    match_res = SemanticMatchingEngine.evaluate(student, target_job, preferences)
    missing = match_res.get("missing_skills", [])

    personalized_plan = UpskillingPlannerService.generate_roadmap(
        target_job=target_job,
        missing_skills=missing,
        preferences=preferences,
        completed_weeks=completed_milestones
    )
    return personalized_plan


@router.get("/jobs/live")
def get_live_job_catalogue():
    return {"jobs": LiveJobProvider.get_jobs()}


@router.get("/policy")
def get_university_policy():
    return UniversityPolicyEngine.load_policy()


@router.post("/applications/submit")
def submit_campus_application(payload: ApplicationSubmitRequest):
    student = StudentRepository.get_by_id(payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    eligibility = UniversityPolicyEngine.evaluate_eligibility(
        student_cgpa=student.get("cgpa", 0.0),
        active_apps_count=student.get("active_apps_count", 0),
        job_tier=payload.tier
    )

    if not eligibility["is_eligible"]:
        raise HTTPException(status_code=400, detail="; ".join(eligibility["violations"]))

    StudentRepository.record_application(
        student_id=payload.student_id,
        job_id=payload.job_id,
        job_title=payload.job_title,
        company=payload.company,
        tier=payload.tier
    )

    ProgressTrackerService.log_interview_attempt(
        student_id=payload.student_id,
        skill="Campus Application",
        score=9,
        current_readiness=80
    )

    return {
        "status": "success",
        "message": f"Successfully enrolled in {payload.job_title} recruitment drive.",
        "active_applications": student.get("active_apps_count", 0) + 1
    }


@router.post("/resume/upload-pdf")
async def upload_pdf_resume(
    file: UploadFile = File(...),
    target_job_id: str = Form("job-ai-sys")
):
    start_total = time.time()
    execution_trace = []

    file_bytes = await file.read()
    if len(file_bytes) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds maximum allowed size of 5 MB.")

    t0 = time.time()
    try:
        raw_text = PDFResumeParser.extract_text_from_bytes(file_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))

    t1 = time.time()
    execution_trace.append({
        "step": "Document Ingestion & Binary Extraction",
        "tool": "pypdf.PdfReader",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Extracted {len(raw_text.split())} words from {file.filename}"
    })

    t0 = time.time()
    clean_text, scrub_log = PIIScrubberService.scrub(raw_text)
    t1 = time.time()
    execution_trace.append({
        "step": "PII Privacy Governance Gate",
        "tool": "RegexScrubberEngine",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Sanitized {len(scrub_log)} PII tokens"
    })

    t0 = time.time()
    ai_audit = CareerSyncAIEngine.audit_resume_with_ai(clean_text)
    extracted_skills = ai_audit.get("extracted_skills", ["Python", "Docker"])
    t1 = time.time()
    execution_trace.append({
        "step": "Deep LLM Impact Audit & Skill Extraction",
        "tool": "Groq LPU Engine",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Quality Score: {ai_audit.get('quality_score')}/100"
    })

    t0 = time.time()
    all_jobs = LiveJobProvider.get_jobs()
    target_job = next((j for j in all_jobs if j["id"] == target_job_id), all_jobs[0])

    vec_candidate = CareerSyncAIEngine.get_embedding(f"Skills: {', '.join(extracted_skills)}. {clean_text[:400]}")
    vec_job = CareerSyncAIEngine.get_embedding(f"Title: {target_job['title']}. Skills: {', '.join(target_job['required_skills'])}")
    cosine_sim = CareerSyncAIEngine.compute_cosine_similarity(vec_candidate, vec_job)
    match_percentage = min(99, max(25, int(round(cosine_sim * 100))))
    t1 = time.time()
    execution_trace.append({
        "step": "Vector Embedding & Cosine Matching",
        "tool": "NumPy Cosine Engine",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Cosine similarity: {match_percentage}%"
    })

    t0 = time.time()
    cgpa_match = re.search(r'(?:cgpa|gpa|pointer)[\s:]*([0-9]\.[0-9]{1,2})', raw_text, re.IGNORECASE)
    extracted_cgpa = float(cgpa_match.group(1)) if cgpa_match else 7.8

    new_id = f"stud-{uuid.uuid4().hex[:8]}"
    clean_filename = file.filename or "Candidate_Resume.pdf"
    candidate_name = clean_filename.replace(".pdf", "").replace("_", " ").title()

    candidate_obj = {
        "id": new_id,
        "name": candidate_name,
        "skills": extracted_skills,
        "cgpa": extracted_cgpa,
        "active_apps_count": 0
    }
    match_res = SemanticMatchingEngine.evaluate(candidate_obj, target_job)
    t1 = time.time()
    execution_trace.append({
        "step": "University SOP Constraint Verification",
        "tool": "InstitutionalPolicySolver",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"CGPA: {extracted_cgpa} | Tier-1 Eligible: {match_res['is_eligible']}"
    })

    total_time_ms = round((time.time() - start_total) * 1000, 1)

    skill_coverage = len(match_res["matched_skills"]) / max(1, len(target_job["required_skills"])) * 100
    readiness_score = int(round(
        (0.40 * skill_coverage) +
        (0.25 * 70) +
        (0.20 * 10) +
        (0.15 * ai_audit.get("quality_score", 70))
    ))

    new_student_record = {
        "id": new_id,
        "name": candidate_name,
        "email": f"{candidate_name.lower().replace(' ', '.')}@campus.edu",
        "phone": "[PROTECTED_PHONE]",
        "address": "[PROTECTED_RESIDENCE]",
        "branch": "Engineering Division",
        "cgpa": extracted_cgpa,
        "active_apps_count": 0,
        "sla_hours_pending": 1,
        "admin_status": "Pending",
        "target_role": target_job_id,
        "skills": extracted_skills,
        "raw_resume": clean_text[:400],
        "quality_score": ai_audit.get("quality_score", 75)
    }
    StudentRepository.upsert(new_student_record)

    return {
        "student_id": new_id,
        "candidate_name": candidate_name,
        "cgpa": extracted_cgpa,
        "clean_resume": clean_text,
        "scrub_log": scrub_log,
        "extracted_skills": extracted_skills,
        "quality_audit": ai_audit,
        "matching": match_res,
        "market_radar": MarketRadarService.assess_risk(extracted_skills),
        "readiness": {
            "overall": readiness_score,
            "skill_coverage": int(skill_coverage),
            "interview_performance": 70,
            "milestone_completion": 10,
            "profile_quality": ai_audit.get("quality_score", 70)
        },
        "execution_trace": execution_trace,
        "total_latency_ms": total_time_ms
    }


@router.post("/resume/process")
def process_resume(payload: ResumeParseRequest):
    clean_text, scrub_log = PIIScrubberService.scrub(payload.raw_text)
    ai_audit = CareerSyncAIEngine.audit_resume_with_ai(clean_text)
    extracted_skills = ai_audit.get("extracted_skills", ["Python", "FastAPI"])

    all_jobs = LiveJobProvider.get_jobs()
    target_job = next((j for j in all_jobs if j["id"] == payload.target_job_id), all_jobs[0])

    vec_candidate = CareerSyncAIEngine.get_embedding(f"Skills: {', '.join(extracted_skills)}. {clean_text[:400]}")
    vec_job = CareerSyncAIEngine.get_embedding(f"Title: {target_job['title']}. Skills: {', '.join(target_job['required_skills'])}")
    cosine_sim = CareerSyncAIEngine.compute_cosine_similarity(vec_candidate, vec_job)

    candidate_obj = {
        "id": "cand-manual",
        "name": "Candidate",
        "skills": extracted_skills,
        "cgpa": 7.5,
        "active_apps_count": 1
    }
    match_res = SemanticMatchingEngine.evaluate(candidate_obj, target_job)

    return {
        "clean_resume": clean_text,
        "scrub_log": scrub_log,
        "extracted_skills": extracted_skills,
        "quality_audit": ai_audit,
        "matching": match_res,
        "market_radar": MarketRadarService.assess_risk(extracted_skills)
    }


@router.get("/me/profile")
def get_current_profile(student_id: str = "stud-01"):
    student = StudentRepository.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    return student


@router.get("/ats-preview/{student_id}")
def get_ats_preview(student_id: str):
    student = StudentRepository.get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found for ATS layout.")
    return ResumeAuditorService.format_ats(student)


@router.get("/{student_id}/progress")
def get_student_progress(student_id: str):
    return ProgressTrackerService.get_progress(student_id)


@router.post("/{student_id}/milestones/toggle")
def toggle_milestone_progress(student_id: str, payload: MilestoneToggleRequest):
    return ProgressTrackerService.toggle_milestone(
        student_id=student_id,
        week_number=payload.week_number,
        current_readiness=payload.current_readiness
    )


@router.get("/interview/question")
def fetch_interview_question(skill: str = "RAG Pipelines", difficulty: int = 6):
    clamped_diff = max(1, min(10, difficulty))
    return InterviewAgentService.get_question(skill, clamped_diff)


@router.post("/interview/evaluate")
def evaluate_interview_answer(payload: AnswerSubmitRequest):
    question_obj = InterviewAgentService.get_question(payload.skill, payload.current_difficulty)

    evaluation = CareerSyncAIEngine.evaluate_interview_response_with_ai(
        question_obj=question_obj,
        candidate_answer=payload.answer_text,
        current_difficulty=payload.current_difficulty
    )

    ProgressTrackerService.log_interview_attempt(
        student_id=payload.student_id,
        skill=payload.skill,
        score=evaluation.get("score", 5),
        current_readiness=78
    )

    return evaluation


@router.post("/ingest-url")
def ingest_external_url(payload: UrlIngestRequest):
    validate_public_url(payload.url)

    try:
        with requests.get(
            payload.url,
            timeout=5,
            stream=True,
            headers={"User-Agent": "CareerSync-Agent/2.4"}
        ) as resp:
            resp.raise_for_status()
            content_chunks = []
            bytes_read = 0
            for chunk in resp.iter_content(chunk_size=16384):
                bytes_read += len(chunk)
                if bytes_read > 1024 * 1024:
                    break
                content_chunks.append(chunk)

            raw_html = b"".join(content_chunks).decode("utf-8", errors="ignore")

        soup = BeautifulSoup(raw_html, "html.parser")
        raw_text = " ".join([p.get_text() for p in soup.find_all(["p", "h1", "h2", "li"])])
        ai_parsed = CareerSyncAIEngine.parse_job_link_with_ai(raw_text, payload.url)
        return {
            "status": "success",
            "url": payload.url,
            "ai_parsed": ai_parsed
        }
    except HTTPException:
        raise
    except Exception as e:
        return {
            "status": "fallback",
            "message": str(e),
            "ai_parsed": {
                "title": "Cloud & AI Systems Engineer",
                "company": "External Listing",
                "required_skills": ["Docker", "Kubernetes", "Vector Embeddings"]
            }
        }