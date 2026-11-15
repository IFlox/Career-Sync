"""
CareerSync PostgreSQL & SQLite Database Engine
Full implementation supporting Students, Preferences, Applications, Feedback, and Role Readiness.
Includes the reset_workspace() function to clear mutations and restore baseline demo states.

Database selection rules
-----------------------
* ``DATABASE_URL`` unset/blank -> local PostgreSQL
  (``postgresql+psycopg2://postgres:postgres@localhost:5432/careersync``).
  PostgreSQL is required; startup fails clearly if it is unreachable.
* ``DATABASE_URL`` set to a PostgreSQL URL -> that PostgreSQL server is required.
  Unreachable PostgreSQL is never converted into a SQLite fallback.
* ``DATABASE_URL`` set to a URL beginning with ``sqlite://`` -> that SQLite file
  is used explicitly. SQLite is never selected automatically.

SQLite fallback is not enabled anywhere in this module.
"""

import os
import json
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from urllib.parse import quote
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import sessionmaker
from data_seeds import STUDENT_DATABASE as SEED_STUDENTS

load_dotenv()

SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "careersync.db")
DEFAULT_SQLITE_URL = f"sqlite:///{SQLITE_PATH}"
DEFAULT_POSTGRES_URL = (
    "postgresql+psycopg2://postgres:postgres@localhost:5432/careersync"
)
# Kept as an alias for backwards compatibility with older imports.
SQLITE_FALLBACK_URL = DEFAULT_SQLITE_URL


class DatabaseConfigurationError(RuntimeError):
    """Raised when DATABASE_URL cannot be interpreted safely."""


class DatabaseConnectionError(RuntimeError):
    """Raised when the selected database cannot be reached."""


@dataclass(frozen=True)
class DatabaseConfig:
    """Resolved database selection. ``url`` may contain credentials; never log it."""

    url: str
    backend: str
    postgres_configured: bool
    sqlite_fallback_active: bool
    source: str
    sqlite_default_active: bool = False
    sqlite_path: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None


def normalize_database_url(raw_url: str) -> str:
    """Normalize PostgreSQL aliases to the synchronous psycopg2 SQLAlchemy driver."""
    url = raw_url.strip()
    lower = url.lower()
    if lower.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://"):]
    if lower.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def mask_database_url(url: str) -> str:
    """Render a URL without password, query string, or other secret material."""
    try:
        parsed = make_url(url)
    except Exception:
        return "<unparseable database URL>"

    if parsed.get_backend_name() == "sqlite":
        return f"sqlite:///{parsed.database}"

    auth = f"{parsed.username}@" if parsed.username else ""
    host = parsed.host or ""
    port = f":{parsed.port}" if parsed.port else ""
    database = f"/{parsed.database}" if parsed.database else ""
    return f"{parsed.drivername}://{auth}{host}{port}{database}"


def _safe_error_detail(exc: Exception, config: DatabaseConfig) -> str:
    """Remove credentials before surfacing a driver error."""
    detail = str(exc)
    try:
        password = make_url(config.url).password
    except Exception:
        password = None
    if password:
        detail = detail.replace(password, "***")
        detail = detail.replace(quote(password, safe=""), "***")
    detail = detail.replace(config.url, mask_database_url(config.url))
    detail = " ".join(detail.split())
    return detail[:500]


def resolve_database_config(database_url: Optional[str] = None) -> DatabaseConfig:
    """
    Resolve the database selection without opening a connection.

    When ``database_url`` is omitted, ``DATABASE_URL`` is read from the
    environment (loaded from ``backend/.env`` above). An empty or missing
    value selects local PostgreSQL; SQLite is only used when the configured
    URL explicitly begins with ``sqlite://``.
    """
    raw_url = os.getenv("DATABASE_URL") if database_url is None else database_url

    if raw_url is None or not raw_url.strip():
        parsed = make_url(DEFAULT_POSTGRES_URL)
        return DatabaseConfig(
            url=DEFAULT_POSTGRES_URL,
            backend="postgresql",
            postgres_configured=True,
            sqlite_fallback_active=False,
            source="default-postgresql",
            sqlite_default_active=False,
            host=parsed.host or "localhost",
            port=parsed.port or 5432,
            database=parsed.database,
        )

    normalized = normalize_database_url(raw_url)
    try:
        parsed = make_url(normalized)
        backend = parsed.get_backend_name()
    except Exception as exc:
        raise DatabaseConfigurationError(
            "DATABASE_URL is not a valid SQLAlchemy database URL. "
            "Use postgresql://user:password@host:5432/database or sqlite:///path/to/file.db."
        ) from exc

    if backend == "postgresql":
        return DatabaseConfig(
            url=normalized,
            backend="postgresql",
            postgres_configured=True,
            sqlite_fallback_active=False,
            source="DATABASE_URL",
            sqlite_default_active=False,
            host=parsed.host or "localhost",
            port=parsed.port or 5432,
            database=parsed.database,
        )

    # SQLite is opt-in only: it must be an explicit sqlite:// URL.
    if normalized.lower().startswith("sqlite://"):
        if not parsed.database:
            raise DatabaseConfigurationError(
                "DATABASE_URL selects SQLite but does not include a database file path."
            )
        return DatabaseConfig(
            url=normalized,
            backend="sqlite",
            postgres_configured=False,
            sqlite_fallback_active=False,
            source="DATABASE_URL",
            sqlite_default_active=False,
            sqlite_path=parsed.database,
        )

    raise DatabaseConfigurationError(
        f"Unsupported DATABASE_URL scheme '{backend}'. Supported values are "
        "postgresql:// URLs and explicit sqlite:// URLs."
    )


