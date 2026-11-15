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
2. **Live Job Alignment Engine:** Fetches current technical listings, extracts validated skill signals from job tags, titles, and descriptions, and ranks opportunities against student profiles.
3. **University Placement SOP Solver:** Enforces institutional rules automatically:
   - **CGPA Rule:** Restricts students with CGPA < 6.0 from Tier-1 drives.
   - **Application Cap:** Restricts students to a maximum of 3 concurrent active placement drives.
4. **Adaptive Voice & Text Practice Interviewer:** Simulates live technical interviews with browser Speech-to-Text (`webkitSpeechRecognition`), dynamic 0–10 rubric evaluation, and adaptive difficulty scaling based on candidate answers.
5. **Persistent Event-Sourced Progress:** Tracks milestone completions and historical readiness curves over time on the server—ensuring student progress is never lost on refresh.
6. **Placement Cell (TPO) Command Center:** Equips placement officers with live cohort analytics, skill-data coverage reporting, review SLA escalation badges (> 48 hrs), a human-in-the-loop approval gate, refreshable data, and one-click verified CSV batch export.
7. **AI Remediation Bootcamp:** Generates a three-day technical bootcamp through a configured AI provider and uses a deterministic curriculum when the provider is unavailable or returns invalid data.


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
git clone https://github.com/IFlox/Career-Sync.git
cd Career-Sync
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

4. Make sure PostgreSQL is running and the `careersync` database exists:
   * **Windows PowerShell:**
     ```powershell
     Get-Service -Name 'postgresql*'
     Test-NetConnection -ComputerName localhost -Port 5432
     pg_isready -h localhost -p 5432 -U postgres
     ```
   * **macOS / Linux:**
     ```bash
     pg_isready -h localhost -p 5432 -U postgres
     ```

5. Create your `backend/.env` file:
   ```bash
   # Windows (PowerShell):
   New-Item .env
   # macOS / Linux:
   touch .env
   ```

6. Paste the following configuration into `backend/.env`:
   ```env
   PORT=8000
   DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/careersync
   SECRET_KEY=replace_with_a_local_secret
   ADMIN_PIN=replace_with_a_local_admin_pin
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

   # Optional AI providers:
   GROQ_API_KEY=your_groq_api_key_here

   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   `DATABASE_URL` is PostgreSQL by default. SQLite is supported only when an
   explicit `sqlite://` URL is configured. Never commit `backend/.env` or real
   credentials.

7. Start the backend server:
   ```bash
   python main.py
   ```
   * The backend will run on **`http://127.0.0.1:8000`**
   * Interactive API documentation: **`http://127.0.0.1:8000/docs`**

---

### 3. Frontend Setup (Terminal 2)

1. Open a **new separate terminal tab** and navigate into `frontend/`:
   ```bash
   cd Career-Sync/frontend
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

## 📚 Documentation & Verification

When the backend is running, use:

- **Swagger API docs:** `http://127.0.0.1:8000/docs`
- **ReDoc API docs:** `http://127.0.0.1:8000/redoc`
- **Health check:** `http://127.0.0.1:8000/health`

The health response reports the selected database backend, PostgreSQL
configuration, and connection target without exposing passwords.

Run backend tests from `backend/`:

```bash
python -m pytest tests -q
```

Run frontend tests and the production build from `frontend/`:

```bash
npm test
npm run build
```

On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked by the execution
policy:

```powershell
npm.cmd test
npm.cmd run build
```

Useful project documentation:

- [Python](https://docs.python.org/3/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Groq documentation](https://console.groq.com/docs)
- [Google Gemini API documentation](https://ai.google.dev/gemini-api/docs)

---

## 🔑 Pre-Seeded Profiles & Credentials

The system includes pre-loaded synthetic student profiles to allow immediate evaluation without manual input:

| Candidate | CGPA | Skills Match | Profile Description | Key Evaluation Scenario |
| :--- | :---: | :---: | :--- | :--- |
| **Priya Sharma** | `8.8` | **88%** | High performer with RAG, PyTorch, and Docker experience. | Demonstrates strong Tier-1 job alignment and complete radar coverage. |
| **Rahul Verma** | `6.8` | **58%** | Mid-tier backend developer with Node.js and PostgreSQL. | Demonstrates AI bullet rewrite recommendations and intermediate roadmaps. |
| **Amit Patel** | `5.6` | **35%** | Underperforming candidate with legacy manual testing skills. | **Triggers SOP CGPA Guardrail (< 6.0)** and **SLA Overdue Review Alert (> 48 hrs)**. |

* **Admin Portal Password:** Use the `ADMIN_PIN` value configured in your local `backend/.env`. Never publish the real value.

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
2. Enter your configured admin PIN.
3. Review the live skill-signal chart and its skill-data coverage.
4. Review the **Review Pending > 48 Hrs** SLA badge on overdue candidate profiles.
5. Use the **Human-in-the-Loop gate**: change a candidate status to **[Approve]**.
6. Click **[Export Verified Batch (CSV)]** to download the clean candidate roster for recruitment drives.

---

## ❓ Frequently Asked Questions (FAQ)

#### 1. Why do I see a PostgreSQL connection-refused error?
* **Cause:** PostgreSQL is the default database and is not running or the `careersync` database does not exist.
* **Fix:** Verify the service and port with `Get-Service -Name 'postgresql*'`,
  `Test-NetConnection -ComputerName localhost -Port 5432`, and
  `pg_isready -h localhost -p 5432 -U postgres`. Then check `DATABASE_URL`.

#### 2. Why do I see `connect ECONNREFUSED 127.0.0.1:8000`?
* **Cause:** The frontend cannot connect to the backend because FastAPI is not running.
* **Fix:** Open a terminal in `backend/`, activate your virtual environment, and run `python main.py`. Make sure it displays `Application startup complete`.

#### 3. Why does voice recognition not work when clicking "Speak Answer"?
* **Cause:** The Web Speech API requires microphone permissions and works best on Chromium-based browsers (Google Chrome, Microsoft Edge, Brave).
* **Fix:** Allow microphone permissions for `localhost`, or type your answer in the text area.

#### 4. What happens when an AI provider is unavailable?
* Deterministic local processing remains available for supported features. AI-first
  features report an explicit unavailable state or use their documented
  deterministic fallback, such as the remediation bootcamp curriculum.

#### 5. Where are the frontend tests?
* Frontend tests are grouped under `frontend/tests/` by API, component, and
  utility area. Run them from `frontend/` with `npm.cmd test` on Windows.
