import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import init_db
from routes.student_routes import router as student_router
from routes.admin_routes import router as admin_router

load_dotenv()

# Initialize SQLite Database and load initial seeds
init_db()

app = FastAPI(
    title="CareerSync Agent API",
    description="Hybrid Intelligent Placement Readiness & Career Matching Backend",
    version="2.5.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "service": "CareerSync Hybrid Placement Agent",
        "status": "online",
        "database": "SQLite (careersync.db)",
        "policy": "JKLU Placement SOP 2026",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "database": "connected", "policy_engine": "active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)