"""
CareerSync Progress & Readiness Snapshot Engine (Phase 5)
Supports append-only event logging, role-specific readiness tracking,
and dynamic next-best-action generation.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List


class ProgressTrackerService:
    _events: List[Dict[str, Any]] = [
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

    _milestone_state: Dict[str, List[int]] = {
        "stud-01": [1],
        "stud-02": [],
        "stud-03": []
    }

    _readiness_history: Dict[str, List[Dict[str, Any]]] = {
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

    @classmethod
    def get_progress(cls, student_id: str) -> Dict[str, Any]:
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

        if student_id not in cls._readiness_history:
            cls._readiness_history[student_id] = []

        today_str = datetime.utcnow().strftime("%b %d")
        cls._readiness_history[student_id].append({
            "day": f"Step {len(cls._readiness_history[student_id]) + 1}",
            "date": today_str,
            "readiness": new_score
        })

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

        delta = 3 if score >= 7 else 1
        new_readiness = min(99, current_readiness + delta)

        if student_id not in cls._readiness_history:
            cls._readiness_history[student_id] = []

        cls._readiness_history[student_id].append({
            "day": f"Step {len(cls._readiness_history[student_id]) + 1}",
            "date": datetime.utcnow().strftime("%b %d"),
            "readiness": new_readiness
        })

    # Phase 5: Closed-Loop Next Best Action Synthesis
    @classmethod
    def get_next_best_action(cls, student_id: str, target_role_title: str, missing_skills: List[str], current_readiness: int) -> Dict[str, Any]:
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