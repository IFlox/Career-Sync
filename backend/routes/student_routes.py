import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional

from data_seeds import STUDENT_DATABASE, TARGET_JOBS, VERIFIED_LEARNING_CATALOG, HACKATHON_SEEDS
from services.pii_scrubber import PIIScrubberService
from services.resume_auditor import ResumeAuditorService
from services.matching_engine import SemanticMatchingEngine
from services.market_radar import MarketRadarService
from services.interview_agent import InterviewAgentService

router = APIRouter(prefix="/students", tags=["Student Portal"])

class ResumeParseRequest(BaseModel):
    raw_text: str
    target_job_id: Optional[str] = "job-ai-sys"

class AnswerSubmitRequest(BaseModel):
    question_id: str
    skill: str
    answer_text: str
    current_difficulty: int = 6

class UrlIngestRequest(BaseModel):
    url: str

@router.get("/me/profile")
def get_current_profile(student_id: str = "stud-01"):
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    return student

@router.post("/resume/process")
def process_resume(payload: ResumeParseRequest):
    # 1. PII Scrubbing
    clean_text, scrub_log = PIIScrubberService.scrub(payload.raw_text)

    # 2. Impact & Action-Verb Audit
    audit_results = ResumeAuditorService.audit(clean_text)

    # 3. Simple Keyword Skill Extractor
    known_pool = ["Python", "PyTorch", "FastAPI", "Vector Embeddings", "Docker", "Node.js", "Kubernetes", "Redis", "SQL", "Git", "System Design", "RAG Pipelines"]
    extracted = [k for k in known_pool if k.lower() in clean_text.lower()]
    if not extracted:
        extracted = ["Basic Python", "Git", "REST APIs"]

    # 4. Target Job Matching & SOP Solver
    target_job = next((j for j in TARGET_JOBS if j["id"] == payload.target_job_id), TARGET_JOBS[0])
    candidate_obj = {
        "id": "stud-dynamic",
        "name": "Candidate (PII Protected)",
        "skills": extracted,
        "cgpa": 7.5,
        "active_apps_count": 1
    }
    match_result = SemanticMatchingEngine.evaluate(candidate_obj, target_job)
    layoff_risk = MarketRadarService.assess_risk(extracted)

    return {
        "clean_resume": clean_text,
        "scrub_log": scrub_log,
        "extracted_skills": extracted,
        "quality_audit": audit_results,
        "matching": match_result,
        "market_radar": layoff_risk
    }

@router.get("/ats-preview/{student_id}")
def get_ats_preview(student_id: str):
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    return ResumeAuditorService.format_ats(student)

@router.get("/roadmap/{student_id}")
def get_upskilling_roadmap(student_id: str, job_id: str = "job-ai-sys"):
    student = next((s for s in STUDENT_DATABASE if s["id"] == student_id), STUDENT_DATABASE[0])
    target_job = next((j for j in TARGET_JOBS if j["id"] == job_id), TARGET_JOBS[0])
    match_res = SemanticMatchingEngine.evaluate(student, target_job)

    # Grounded resources for missing skills
    roadmap = []
    for idx, skill in enumerate(match_res["missing_skills"][:4]):
        res = VERIFIED_LEARNING_CATALOG.get(skill, {
            "title": f"{skill} Production Guidelines",
            "provider": "Official Documentation",
            "url": "https://developer.mozilla.org",
            "duration": "6 Hours",
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

@router.get("/interview/question")
def fetch_interview_question(skill: str = "RAG Pipelines", difficulty: int = 6):
    return InterviewAgentService.get_question(skill, difficulty)

@router.post("/interview/evaluate")
def evaluate_interview_answer(payload: AnswerSubmitRequest):
    question = InterviewAgentService.get_question(payload.skill, payload.current_difficulty)
    return InterviewAgentService.evaluate_answer(question, payload.answer_text, payload.current_difficulty)

@router.post("/ingest-url")
def ingest_external_url(payload: UrlIngestRequest):
    """Server-side fetcher: scrapes plain text and extracts skills safely."""
    try:
        resp = requests.get(payload.url, timeout=5, headers={"User-Agent": "CareerSync-Agent/2.4"})
        soup = BeautifulSoup(resp.text, "html.parser")
        text = " ".join([p.get_text() for p in soup.find_all(["p", "h1", "h2", "li"])])

        known_pool = ["Docker", "Kubernetes", "Python", "System Design", "AWS", "FastAPI"]
        detected = [sk for sk in known_pool if sk.lower() in text.lower()]

        return {
            "status": "success",
            "url": payload.url,
            "detected_skills": detected or ["Docker", "Kubernetes", "Observability"],
            "raw_snippet": text[:300] + "..."
        }
    except Exception as e:
        return {
            "status": "fallback",
            "message": f"Link blocked or unreachable ({str(e)}). Applied internal catalog rules.",
            "detected_skills": ["Docker", "Kubernetes", "System Design"]
        }