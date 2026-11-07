import io
import csv
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from data_seeds import STUDENT_DATABASE

router = APIRouter(prefix="/admin", tags=["Placement Cell (TPO)"])

class LoginRequest(BaseModel):
    pin: str

class StatusUpdateRequest(BaseModel):
    student_id: str
    new_status: str

def verify_tpo_token(x_admin_pin: str = Header(None)):
    if x_admin_pin != "tpo_secure_2026":
        raise HTTPException(status_code=403, detail="Invalid Security PIN. Access denied.")
    return True

# Backend password verification
@router.post("/auth/verify")
def verify_admin_pin(payload: LoginRequest):
    if payload.pin == "tpo_secure_2026":
        return {"status": "authorized", "token": "tpo_token_valid"}
    raise HTTPException(status_code=401, detail="Incorrect admin password.")

@router.get("/analytics/overview")
def get_cohort_overview(authorized: bool = Depends(verify_tpo_token)):
    total = len(STUDENT_DATABASE)
    avg_score = round(sum(s["quality_score"] for s in STUDENT_DATABASE) / max(1, total))
    high_risk_count = sum(1 for s in STUDENT_DATABASE if s["cgpa"] < 6.0 or s["quality_score"] < 45)
    approved_count = sum(1 for s in STUDENT_DATABASE if s["admin_status"] == "Approved")
    sla_escalated = sum(1 for s in STUDENT_DATABASE if s["sla_hours_pending"] > 48)

    return {
        "cohort_size": total,
        "average_quality_score": avg_score,
        "high_risk_count": high_risk_count,
        "approved_count": approved_count,
        "sla_escalations_count": sla_escalated,
        "batch_missing_skills": [
            {"skill": "Docker & Containers", "missing_percentage": 67},
            {"skill": "System Design", "missing_percentage": 54},
            {"skill": "RAG Pipelines", "missing_percentage": 48},
            {"skill": "Kubernetes", "missing_percentage": 40}
        ]
    }

@router.get("/matrix")
def get_verification_matrix(authorized: bool = Depends(verify_tpo_token)):
    return {
        "students": STUDENT_DATABASE
    }

@router.patch("/matrix/status")
def update_student_status(payload: StatusUpdateRequest, authorized: bool = Depends(verify_tpo_token)):
    student = next((s for s in STUDENT_DATABASE if s["id"] == payload.student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student ID not found")
    student["admin_status"] = payload.new_status
    return {
        "status": "updated",
        "student_id": payload.student_id,
        "new_status": payload.new_status
    }

@router.get("/export/csv")
def export_verified_csv(authorized: bool = Depends(verify_tpo_token)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Name", "Branch", "CGPA", "Impact Score", "Top Skills", "TPO Status"])

    for s in STUDENT_DATABASE:
        if s["admin_status"] == "Approved":
            writer.writerow([
                s["id"],
                s["name"],
                s["branch"],
                s["cgpa"],
                s["quality_score"],
                ", ".join(s["skills"]),
                s["admin_status"]
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=CareerSync_Verified_Batch.csv"}
    )