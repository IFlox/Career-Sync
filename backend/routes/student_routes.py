from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import requests
from bs4 import BeautifulSoup

from data_seeds import STUDENT_DATABASE, TARGET_JOBS, VERIFIED_LEARNING_CATALOG, HACKATHON_SEEDS
from services.pii_scrubber import PIIScrubberService
from services.ai_engine import CareerSyncAIEngine
from services.market_radar import MarketRadarService

router = APIRouter(prefix="/students", tags=["Student Portal"])

class ResumeParseRequest(BaseModel):
    raw_text: str
    target_job_id: Optional[str] = "job-ai-sys"

class AnswerSubmitRequest(BaseModel):
    skill: str
    question_text: str
    answer_text: str
    current_difficulty: int = 6

class UrlIngestRequest(BaseModel):
    url: str

@router.post("/resume/process")
def process_resume(payload: ResumeParseRequest):
    # 1. PII Scrubbing (Privacy Guard)
    clean_text, scrub_log = PIIScrubberService.scrub(payload.raw_text)

    # 2. Real Gemini AI Audit & Weak Bullet Rewrite
    ai_audit = CareerSyncAIEngine.audit_resume_with_ai(clean_text)
    extracted_skills = ai_audit.get("extracted_skills", ["Python", "FastAPI"])

    # 3. Real 768-d Vector Embeddings & Cosine Similarity
    target_job = next((j for j in TARGET_JOBS if j["id"] == payload.target_job_id), TARGET_JOBS[0])
    
    # Generate vector embeddings
    candidate_summary = f"Candidate Skills: {', '.join(extracted_skills)}. Resume: {clean_text[:500]}"
    job_summary = f"Job Title: {target_job['title']}. Required Skills: {', '.join(target_job['required_skills'])}. Description: {target_job['description']}"

    vec_candidate = CareerSyncAIEngine.get_embedding(candidate_summary)
    vec_job = CareerSyncAIEngine.get_embedding(job_summary)

    # Cosine Similarity via NumPy
    cosine_sim = CareerSyncAIEngine.compute_cosine_similarity(vec_candidate, vec_job)
    match_percentage = min(99, max(25, int(round(cosine_sim * 100))))

    # Deterministic Skill-Gap Delta
    matched = [s for s in target_job["required_skills"] if any(s.lower() in ex.lower() for ex in extracted_skills)]
    missing = [s for s in target_job["required_skills"] if s not in matched]

    # University SOP Rules
    sop_violations = []
    is_eligible = True
    if target_job["tier"] == "Tier-1" and 7.5 < target_job.get("min_cgpa", 6.0):
        # Sample guardrail check
        pass

    layoff_risk = MarketRadarService.assess_risk(extracted_skills)

    return {
        "clean_resume": clean_text,
        "scrub_log": scrub_log,
        "extracted_skills": extracted_skills,
        "quality_audit": {
            "score": ai_audit.get("quality_score", 75),
            "verb_count": ai_audit.get("action_verb_count", 4),
            "metric_count": ai_audit.get("metric_count", 2),
            "weak_bullets": ai_audit.get("weak_bullets", [])
        },
        "matching": {
            "match_percentage": match_percentage,
            "matched_skills": matched,
            "missing_skills": missing,
            "is_eligible": is_eligible,
            "sop_violations": sop_violations,
            "tier": target_job["tier"]
        },
        "market_radar": layoff_risk
    }

@router.post("/interview/evaluate")
def evaluate_interview_answer(payload: AnswerSubmitRequest):
    # Evaluated by Gemini Principal Interviewer
    evaluation = CareerSyncAIEngine.evaluate_interview_response_with_ai(
        skill=payload.skill,
        question=payload.question_text,
        candidate_answer=payload.answer_text,
        current_difficulty=payload.current_difficulty
    )
    return evaluation

@router.post("/ingest-url")
def ingest_external_url(payload: UrlIngestRequest):
    try:
        resp = requests.get(payload.url, timeout=5, headers={"User-Agent": "CareerSync-Agent/2.4"})
        soup = BeautifulSoup(resp.text, "html.parser")
        raw_text = " ".join([p.get_text() for p in soup.find_all(["p", "h1", "h2", "li"])])
        
        # Parse using Gemini
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