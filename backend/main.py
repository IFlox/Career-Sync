import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.student_routes import router as student_router
from routes.admin_routes import router as admin_router

load_dotenv()

app = FastAPI(
    title="CareerSync Agent API",
    description="Intelligent Placement Readiness, Market Radar & Career Matching Backend (PS-06)",
    version="2.4.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Parse explicit allowed origins from environment (prevents CORS rejection with allow_credentials)
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(student_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "service": "CareerSync Intelligent Placement Agent",
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "student_portal": "/api/v1/students",
            "admin_portal": "/api/v1/admin"
        }
    }

@app.get("/health")
def health():
    return {"status": "healthy", "pii_guard": "active", "sop_guardrail": "active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)