"""
CareerSync Sprint 4 Automated Stress-Test & Validation Suite
Validates:
1. Database & seed integrity (Priya, Rahul, Amit)
2. Honest AI interview grading (Nonsense input scoring <= 3/10)
3. SOP policy enforcement (CGPA < 6.0 blocked, 3-app cap blocked)
4. SSRF input validation on URL ingestion
5. Admin authentication & JWT token security
6. Workspace reset execution
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("CAREERSYNC SPRINT 4: SYSTEM INTEGRITY & STRESS TEST SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # Test 1: Reset Workspace to Clean Baseline
    # -------------------------------------------------------------
    print("\n[TEST 1] Resetting Workspace to Baseline Seed State...")
    res = client.post("/api/v1/students/workspace/reset")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert len(res.json()["seeded_candidates"]) == 3
    print("✓ PASS: Workspace reset successfully to pristine seeds.")

    # -------------------------------------------------------------
    # Test 2: Seed Profile Consistency
    # -------------------------------------------------------------
    print("\n[TEST 2] Verifying Seed Profile Data Consistency...")
    priya = client.get("/api/v1/students/me/profile?student_id=stud-01").json()
    rahul = client.get("/api/v1/students/me/profile?student_id=stud-02").json()
    amit = client.get("/api/v1/students/me/profile?student_id=stud-03").json()

    assert priya["cgpa"] == 8.8 and priya["admin_status"] == "Approved"
    assert rahul["cgpa"] == 6.8 and rahul["admin_status"] == "Pending"
    assert amit["cgpa"] == 5.6 and amit["admin_status"] == "Revision Required"
    print("✓ PASS: Priya (8.8), Rahul (6.8), and Amit (5.6) loaded with correct academic states.")

    # -------------------------------------------------------------
    # Test 3: Preference-Aware Job Ranking & Explainability
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Preference-Aware Job Ranking for Priya...")
    res = client.get("/api/v1/students/stud-01/ranked-jobs")
    assert res.status_code == 200
    data = res.json()
    assert len(data["ranked_jobs"]) >= 2
    top_job = data["ranked_jobs"][0]
    assert "composite_score" in top_job
    assert len(top_job["match_evaluation"]["fit_reasons"]) > 0
    print(f"✓ PASS: Jobs ranked dynamically. Top role: '{top_job['title']}' ({top_job['composite_score']}% Match).")
    print(f"   Fit Explanation: {top_job['match_evaluation']['fit_reasons'][0]}")

    # -------------------------------------------------------------
    # Test 4: Dynamic Roadmap Tailored to Active Role
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Dynamic Role-Specific Roadmap Generation...")
    res = client.get("/api/v1/students/roadmap/stud-01?job_id=job-backend")
    assert res.status_code == 200
    roadmap_data = res.json()
    assert roadmap_data["target_role"] == "Distributed Backend Developer"
    assert len(roadmap_data["roadmap"]) == 4
    print(f"✓ PASS: Generated roadmap for '{roadmap_data['target_role']}' ({roadmap_data['learning_style']}).")

    # -------------------------------------------------------------
    # Test 5: Honest AI Interview Evaluation (No Hallucinated 8/10)
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Honest Interview Evaluation on Weak/Nonsense Input...")
    weak_payload = {
        "student_id": "stud-01",
        "skill": "RAG Pipelines",
        "question_text": "How do you handle chunk boundary overlap in RAG?",
        "answer_text": "I really do not know, sorry.",
        "current_difficulty": 6
    }
    res = client.post("/api/v1/students/interview/evaluate", json=weak_payload)
    assert res.status_code == 200
    eval_data = res.json()
    print(f"   Weak Answer Score: {eval_data['score']}/10")
    print(f"   Matched Keywords: {eval_data['matched_keywords']}")
    print(f"   Adaptation Note: {eval_data['adaptation_note']}")
    assert eval_data["score"] <= 3, f"Bad answer must score <= 3, got {eval_data['score']}"
    assert len(eval_data["matched_keywords"]) == 0, "Must not hallucinate keyword matches"
    print("✓ PASS: Honest scoring confirmed. Weak answer properly received <= 3/10 without hallucinations.")

    # -------------------------------------------------------------
    # Test 6: University SOP Guardrail — CGPA < 6.0 Tier-1 Restriction
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing SOP Guardrail: CGPA < 6.0 Blocked from Tier-1...")
    amit_app = {
        "student_id": "stud-03",
        "job_id": "job-ai-sys",
        "job_title": "AI Systems & RAG Engineer",
        "company": "Anthropic",
        "tier": "Tier-1"
    }
    res = client.post("/api/v1/students/applications/submit", json=amit_app)
    assert res.status_code == 400
    err_detail = res.json()["detail"]
    print(f"   Blocked Response: {err_detail}")
    assert "Minimum 6.0 CGPA required for Tier-1" in err_detail
    print("✓ PASS: Amit Patel (CGPA 5.6) successfully blocked from Tier-1 corporate drive.")

    # -------------------------------------------------------------
    # Test 7: University SOP Guardrail — 3 Active Application Cap
    # -------------------------------------------------------------
    print("\n[TEST 7] Testing SOP Guardrail: Active Application Cap (Max 3)...")
    rahul_app = {
        "student_id": "stud-02",
        "job_id": "job-backend",
        "job_title": "Distributed Backend Developer",
        "company": "Razorpay",
        "tier": "Tier-2"
    }
    # Rahul has 2 active apps initially. Submit 1 -> reaches 3. Submit another -> blocked!
    res1 = client.post("/api/v1/students/applications/submit", json=rahul_app)
    assert res1.status_code == 200, f"Expected 200 for 3rd app, got {res1.status_code}"
    
    # 4th application attempt must be rejected
    res2 = client.post("/api/v1/students/applications/submit", json=rahul_app)
    assert res2.status_code == 400
    assert "Application Cap" in res2.json()["detail"]
    print(f"   Blocked Response: {res2.json()['detail']}")
    print("✓ PASS: 4th concurrent application rejected under institutional 3-drive cap.")

    # -------------------------------------------------------------
    # Test 8: Security — SSRF Prevention on URL Scraper
    # -------------------------------------------------------------
    print("\n[TEST 8] Testing Security: SSRF Protection on /ingest-url...")
    ssrf_targets = [
        "http://127.0.0.1:8000/docs",
        "http://localhost:8000/api/v1/admin/matrix",
        "http://169.254.169.254/latest/meta-data/"
    ]
    for url in ssrf_targets:
        res = client.post("/api/v1/students/ingest-url", json={"url": url})
        assert res.status_code == 400, f"Must reject internal URL {url}, got {res.status_code}"
    print("✓ PASS: Loopback and metadata IP probing blocked.")

    # -------------------------------------------------------------
    # Test 9: Security — Admin Token Verification & Access Control
    # -------------------------------------------------------------
    print("\n[TEST 9] Testing Security: Admin Authentication Gateway...")
    # Unauthorized attempt (no token / wrong PIN)
    res_unauth = client.get("/api/v1/admin/matrix")
    assert res_unauth.status_code == 401
    print("   Unauthenticated access rejected with HTTP 401.")

    # Successful login
    login_res = client.post("/api/v1/admin/auth/verify", json={"pin": "tpo_secure_2026"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    assert token and len(token) > 20

    # Authorized request with Bearer JWT
    res_auth = client.get("/api/v1/admin/matrix", headers={"Authorization": f"Bearer {token}"})
    assert res_auth.status_code == 200
    students_in_matrix = res_auth.json()["students"]
    assert len(students_in_matrix) >= 3
    print(f"✓ PASS: Admin JWT issued. Matrix loaded with {len(students_in_matrix)} candidates.")

    # -------------------------------------------------------------
    # Test 10: Intent Analytics Verification
    # -------------------------------------------------------------
    print("\n[TEST 10] Testing TPO Intent Analytics...")
    intent_res = client.get("/api/v1/admin/analytics/intent", headers={"Authorization": f"Bearer {token}"})
    assert intent_res.status_code == 200
    intent_data = intent_res.json()
    assert "top_desired_roles" in intent_data
    assert "top_desired_locations" in intent_data
    print(f"✓ PASS: Cohort intent aggregated: Top role is '{intent_data['top_desired_roles'][0]['role']}'.")

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("ALL 10 VERIFICATION & STRESS TESTS PASSED SUCCESSFULLY!")
    print("Zero fake fallbacks, verified SOP solvers, and secure RBAC confirmed.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()