def _ensure_sqlite_directory(config: DatabaseConfig) -> None:
    path = config.sqlite_path
    if not path or path == ":memory:" or path.startswith("file:"):
        return
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)


def create_database_engine(config: DatabaseConfig) -> Engine:
    """Create a SQLAlchemy engine for the resolved configuration."""
    if config.backend == "sqlite":
        _ensure_sqlite_directory(config)
        return create_engine(config.url, connect_args={"check_same_thread": False})

    try:
        return create_engine(config.url, pool_pre_ping=True)
    except ModuleNotFoundError as exc:
        raise DatabaseConfigurationError(
            "DATABASE_URL selects PostgreSQL, but the psycopg2 driver is not installed. "
            "Run 'pip install -r requirements.txt' (psycopg2-binary) and restart the backend."
        ) from exc


def verify_database_connection(db_engine: Engine, config: DatabaseConfig) -> None:
    """
    Fail loudly if the selected database is unreachable.

    PostgreSQL failures are never converted into a SQLite fallback.
    """
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        detail = _safe_error_detail(exc, config)
        if config.backend == "postgresql":
            host = config.host or "localhost"
            port = config.port or 5432
            database = config.database or "careersync"
            raise DatabaseConnectionError(
                "PostgreSQL is configured as the database backend but the server is unreachable. "
                f"PostgreSQL must be running and accepting TCP connections on {host}:{port} "
                f"(database '{database}'). Start the PostgreSQL service, verify the host, port, "
                "username, password, and database name, then restart the backend. "
                "Verify PostgreSQL on Windows with:\n"
                "  Get-Service -Name 'postgresql*'\n"
                f"  Test-NetConnection -ComputerName {host} -Port {port}\n"
                f"  pg_isready -h {host} -p {port} -U postgres\n"
                "The backend will not silently fall back to SQLite while PostgreSQL is the "
                f"selected backend. Driver detail: {detail}"
            ) from exc
        raise DatabaseConnectionError(
            f"Could not open the SQLite database at {config.sqlite_path}. "
            "Check that the parent directory exists and is writable. "
            f"Driver detail: {detail}"
        ) from exc


def connect_database(config: Optional[DatabaseConfig] = None) -> Engine:
    """Create and verify an engine for ``config`` (or the active configuration)."""
    resolved = config or DATABASE_CONFIG
    db_engine = create_database_engine(resolved)
    verify_database_connection(db_engine, resolved)
    return db_engine


def database_status(config: Optional[DatabaseConfig] = None, connection_verified: Optional[bool] = None) -> Dict[str, Any]:
    """Safe diagnostic payload. Never contains passwords or full credential URLs."""
    resolved = config or DATABASE_CONFIG
    verified = _connection_verified if connection_verified is None else connection_verified

    status: Dict[str, Any] = {
        # "database_backend" is the canonical name; "backend" is retained for
        # backward compatibility with earlier diagnostics and health clients.
        "database_backend": resolved.backend,
        "backend": resolved.backend,
        "postgres_configured": resolved.postgres_configured,
        "sqlite_fallback_active": resolved.sqlite_fallback_active,
        "sqlite_default_active": resolved.sqlite_default_active,
        "source": resolved.source,
        "connection_verified": bool(verified),
    }
    if resolved.backend == "sqlite":
        status["sqlite_path"] = resolved.sqlite_path
        status["target"] = resolved.sqlite_path
    else:
        status["host"] = resolved.host
        status["port"] = resolved.port
        status["database"] = resolved.database
        status["target"] = mask_database_url(resolved.url)
    return status


def format_database_status(config: Optional[DatabaseConfig] = None, connection_verified: Optional[bool] = None) -> str:
    """One-line, credential-free diagnostic suitable for logs or health output."""
    status = database_status(config, connection_verified)
    return (
        "[DATABASE] "
        f"backend={status['backend']} "
        f"postgres_configured={str(status['postgres_configured']).lower()} "
        f"sqlite_fallback_active={str(status['sqlite_fallback_active']).lower()} "
        f"sqlite_default_active={str(status['sqlite_default_active']).lower()} "
        f"connection_verified={str(status['connection_verified']).lower()} "
        f"target={status['target']}"
    )


def database_label(config: Optional[DatabaseConfig] = None) -> str:
    """Human-readable backend label without credentials."""
    resolved = config or DATABASE_CONFIG
    if resolved.backend == "sqlite":
        name = os.path.basename(resolved.sqlite_path or "sqlite")
        return f"SQLite ({name})"
    return f"PostgreSQL ({resolved.host}:{resolved.port}/{resolved.database})"


DATABASE_CONFIG = resolve_database_config()
engine = create_database_engine(DATABASE_CONFIG)
IS_POSTGRES = DATABASE_CONFIG.backend == "postgresql"

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
metadata = MetaData()
_connection_verified = False


def init_db(target_engine: Optional[Engine] = None, target_config: Optional[DatabaseConfig] = None):
    """Verify the selected database, create missing tables, and seed demo data."""
    global _connection_verified

    db_engine = target_engine if target_engine is not None else engine
    config = target_config if target_config is not None else DATABASE_CONFIG

    verify_database_connection(db_engine, config)
    if db_engine is engine:
        _connection_verified = True

    print(format_database_status(config, connection_verified=True))
    is_postgres = db_engine.dialect.name == "postgresql"

    with db_engine.begin() as conn:
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
        if is_postgres:
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
        if is_postgres:
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
        if is_postgres:
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
                "target_role": s.get("target_role", ""),
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
                "preferred_roles": json.dumps([
                    role for role in [s.get("target_role"), "Distributed Backend Developer"]
                    if role
                ]),
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
                "target_role": student_data.get("target_role", ""),
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
            if conn.dialect.name == "postgresql":
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