"""
CareerSync PostgreSQL & SQLite Database Engine
Full implementation supporting Students, Preferences, Applications, Feedback, and Role Readiness.
Includes the reset_workspace() function to clear mutations and restore baseline demo states.
"""

import os
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import sessionmaker
from data_seeds import STUDENT_DATABASE as SEED_STUDENTS

load_dotenv()

RAW_DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/careersync")
SQLITE_FALLBACK_URL = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'careersync.db')}"

# Normalize URL driver prefix
if RAW_DB_URL.startswith("postgresql://"):
    RAW_DB_URL = RAW_DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

try:
    engine = create_engine(RAW_DB_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    IS_POSTGRES = True
    print(f"[DATABASE] Connected to PostgreSQL: {RAW_DB_URL.split('@')[-1]}")
except Exception as e:
    print(f"[DATABASE] PostgreSQL offline ({e}). Using local SQLite engine.")
    engine = create_engine(SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False})
    IS_POSTGRES = False

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
metadata = MetaData()


def init_db():
    with engine.begin() as conn:
        # 1. Students Table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS students (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(160) NOT NULL,
            phone VARCHAR(50),
            address VARCHAR(255),
            branch VARCHAR(100),
            cgpa FLOAT,
            active_apps_count INTEGER DEFAULT 0,
            sla_hours_pending INTEGER DEFAULT 0,
            admin_status VARCHAR(50) DEFAULT 'Pending',
            target_role VARCHAR(100),
            skills TEXT,
            raw_resume TEXT,
            quality_score INTEGER DEFAULT 75
        );
        """))

        # 2. Student Preferences Table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS student_preferences (
            student_id VARCHAR(64) PRIMARY KEY,
            preferred_roles TEXT NOT NULL,
            preferred_locations TEXT NOT NULL,
            preferred_industries TEXT NOT NULL,
            target_technologies TEXT NOT NULL,
            min_expected_ctc_lpa FLOAT DEFAULT 6.0,
            learning_style VARCHAR(30) DEFAULT 'PROJECT_BASED',
            available_hours_per_week INTEGER DEFAULT 10,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        # 3. Recommendation Feedback Table
        if IS_POSTGRES:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS recommendation_feedback (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL,
                entity_type VARCHAR(20) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                action VARCHAR(20) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, entity_type, entity_id)
            );
            """))
        else:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS recommendation_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id VARCHAR(64) NOT NULL,
                entity_type VARCHAR(20) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                action VARCHAR(20) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, entity_type, entity_id)
            );
            """))

        # 4. Role-Specific Readiness Snapshots Table
        if IS_POSTGRES:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS role_readiness_snapshots (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL,
                target_role_id VARCHAR(100) NOT NULL,
                readiness_score INTEGER NOT NULL,
                skill_coverage_pct INTEGER NOT NULL,
                interview_score INTEGER NOT NULL,
                milestone_completion_pct INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, target_role_id)
            );
            """))
        else:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS role_readiness_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id VARCHAR(64) NOT NULL,
                target_role_id VARCHAR(100) NOT NULL,
                readiness_score INTEGER NOT NULL,
                skill_coverage_pct INTEGER NOT NULL,
                interview_score INTEGER NOT NULL,
                milestone_completion_pct INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, target_role_id)
            );
            """))

        # 5. Applications Table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS applications (
            id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64) NOT NULL,
            job_id VARCHAR(100) NOT NULL,
            job_title VARCHAR(150) NOT NULL,
            company VARCHAR(150) NOT NULL,
            tier VARCHAR(20) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        # 6. Progress Events Table
        if IS_POSTGRES:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS progress_events (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                title VARCHAR(255) NOT NULL,
                score INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """))

            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS progress_milestones (
                student_id VARCHAR(64) NOT NULL,
                week_number INTEGER NOT NULL,
                PRIMARY KEY (student_id, week_number)
            );
            """))

            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS readiness_history (
                id VARCHAR(64) PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL,
                day_label VARCHAR(50) NOT NULL,
                display_date VARCHAR(50) NOT NULL,
                readiness INTEGER NOT NULL
            );
            """))
            conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_student_job
            ON applications (student_id, job_id);
            """))
        else:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS progress_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id VARCHAR(64) NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                title VARCHAR(255) NOT NULL,
                score INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """))
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS progress_milestones (
                student_id VARCHAR(64) NOT NULL,
                week_number INTEGER NOT NULL,
                PRIMARY KEY (student_id, week_number)
            );
            """))
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS readiness_history (
                id VARCHAR(64) PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL,
                day_label VARCHAR(50) NOT NULL,
                display_date VARCHAR(50) NOT NULL,
                readiness INTEGER NOT NULL
            );
            """))
            conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_student_job
            ON applications (student_id, job_id);
            """))

        # Seed baseline demo profiles if empty
        count = conn.execute(text("SELECT COUNT(*) FROM students")).scalar()
        if count == 0:
            StudentRepository._seed_default_data(conn)


class StudentRepository:
    @staticmethod
    def _seed_default_data(conn):
        for s in SEED_STUDENTS:
            conn.execute(text("""
            INSERT INTO students
            (id, name, email, phone, address, branch, cgpa, active_apps_count, sla_hours_pending, admin_status, target_role, skills, raw_resume, quality_score)
            VALUES
            (:id, :name, :email, :phone, :address, :branch, :cgpa, :active_apps_count, :sla_hours_pending, :admin_status, :target_role, :skills, :raw_resume, :quality_score)
            """), {
                "id": s["id"],
                "name": s["name"],
                "email": s["email"],
                "phone": s.get("phone", "[PROTECTED_PHONE]"),
                "address": s.get("address", "[PROTECTED_RESIDENCE]"),
                "branch": s["branch"],
                "cgpa": float(s["cgpa"]),
                "active_apps_count": s.get("active_apps_count", 0),
                "sla_hours_pending": s.get("sla_hours_pending", 0),
                "admin_status": s.get("admin_status", "Pending"),
                "target_role": s.get("target_role", "job-ai-sys"),
                "skills": json.dumps(s.get("skills", [])),
                "raw_resume": s.get("raw_resume", ""),
                "quality_score": s.get("quality_score", 75)
            })

            conn.execute(text("""
            INSERT INTO student_preferences
            (student_id, preferred_roles, preferred_locations, preferred_industries, target_technologies, min_expected_ctc_lpa, learning_style, available_hours_per_week)
            VALUES
            (:student_id, :preferred_roles, :preferred_locations, :preferred_industries, :target_technologies, :min_expected_ctc_lpa, :learning_style, :available_hours_per_week)
            """), {
                "student_id": s["id"],
                "preferred_roles": json.dumps([s.get("target_role", "job-ai-sys"), "Distributed Backend Developer"]),
                "preferred_locations": json.dumps(["Bangalore", "Pune", "Remote"]),
                "preferred_industries": json.dumps(["Enterprise AI", "FinTech", "SaaS"]),
                "target_technologies": json.dumps(s.get("skills", [])[:4] or ["Python", "Docker"]),
                "min_expected_ctc_lpa": 8.0 if s["cgpa"] >= 7.5 else 5.5,
                "learning_style": "PROJECT_BASED",
                "available_hours_per_week": 10
            })

    @staticmethod
    def reset_workspace() -> Dict[str, Any]:
        """
        Pushes the workspace back to pristine demo state.
        Purges uploaded candidate records, transient applications, and logs,
        and re-seeds Priya, Rahul, and Amit.
        """
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM applications"))
            conn.execute(text("DELETE FROM recommendation_feedback"))
            conn.execute(text("DELETE FROM progress_events"))
            conn.execute(text("DELETE FROM progress_milestones"))
            conn.execute(text("DELETE FROM readiness_history"))
            conn.execute(text("DELETE FROM role_readiness_snapshots"))
            conn.execute(text("DELETE FROM student_preferences"))
            conn.execute(text("DELETE FROM students"))
            StudentRepository._seed_default_data(conn)

        from services.progress_tracker import ProgressTrackerService
        ProgressTrackerService.reset_progress_state()

        return {
            "status": "success",
            "message": "Demo workspace successfully reset to baseline seed state.",
            "seeded_candidates": ["stud-01", "stud-02", "stud-03"]
        }

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM students ORDER BY cgpa DESC")).mappings().all()
            results = []
            for r in rows:
                d = dict(r)
                if isinstance(d.get("skills"), str):
                    try:
                        d["skills"] = json.loads(d["skills"])
                    except Exception:
                        d["skills"] = []
                d["qualityScore"] = d.get("quality_score", 75)
                d["adminStatus"] = d.get("admin_status", "Pending")
                results.append(d)
            return results

    @staticmethod
    def get_by_id(student_id: str) -> Optional[Dict[str, Any]]:
        with engine.connect() as conn:
            row = conn.execute(text("SELECT * FROM students WHERE id = :id"), {"id": student_id}).mappings().first()
            if not row:
                return None
            d = dict(row)
            if isinstance(d.get("skills"), str):
                try:
                    d["skills"] = json.loads(d["skills"])
                except Exception:
                    d["skills"] = []
            d["qualityScore"] = d.get("quality_score", 75)
            d["adminStatus"] = d.get("admin_status", "Pending")
            return d

    @staticmethod
    def upsert(student_data: Dict[str, Any]):
        skills_str = json.dumps(student_data.get("skills", []))
        with engine.begin() as conn:
            exists = conn.execute(text("SELECT id FROM students WHERE id = :id"), {"id": student_data["id"]}).scalar()
            params = {
                "id": student_data["id"],
                "name": student_data["name"],
                "email": student_data.get("email", ""),
                "phone": student_data.get("phone", "[PROTECTED_PHONE]"),
                "address": student_data.get("address", "[PROTECTED_RESIDENCE]"),
                "branch": student_data.get("branch", "Engineering Division"),
                "cgpa": float(student_data.get("cgpa", 7.5)),
                "active_apps_count": student_data.get("active_apps_count", 0),
                "sla_hours_pending": student_data.get("sla_hours_pending", 1),
                "admin_status": student_data.get("admin_status", "Pending"),
                "target_role": student_data.get("target_role", "job-ai-sys"),
                "skills": skills_str,
                "raw_resume": student_data.get("raw_resume", ""),
                "quality_score": student_data.get("quality_score", 75)
            }
            if exists:
                conn.execute(text("""
                UPDATE students SET
                    name = :name, email = :email, branch = :branch, cgpa = :cgpa,
                    skills = :skills, raw_resume = :raw_resume, quality_score = :quality_score
                WHERE id = :id
                """), params)
            else:
                conn.execute(text("""
                INSERT INTO students 
                (id, name, email, phone, address, branch, cgpa, active_apps_count, sla_hours_pending, admin_status, target_role, skills, raw_resume, quality_score)
                VALUES 
                (:id, :name, :email, :phone, :address, :branch, :cgpa, :active_apps_count, :sla_hours_pending, :admin_status, :target_role, :skills, :raw_resume, :quality_score)
                """), params)

    @staticmethod
    def update_status(student_id: str, new_status: str):
        with engine.begin() as conn:
            conn.execute(text("UPDATE students SET admin_status = :status WHERE id = :id"), {"status": new_status, "id": student_id})

    @staticmethod
    def record_application(student_id: str, job_id: str, job_title: str, company: str, tier: str):
        app_id = f"app-{uuid.uuid4().hex[:12]}"
        with engine.begin() as conn:
            updated = conn.execute(text("""
                UPDATE students
                SET active_apps_count = active_apps_count + 1
                WHERE id = :student_id AND active_apps_count < 3
            """), {"student_id": student_id})
            if updated.rowcount != 1:
                raise ValueError("Application cap reached or student profile is unavailable.")

            existing = conn.execute(text("""
                SELECT 1 FROM applications
                WHERE student_id = :student_id AND job_id = :job_id
            """), {"student_id": student_id, "job_id": job_id}).scalar()
            if existing:
                raise ValueError("An application for this job already exists.")

            conn.execute(text("""
            INSERT INTO applications (id, student_id, job_id, job_title, company, tier)
            VALUES (:id, :student_id, :job_id, :job_title, :company, :tier)
            """), {
                "id": app_id, "student_id": student_id, "job_id": job_id,
                "job_title": job_title, "company": company, "tier": tier
            })


class PreferenceRepository:
    @staticmethod
    def get_preferences(student_id: str) -> Dict[str, Any]:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM student_preferences WHERE student_id = :id"),
                {"id": student_id}
            ).mappings().first()

            if not row:
                return {
                    "student_id": student_id,
                    "preferred_roles": ["AI Systems & RAG Engineer", "Distributed Backend Developer"],
                    "preferred_locations": ["Bangalore", "Pune", "Remote"],
                    "preferred_industries": ["Enterprise AI", "FinTech", "SaaS"],
                    "target_technologies": ["Python", "FastAPI", "Docker", "PostgreSQL"],
                    "min_expected_ctc_lpa": 6.5,
                    "learning_style": "PROJECT_BASED",
                    "available_hours_per_week": 10
                }

            d = dict(row)
            for k in ["preferred_roles", "preferred_locations", "preferred_industries", "target_technologies"]:
                if isinstance(d.get(k), str):
                    try:
                        d[k] = json.loads(d[k])
                    except Exception:
                        d[k] = []
            return d

    @staticmethod
    def upsert_preferences(student_id: str, data: Dict[str, Any]):
        with engine.begin() as conn:
            params = {
                "student_id": student_id,
                "preferred_roles": json.dumps(data.get("preferred_roles", [])),
                "preferred_locations": json.dumps(data.get("preferred_locations", [])),
                "preferred_industries": json.dumps(data.get("preferred_industries", [])),
                "target_technologies": json.dumps(data.get("target_technologies", [])),
                "min_expected_ctc_lpa": float(data.get("min_expected_ctc_lpa", 6.0)),
                "learning_style": data.get("learning_style", "PROJECT_BASED"),
                "available_hours_per_week": int(data.get("available_hours_per_week", 10))
            }
            exists = conn.execute(text("SELECT student_id FROM student_preferences WHERE student_id = :student_id"), {"student_id": student_id}).scalar()
            if exists:
                conn.execute(text("""
                UPDATE student_preferences SET
                    preferred_roles = :preferred_roles,
                    preferred_locations = :preferred_locations,
                    preferred_industries = :preferred_industries,
                    target_technologies = :target_technologies,
                    min_expected_ctc_lpa = :min_expected_ctc_lpa,
                    learning_style = :learning_style,
                    available_hours_per_week = :available_hours_per_week,
                    updated_at = CURRENT_TIMESTAMP
                WHERE student_id = :student_id
                """), params)
            else:
                conn.execute(text("""
                INSERT INTO student_preferences 
                (student_id, preferred_roles, preferred_locations, preferred_industries, target_technologies, min_expected_ctc_lpa, learning_style, available_hours_per_week)
                VALUES 
                (:student_id, :preferred_roles, :preferred_locations, :preferred_industries, :target_technologies, :min_expected_ctc_lpa, :learning_style, :available_hours_per_week)
                """), params)

    @staticmethod
    def save_feedback(student_id: str, entity_type: str, entity_id: str, action: str, reason: Optional[str] = None):
        with engine.begin() as conn:
            if IS_POSTGRES:
                conn.execute(text("""
                INSERT INTO recommendation_feedback (student_id, entity_type, entity_id, action, reason)
                VALUES (:student_id, :entity_type, :entity_id, :action, :reason)
                ON CONFLICT (student_id, entity_type, entity_id)
                DO UPDATE SET action = :action, reason = :reason, created_at = CURRENT_TIMESTAMP
                """), {
                    "student_id": student_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action": action,
                    "reason": reason or ""
                })
            else:
                conn.execute(text("""
                INSERT OR REPLACE INTO recommendation_feedback (student_id, entity_type, entity_id, action, reason)
                VALUES (:student_id, :entity_type, :entity_id, :action, :reason)
                """), {
                    "student_id": student_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action": action,
                    "reason": reason or ""
                })

    @staticmethod
    def get_feedback(student_id: str) -> List[Dict[str, Any]]:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM recommendation_feedback WHERE student_id = :id ORDER BY created_at DESC"),
                {"id": student_id}
            ).mappings().all()
            return [dict(r) for r in rows]