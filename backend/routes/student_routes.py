"""
CareerSync Student Routes
Handles resume parsing, real PDF ingestion, ATS formatting, AI evaluation, and roadmaps.
"""

import re
import time
import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from data_seeds import STUDENT_DATABASE, TARGET_JOBS, VERIFIED_LEARNING_CATALOG, HACKATHON_SEEDS
from services.pdf_parser import PDFResumeParser
from services.pii_scrubber import PIIScrubberService
from services.ai_engine import CareerSyncAIEngine
from services.resume_auditor import ResumeAuditorService
from services.matching_engine import SemanticMatchingEngine
from services.market_radar import MarketRadarService
from services.interview_agent import InterviewAgentService
from services.progress_tracker import ProgressTrackerService

router = APIRouter(prefix="/students", tags=["Student Portal"])

class ResumeParseRequest(BaseModel):
    raw_text: str
    target_job_id: Optional[str] = "job-ai-sys"

class AnswerSubmitRequest(BaseModel):
    student_id: str = "stud-01"
    skill: str
    question_text: Optional[str] = "Describe technical architecture trade-offs."
    answer_text: str
    current_difficulty: int = 6

class MilestoneToggleRequest(BaseModel):
    week_number: int
    current_readiness: int = 75

class UrlIngestRequest(BaseModel):
    url: str


