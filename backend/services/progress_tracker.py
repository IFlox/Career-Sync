"""
CareerSync Progress & Readiness Snapshot Engine
Supports append-only event logging, role-specific readiness tracking,
dynamic next-best-action generation, and demo state reset.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy import text


class ProgressTrackerService:
    _events: List[Dict[str, Any]] = []
    _milestone_state: Dict[str, List[int]] = {}
    _readiness_history: Dict[str, List[Dict[str, Any]]] = {}
    _persisted_loaded = set()

    @classmethod
    def _load_persisted_state(cls, student_id: str) -> None:
        if student_id in cls._persisted_loaded:
            return

        from database import engine

        with engine.connect() as conn:
            events = conn.execute(
                text(
                    "SELECT event_type, title, score, created_at FROM progress_events "
                    "WHERE student_id = :student_id ORDER BY id"
                ),
                {"student_id": student_id},
            ).mappings().all()
            milestones = conn.execute(
                text(
                    "SELECT week_number FROM progress_milestones "
                    "WHERE student_id = :student_id ORDER BY week_number"
                ),
                {"student_id": student_id},
            ).scalars().all()
            history = conn.execute(
                text(
                    "SELECT day_label, display_date, readiness FROM readiness_history "
                    "WHERE student_id = :student_id ORDER BY id"
                ),
                {"student_id": student_id},
            ).mappings().all()

        if events:
            cls._events.extend({
                "student_id": student_id,
                "event_type": row["event_type"],
                "title": row["title"],
                "score": row["score"],
                "timestamp": str(row["created_at"]),
            } for row in events)
        if milestones:
            cls._milestone_state[student_id] = list(milestones)
        if history:
            cls._readiness_history.setdefault(student_id, []).extend({
                "day": row["day_label"],
                "date": row["display_date"],
                "readiness": row["readiness"],
            } for row in history)

        cls._persisted_loaded.add(student_id)

    @classmethod
    def _persist_event(cls, event: Dict[str, Any]) -> None:
        from database import engine

        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO progress_events
                (student_id, event_type, title, score)
                VALUES (:student_id, :event_type, :title, :score)
            """), event)

    @classmethod
    def _persist_history(cls, student_id: str, entry: Dict[str, Any]) -> None:
        from database import engine
        import uuid

        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO readiness_history
                (id, student_id, day_label, display_date, readiness)
                VALUES (:id, :student_id, :day_label, :display_date, :readiness)
            """), {
                "id": uuid.uuid4().hex,
                "student_id": student_id,
                "day_label": entry["day"],
                "display_date": entry["date"],
                "readiness": entry["readiness"],
            })

    @classmethod
    def reset_progress_state(cls):
        cls._events = [
            {
                "student_id": "stud-01",
                "event_type": "RESUME_AUDITED",
                "title": "Resume Impact Audit Completed (Score: 88%)",
                "score": 88,
                "timestamp": (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d %H:%M")
            },
            {
                "student_id": "stud-01",
                "event_type": "MILESTONE_COMPLETED",
                "title": "Completed Week 1: Vector Embeddings Masterclass",
                "score": 100,
                "timestamp": (datetime.utcnow() - timedelta(days=4)).strftime("%Y-%m-%d %H:%M")
            },
            {
                "student_id": "stud-01",
                "event_type": "INTERVIEW_ATTEMPT",
                "title": "Mock Technical Interview: RAG Pipelines (Score: 8/10)",
                "score": 8,
                "timestamp": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M")
            },
        ]
        cls._milestone_state = {
            "stud-01": [1],
            "stud-02": [],
            "stud-03": []
        }
        cls._readiness_history = {
            "stud-01": [
                {"day": "Day 1", "date": (datetime.utcnow() - timedelta(days=6)).strftime("%b %d"), "readiness": 52},
                {"day": "Day 2", "date": (datetime.utcnow() - timedelta(days=5)).strftime("%b %d"), "readiness": 58},
                {"day": "Day 3", "date": (datetime.utcnow() - timedelta(days=4)).strftime("%b %d"), "readiness": 65},
                {"day": "Day 4", "date": (datetime.utcnow() - timedelta(days=3)).strftime("%b %d"), "readiness": 68},
                {"day": "Day 5", "date": (datetime.utcnow() - timedelta(days=2)).strftime("%b %d"), "readiness": 74},
                {"day": "Day 6", "date": (datetime.utcnow() - timedelta(days=1)).strftime("%b %d"), "readiness": 79},
                {"day": "Today", "date": datetime.utcnow().strftime("%b %d"), "readiness": 84},
            ],
            "stud-02": [
                {"day": "Day 1", "date": (datetime.utcnow() - timedelta(days=6)).strftime("%b %d"), "readiness": 38},
                {"day": "Day 3", "date": (datetime.utcnow() - timedelta(days=4)).strftime("%b %d"), "readiness": 44},
                {"day": "Today", "date": datetime.utcnow().strftime("%b %d"), "readiness": 58},
            ],
            "stud-03": [
                {"day": "Day 1", "date": (datetime.utcnow() - timedelta(days=6)).strftime("%b %d"), "readiness": 25},
                {"day": "Today", "date": datetime.utcnow().strftime("%b %d"), "readiness": 35},
            ]
        }
        cls._persisted_loaded = set()

    @classmethod
    def get_progress(cls, student_id: str) -> Dict[str, Any]:
        if not cls._events:
            cls.reset_progress_state()
        cls._load_persisted_state(student_id)

        student_events = [e for e in cls._events if e["student_id"] == student_id]
        history = cls._readiness_history.get(student_id, [
            {"day": "Day 1", "date": "Day 1", "readiness": 40},
            {"day": "Today", "date": "Today", "readiness": 60}
        ])
        milestones = cls._milestone_state.get(student_id, [])

        return {
            "student_id": student_id,
            "completed_milestones": milestones,
            "milestone_completion_pct": round((len(milestones) / 4) * 100),
            "trajectory": history,
            "recent_events": student_events[-5:],
            "total_events_count": len(student_events),
            "activity_streak_days": len(history)
        }

    @classmethod
    def toggle_milestone(cls, student_id: str, week_number: int, current_readiness: int) -> Dict[str, Any]:
        if not cls._events:
            cls.reset_progress_state()
        cls._load_persisted_state(student_id)
        if student_id not in cls._milestone_state:
            cls._milestone_state[student_id] = []

        is_completed = week_number in cls._milestone_state[student_id]
        if is_completed:
            cls._milestone_state[student_id].remove(week_number)
            action = "UNCHECKED"
            new_score = max(20, current_readiness - 5)
        else:
            cls._milestone_state[student_id].append(week_number)
            action = "COMPLETED"
            new_score = min(99, current_readiness + 5)

        event = {
            "student_id": student_id,
            "event_type": f"MILESTONE_{action}",
            "title": f"{'Completed' if not is_completed else 'Reopened'} Week {week_number} Milestone",
            "score": new_score,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        cls._events.append(event)
        cls._persist_event(event)

        from database import engine
        with engine.begin() as conn:
            conn.execute(text("""
                DELETE FROM progress_milestones WHERE student_id = :student_id
            """), {"student_id": student_id})
            for completed_week in cls._milestone_state[student_id]:
                conn.execute(text("""
                    INSERT INTO progress_milestones (student_id, week_number)
                    VALUES (:student_id, :week_number)
                """), {"student_id": student_id, "week_number": completed_week})

        if student_id not in cls._readiness_history:
            cls._readiness_history[student_id] = []

        today_str = datetime.utcnow().strftime("%b %d")
        history_entry = {
            "day": f"Step {len(cls._readiness_history[student_id]) + 1}",
            "date": today_str,
            "readiness": new_score
        }
        cls._readiness_history[student_id].append(history_entry)
        cls._persist_history(student_id, history_entry)

        return {
            "status": "success",
            "student_id": student_id,
            "completed_milestones": cls._milestone_state[student_id],
            "new_readiness": new_score,
            "event": event
        }

    @classmethod
    def log_interview_attempt(cls, student_id: str, skill: str, score: int, current_readiness: int) -> None:
        event = {
            "student_id": student_id,
            "event_type": "INTERVIEW_EVALUATION",
            "title": f"Technical Mock Interview: {skill} (Score: {score}/10)",
            "score": score * 10,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        cls._events.append(event)
        cls._persist_event(event)

        delta = 3 if score >= 7 else 1
        new_readiness = min(99, current_readiness + delta)

        if student_id not in cls._readiness_history:
            cls._readiness_history[student_id] = []

        history_entry = {
            "day": f"Step {len(cls._readiness_history[student_id]) + 1}",
            "date": datetime.utcnow().strftime("%b %d"),
            "readiness": new_readiness
        }
        cls._readiness_history[student_id].append(history_entry)
        cls._persist_history(student_id, history_entry)

    @classmethod
    def log_application(cls, student_id: str, job_title: str, company: str) -> None:
        """Records an application without changing interview performance or readiness."""
        event = {
            "student_id": student_id,
            "event_type": "APPLICATION_SUBMITTED",
            "title": f"Applied to {job_title} at {company}",
            "score": None,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        cls._events.append(event)
        cls._persist_event(event)

    @classmethod
    def get_next_best_action(cls, student_id: str, target_role_title: str, missing_skills: List[str], current_readiness: int) -> Dict[str, Any]:
        if not cls._events:
            cls.reset_progress_state()
        cls._load_persisted_state(student_id)
        milestones = cls._milestone_state.get(student_id, [])
        uncompleted_weeks = [w for w in [1, 2, 3, 4] if w not in milestones]

        if uncompleted_weeks:
            next_week = uncompleted_weeks[0]
            next_skill = missing_skills[0] if missing_skills else "System Design"
            target_boost = min(99, current_readiness + 5)
            return {
                "headline": f"Complete Week {next_week} milestone for {next_skill}",
                "description": f"Finishing this practical module will elevate your {target_role_title} readiness from {current_readiness}% to approximately {target_boost}%.",
                "action_type": "STUDY_MILESTONE",
                "target_skill": next_skill,
                "projected_readiness": target_boost
            }

        return {
            "headline": f"Schedule final mock viva for {target_role_title}",
            "description": "All 4 weekly preparation milestones are complete. Take a comprehensive 10-minute technical interview to lock in your readiness score.",
            "action_type": "PRACTICE_INTERVIEW",
            "target_skill": missing_skills[0] if missing_skills else "System Architecture",
            "projected_readiness": min(99, current_readiness + 3)
        }


# Initialize baseline events
ProgressTrackerService.reset_progress_state()