import os
import io
import csv
import jwt
from datetime import datetime, timedelta
from typing import Literal, Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from data_seeds import STUDENT_DATABASE

load_dotenv()

router = APIRouter(prefix="/admin", tags=["Placement Cell (TPO)"])

SECRET_KEY = os.getenv("SECRET_KEY", "careersync_default_secret_jwt_key_2026")
ADMIN_PIN = os.getenv("ADMIN_PIN", "tpo_secure_2026")
JWT_ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    pin: str

class StatusUpdateRequest(BaseModel):
    student_id: str
    new_status: Literal["Approved", "Revision Required", "Pending"]


def create_admin_token() -> str:
    payload = {
        "sub": "tpo_admin",
        "role": "ADMIN",
        "exp": datetime.utcnow() + timedelta(hours=12)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_tpo_token(
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
    x_admin_pin: Optional[str] = Header(None)
):
    """
    Validates either:
    1. Signed JWT Bearer token in 'Authorization: Bearer <token>'
    2. Signed JWT in 'x-admin-token'
    3. Direct matching PIN in 'x-admin-pin' (dev fallback)
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif x_admin_token:
        token = x_admin_token

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
            if payload.get("role") == "ADMIN":
                return True
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired admin session token.")

    # Direct PIN match fallback
    if x_admin_pin and x_admin_pin == ADMIN_PIN:
        return True

    raise HTTPException(status_code=401, detail="Unauthorized: Valid admin authentication token is required.")


@router.post("/auth/verify")
def verify_admin_pin(payload: LoginRequest):
    if payload.pin == ADMIN_PIN:
        token = create_admin_token()
        return {
            "status": "authorized",
            "token": token,
            "token_type": "bearer"
        }
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
        raise HTTPException(status_code=404, detail="Student ID not found in database.")
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