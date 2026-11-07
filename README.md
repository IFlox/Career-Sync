# 🎯 CareerSync (PS-06)
> **Intelligent Placement Readiness, Market Radar & Career Matching Agent**  
> *Built for JKLU AI-Buildathon 1.0 — Institute of Engineering & Technology, JK Lakshmipat University, Jaipur*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React + Vite](https://img.shields.io/badge/React-18.2+-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq LPU](https://img.shields.io/badge/Groq-LPU_Inference-F55036)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Problem Statement Overview (PS-06)

During campus placement seasons, students often apply for jobs without an evidence-based understanding of how their skills align with industry requirements, leaving them unprepared for technical interviews. Meanwhile, Training & Placement Offices (TPOs) lack a consolidated, real-time view of cohort readiness, recurring skill gaps, and preparation trajectories across different roles.

**CareerSync** is an autonomous agentic system built to solve this challenge through:
1. **Resume PDF Ingestion & Privacy Guard:** Parses raw `.pdf` resumes with server-side text extraction and automatically scrubs PII (emails, phone numbers, addresses) before any external processing.
2. **Semantic Job Alignment Engine:** Computes dense vector embeddings and cosine similarity against curated job descriptions (AI Systems Engineer, Cloud DevOps, Distributed Backend, Data Scientist).
3. **University Placement SOP Solver:** Enforces institutional rules automatically:
   - **CGPA Rule:** Restricts students with CGPA < 6.0 from Tier-1 drives.
   - **Application Cap:** Restricts students to a maximum of 3 concurrent active placement drives.
4. **Adaptive Voice & Text Practice Interviewer:** Simulates live technical interviews with browser Speech-to-Text (`webkitSpeechRecognition`), dynamic 0–10 rubric evaluation, and adaptive difficulty scaling based on candidate answers.
5. **Persistent Event-Sourced Progress:** Tracks milestone completions and historical readiness curves over time on the server—ensuring student progress is never lost on refresh.
6. **Placement Cell (TPO) Command Center:** Equips placement officers with cohort-wide gap charts, review SLA escalation badges (> 48 hrs), a human-in-the-loop approval gate, and one-click verified CSV batch export.

---

## 🏗️ Architecture & Directory Structure

```text
careersync/
├── backend/                       # Python / FastAPI API (Port 8000)
│   ├── .env
│   ├── requirements.txt
│   ├── main.py                    # Server entry, CORS, and route mounting
│   ├── data_seeds.py              # Synthetic seed profiles & curated job catalogue
│   ├── routes/
│   │   ├── student_routes.py      # /api/v1/students/* (PDF upload, ATS, roadmap, interview)
│   │   └── admin_routes.py        # /api/v1/admin/* (Matrix, approval status, CSV export)
│   └── services/
│       ├── ai_engine.py           # Multi-provider LLM cascade (Groq / Gemini / Fallback)
│       ├── pdf_parser.py          # PDF binary stream extractor (pypdf)
│       ├── pii_scrubber.py        # Regex PII token masking engine
│       ├── matching_engine.py     # NumPy vector cosine similarity & SOP rule solver
│       ├── progress_tracker.py    # Event-sourced persistence & time-series snapshots
│       └── interview_agent.py     # Dynamic interview question bank & difficulty engine
└── frontend/                      # React + Vite + Tailwind (Port 5173)
    ├── package.json
    ├── vite.config.js             # API proxy routing /api to http://127.0.0.1:8000
    ├── tailwind.config.js          # Bento aesthetic (porcelain canvas, terracotta accents)
    └── src/
        ├── App.jsx                # Layout orchestrator & role-based view gate
        ├── api/client.js          # Centralized fetch wrapper for FastAPI endpoints
        └── components/
            ├── Navbar.jsx                 # Top bar with privacy status & admin login
            ├── StudentPortal.jsx          # Main candidate readiness & roadmap cockpit
            ├── ConcentricReadinessDial.jsx# Layered multi-factor readiness score
            ├── SkillRadarChart.jsx        # 6-Axis competency polygon vs. job target
            ├── ProgressTimelineWidget.jsx # Growth sparkline & practice streak matrix
            ├── MockInterview.jsx          # Adaptive voice interview studio with waveform
            ├── ATSPreviewModal.jsx        # Single-column standardized ATS resume view
            ├── AdminPortal.jsx            # Placement cell matrix, SLA flags & CSV export
            └── ReasoningTrace.jsx         # Real-time agent execution telemetry HUD
```

---

## ⚡ Prerequisites

Make sure you have installed on your computer:
* **Node.js:** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
* **Python:** v3.11, v3.12, or v3.13 ([Download Python](https://www.python.org/downloads/))
* **Git:** ([Download Git](https://git-scm.com/))

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone the Project
```bash
git clone https://github.com/your-username/careersync.git
cd careersync
```

---

### 2. Backend Setup (Terminal 1)

1. Open your terminal and navigate into the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `backend/.env` file:
   ```bash
   # Windows (PowerShell):
   New-Item .env
   # macOS / Linux:
   touch .env
   ```

5. Paste the following configuration into `backend/.env`:
   ```env
   PORT=8000
   ADMIN_PIN=tpo_secure_2026
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

   # AI Provider: Get a free key in 30 seconds at https://console.groq.com/
   GROQ_API_KEY=your_groq_api_key_here

   # (Optional) Secondary fallback key from https://aistudio.google.com/
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: If no API key is provided, the system automatically uses its internal deterministic offline engine with 100% uptime guarantee).*

6. Start the backend server:
   ```bash
   python main.py
   ```
   * The backend will run on **`http://127.0.0.1:8000`**
   * Interactive API documentation: **`http://127.0.0.1:8000/docs`**

---

### 3. Frontend Setup (Terminal 2)

1. Open a **new separate terminal tab** and navigate into `frontend/`:
   ```bash
   cd careersync/frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   * The application will run at **`http://localhost:5173`**

---

## 🔑 Pre-Seeded Profiles & Credentials

The system includes pre-loaded synthetic student profiles to allow immediate evaluation without manual input:

| Candidate | CGPA | Skills Match | Profile Description | Key Evaluation Scenario |
| :--- | :---: | :---: | :--- | :--- |
| **Priya Sharma** | `8.8` | **88%** | High performer with RAG, PyTorch, and Docker experience. | Demonstrates strong Tier-1 job alignment and complete radar coverage. |
| **Rahul Verma** | `6.8` | **58%** | Mid-tier backend developer with Node.js and PostgreSQL. | Demonstrates AI bullet rewrite recommendations and intermediate roadmaps. |
| **Amit Patel** | `5.6` | **35%** | Underperforming candidate with legacy manual testing skills. | **Triggers SOP CGPA Guardrail (< 6.0)** and **SLA Overdue Review Alert (> 48 hrs)**. |

* **Admin Portal Password:** `tpo_secure_2026`

---

## 🧪 Live Evaluation Demo Walkthrough

Follow this 5-step flow to demonstrate each Buildathon rubric requirement:

### Step 1: Student Resume Ingestion & PII Protection
1. Open [`http://localhost:5173`](http://localhost:5173).
2. Drag and drop any technical `.pdf` resume onto the upload dropzone (or select a preset candidate: **Priya**, **Rahul**, or **Amit**).
3. Expand the **Live AI Steps HUD** at the bottom-right to observe real-time millisecond execution: text extraction, PII token masking, and dynamic CGPA extraction.
4. Click **[Clean Resume Preview]** to inspect the standardized single-column ATS layout.

### Step 2: Role Matching, 6-Axis Radar & University Rules
1. Select a target role from the dropdown (e.g., *AI Systems & RAG Engineer*).
2. Review the **6-Axis Skill Radar**: observe the polygon comparing candidate strengths against role benchmarks.
3. Switch to **Amit Patel (35%)**: observe the red **College Placement Rule Alert** indicating Tier-1 restriction due to CGPA < 6.0.
4. Click **[Submit Campus Application]**: verify that the system blocks the application and enforces the 3-application active drive limit.

### Step 3: Adaptive Voice/Text Mock Interview
1. Scroll down to the **AI Practice Interview** section.
2. Select a focus topic (e.g., *RAG Pipelines* or *Docker*).
3. Click **[Read Aloud]** to test speech synthesis.
4. Speak an answer using **[Speak Answer (Voice)]** or type an explanation.
5. Click **[Evaluate Answer]**: observe the AI scoring the response (0–10), providing constructive feedback, and **dynamically adjusting question difficulty** for the next turn.

### Step 4: Persistent Progress Tracking
1. Check off a milestone task in the **4-Week Preparation Plan**.
2. Notice that the **Readiness Score** and **Growth Curve** update dynamically.
3. Refresh the browser (`F5`): verify that the task **remains checked** and the growth curve is **retained**, confirming server-side persistence.

### Step 5: Placement Cell (TPO) Command Center
1. Click **[Admin Login]** in the top navigation bar.
2. Enter password: `tpo_secure_2026`.
3. Review the batch-wide missing skills chart (e.g., *67% missing Docker*).
4. Review the **Review Pending > 48 Hrs** SLA badge on overdue candidate profiles.
5. Use the **Human-in-the-Loop gate**: change a candidate status to **[Approve]**.
6. Click **[Export Verified Batch (CSV)]** to download the clean candidate roster for recruitment drives.

---

## ❓ Frequently Asked Questions (FAQ)

#### 1. Why do I see `connect ECONNREFUSED 127.0.0.1:8000`?
* **Cause:** The frontend cannot connect to the backend because FastAPI is not running.
* **Fix:** Open a terminal in `backend/`, activate your virtual environment, and run `python main.py`. Make sure it displays `Application startup complete`.

#### 2. Why does voice recognition not work when clicking "Speak Answer"?
* **Cause:** The Web Speech API requires microphone permissions and works best on Chromium-based browsers (Google Chrome, Microsoft Edge, Brave).
* **Fix:** Allow microphone permissions for `localhost`, or type your answer in the text area.

#### 3. Can the application run completely offline without an API key?
* **Yes.** If neither `GROQ_API_KEY` nor `GEMINI_API_KEY` is set in `backend/.env`, CareerSync automatically uses its internal deterministic rule engine. All vector matching, PDF extractions, interview evaluations, and roadmaps execute locally without throwing errors.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.