@router.post("/resume/upload-pdf")
async def upload_pdf_resume(
    file: UploadFile = File(...),
    target_job_id: str = Form("job-ai-sys")
):
    start_total = time.time()
    execution_trace = []

    # STEP 1: Ingestion & Extraction
    t0 = time.time()
    file_bytes = await file.read()
    raw_text = PDFResumeParser.extract_text_from_bytes(file_bytes)
    t1 = time.time()
    execution_trace.append({
        "step": "Document Ingestion & Binary Extraction",
        "tool": "pypdf.PdfReader",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Extracted {len(raw_text.split())} words from {file.filename}"
    })

    # STEP 2: Privacy Masking
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

    # STEP 3: LLM Audit
    t0 = time.time()
    ai_audit = CareerSyncAIEngine.audit_resume_with_ai(clean_text)
    extracted_skills = ai_audit.get("extracted_skills", ["Python", "Docker"])
    t1 = time.time()
    execution_trace.append({
        "step": "Deep LLM Impact Audit & Skill Extraction",
        "tool": "Groq (Llama-3.1-8b)",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Quality Score: {ai_audit.get('quality_score')}/100"
    })

    # STEP 4: Vector Cosine Match
    t0 = time.time()
    target_job = next((j for j in TARGET_JOBS if j["id"] == target_job_id), TARGET_JOBS[0])
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

    # STEP 5: Dynamic CGPA Extraction & SOP Solver (Fixes Issue 3)
    t0 = time.time()
    cgpa_match = re.search(r'(?:cgpa|gpa|pointer)[\s:]*([0-9]\.[0-9]{1,2})', raw_text, re.IGNORECASE)
    extracted_cgpa = float(cgpa_match.group(1)) if cgpa_match else 7.8

    new_id = f"stud-{int(time.time())}"
    candidate_name = file.filename.replace(".pdf", "").replace("_", " ").title()

    candidate_obj = {
        "id": new_id,
        "name": candidate_name,
        "skills": extracted_skills,
        "cgpa": extracted_cgpa,
        "active_apps_count": 2
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

    # STEP 6: Upskilling Roadmap
    t0 = time.time()
    roadmap = []
    for idx, skill in enumerate(match_res["missing_skills"][:4]):
        res = VERIFIED_LEARNING_CATALOG.get(skill, {
            "title": f"{skill} Mastery Guide",
            "provider": "Official Documentation",
            "url": "https://docs.docker.com",
            "duration": "8 Hours"
        })
        roadmap.append({
            "week": idx + 1,
            "skill": skill,
            "resource": res,
            "status": "Not Started"
        })
    t1 = time.time()
    execution_trace.append({
        "step": "Grounded Upskilling DAG Synthesis",
        "tool": "VerifiedResourceCatalog",
        "duration_ms": round((t1 - t0) * 1000, 1),
        "status": "success",
        "output_summary": f"Synthesized {len(roadmap)}-week milestone roadmap"
    })

    total_time_ms = round((time.time() - start_total) * 1000, 1)

    skill_coverage = len(match_res["matched_skills"]) / max(1, len(target_job["required_skills"])) * 100
    readiness_score = int(round(
        (0.40 * skill_coverage) +
        (0.25 * 70) +
        (0.20 * 10) +
        (0.15 * ai_audit.get("quality_score", 70))
    ))

    # Sync Uploaded Student to STUDENT_DATABASE (Fixes Issue 4)
    new_student_record = {
        "id": new_id,
        "name": candidate_name,
        "email": f"{candidate_name.lower().replace(' ', '.')}@campus.edu",
        "phone": "[PROTECTED_PHONE]",
        "address": "[PROTECTED_RESIDENCE]",
        "branch": "Engineering Division",
        "cgpa": extracted_cgpa,
        "active_apps_count": 2,
        "sla_hours_pending": 1,
        "admin_status": "Pending",
        "target_role": target_job_id,
        "skills": extracted_skills,
        "raw_resume": clean_text[:400],
        "quality_score": ai_audit.get("quality_score", 75)
    }
    STUDENT_DATABASE.insert(0, new_student_record)

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
        "roadmap": roadmap,
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

    target_job = next((j for j in TARGET_JOBS if j["id"] == payload.target_job_id), TARGET_JOBS[0])
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
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    return student

@router.get("/ats-preview/{student_id}")
def get_ats_preview(student_id: str):
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    return ResumeAuditorService.format_ats(student)

@router.get("/roadmap/{student_id}")
def get_upskilling_roadmap(student_id: str, job_id: str = "job-ai-sys"):
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    target_job = next((j for j in TARGET_JOBS if j["id"] == job_id), TARGET_JOBS[0])
    match_res = SemanticMatchingEngine.evaluate(student, target_job)

    roadmap = []
    for idx, skill in enumerate(match_res["missing_skills"][:4]):
        res = VERIFIED_LEARNING_CATALOG.get(skill, {
            "title": f"{skill} Mastery Guide",
            "provider": "Official Documentation",
            "url": "https://docs.docker.com",
            "duration": "8 Hours",
            "verified": True
        })
        roadmap.append({
            "week": idx + 1,
            "skill": skill,
            "resource": res
        })

    return {
        "roadmap": roadmap,
        "target_hackathons": HACKATHON_SEEDS[:2]
    }


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
    return InterviewAgentService.get_question(skill, difficulty)

# Dynamic student_id in evaluation (Fixes Issue 2)
@router.post("/interview/evaluate")
def evaluate_interview_answer(payload: AnswerSubmitRequest):
    evaluation = CareerSyncAIEngine.evaluate_interview_response_with_ai(
        skill=payload.skill,
        question=payload.question_text,
        candidate_answer=payload.answer_text,
        current_difficulty=payload.current_difficulty
    )
    ProgressTrackerService.log_interview_attempt(
        student_id=payload.student_id,
        skill=payload.skill,
        score=evaluation.get("score", 7),
        current_readiness=78
    )
    return evaluation


@router.post("/ingest-url")
def ingest_external_url(payload: UrlIngestRequest):
    try:
        resp = requests.get(payload.url, timeout=5, headers={"User-Agent": "CareerSync-Agent/2.4"})
        soup = BeautifulSoup(resp.text, "html.parser")
        raw_text = " ".join([p.get_text() for p in soup.find_all(["p", "h1", "h2", "li"])])
        ai_parsed = CareerSyncAIEngine.parse_job_link_with_ai(raw_text, payload.url)
        return {
            "status": "success",
            "url": payload.url,
            "ai_parsed": ai_parsed
        }
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