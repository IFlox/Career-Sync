"""
Tests for the admin cohort intent analytics endpoint.

Student and preference storage is mocked so the endpoint is exercised with
explicit live data and with genuinely empty data.
"""

import unittest
from unittest.mock import patch

from database import PreferenceRepository, StudentRepository
from routes.admin_routes import get_cohort_intent_analytics


def student(student_id):
    return {
        "id": student_id,
        "name": f"Student {student_id}",
        "cgpa": 8.0,
        "quality_score": 75,
        "admin_status": "Pending",
    }


class CohortIntentAnalyticsTests(unittest.TestCase):
    def test_real_preferences_produce_calculated_percentages(self):
        students = [student("stud-01"), student("stud-02"), student("stud-03")]
        preferences = {
            "stud-01": {
                "preferred_roles": ["AI Systems Engineer"],
                "preferred_locations": ["Bangalore"],
            },
            "stud-02": {
                "preferred_roles": ["AI Systems Engineer"],
                "preferred_locations": ["Remote"],
            },
            "stud-03": {
                "preferred_roles": ["Backend Developer"],
                "preferred_locations": ["Bangalore"],
            },
        }

        with patch.object(
            StudentRepository, "get_all", return_value=students
        ), patch.object(
            PreferenceRepository,
            "get_preferences",
            side_effect=lambda student_id: preferences[student_id],
        ):
            result = get_cohort_intent_analytics(authorized=True)

        self.assertEqual(result["cohort_size"], 3)
        self.assertEqual(
            result["top_desired_roles"],
            [
                {"role": "AI Systems Engineer", "student_count": 2, "percentage": 67},
                {"role": "Backend Developer", "student_count": 1, "percentage": 33},
            ],
        )
        self.assertEqual(
            result["top_desired_locations"],
            [
                {"location": "Bangalore", "student_count": 2, "percentage": 67},
                {"location": "Remote", "student_count": 1, "percentage": 33},
            ],
        )

    def test_empty_preferences_return_empty_arrays(self):
        students = [student("stud-01"), student("stud-02")]

        with patch.object(
            StudentRepository, "get_all", return_value=students
        ), patch.object(
            PreferenceRepository,
            "get_preferences",
            return_value={"preferred_roles": [], "preferred_locations": []},
        ):
            result = get_cohort_intent_analytics(authorized=True)

        self.assertEqual(result["cohort_size"], 2)
        self.assertEqual(result["top_desired_roles"], [])
        self.assertEqual(result["top_desired_locations"], [])

    def test_no_students_return_empty_arrays(self):
        with patch.object(
            StudentRepository, "get_all", return_value=[]
        ), patch.object(PreferenceRepository, "get_preferences") as get_preferences:
            result = get_cohort_intent_analytics(authorized=True)

        self.assertEqual(result["cohort_size"], 0)
        self.assertEqual(result["top_desired_roles"], [])
        self.assertEqual(result["top_desired_locations"], [])
        get_preferences.assert_not_called()

    def test_response_shape_is_preserved(self):
        with patch.object(
            StudentRepository, "get_all", return_value=[]
        ), patch.object(PreferenceRepository, "get_preferences", return_value={}):
            result = get_cohort_intent_analytics(authorized=True)

        self.assertEqual(
            set(result.keys()),
            {"cohort_size", "top_desired_roles", "top_desired_locations"},
        )


if __name__ == "__main__":
    unittest.main()
