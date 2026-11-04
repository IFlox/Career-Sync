# CareerSync Full-Stack Integration Plan

> **Ownership boundary:** This document plans and implements the Python/FastAPI
> backend. A separate frontend team can build the React application against the
> documented API contract. The backend must be full-stack compatible, but this
> plan does not require the backend developer to implement React screens, CSS,
> visual themes, or frontend state management.

## 1. Product Scope

**CareerSync** is an agentic career-readiness platform for students and placement
cells. The backend provides the complete API and data services required by the
React frontend to deliver:

1. Student career dashboard
2. Job-matching agent
3. Explainable skill-gap analyser
4. Personalised upskilling planner
5. Adaptive mock interview module
6. Progress tracking
7. Placement-cell analytics dashboard

### Expected outcomes

- Students understand why a job matches their profile before applying.
- Students receive prioritised, actionable preparation plans.
- Interview difficulty adapts to demonstrated performance.
- Students can measure readiness over time.
- Placement cells can identify recurring cohort-wide skill gaps and improve training.

### Deliberate MVP boundaries

- Use a curated mock job-description dataset; job scraping is not required.
- Use a curated course/resource catalogue; resource discovery is not required.
- Support text interviews first, with optional speech-to-text and text-to-speech adapters.
- Keep recommendations explainable and grounded in stored skills, requirements, resources,
  and interview results.
- Do not add hackathon recommendations, arbitrary CGPA restrictions, admin PINs, guest
  accounts, live reasoning logs, or automatic verification workflows unless a later
  requirement explicitly introduces them.

---

## 2. Recommended Stack

The tools below keep the required architecture intact while making the project
easier for a first- or second-year student to build and understand. They are
supporting tools, not replacements for the required FastAPI, PostgreSQL, React
integration, AI, matching, interview, progress, and analytics features.

| Area | Choice | Reason |
|---|---|---|
| API | FastAPI | Simple typed REST API and automatic OpenAPI documentation |
| Language | Python 3.11+ | Works well with parsing, matching, and AI integrations |
| Database | PostgreSQL | Required production datastore and suitable for analytics |
| ORM/migrations | SQLAlchemy 2.0 + Alembic | Typed models and repeatable schema changes |
| Validation | Pydantic v2 | Shared request and response contracts |
| Configuration | `pydantic-settings` + `.env` | Keeps local settings out of source code |
| File upload | `python-multipart` | Handles resume and audio form uploads in FastAPI |
| Passwords | `bcrypt` | Uses a familiar secure password-hashing library |
| Authentication | `PyJWT` | Keeps JWT creation and validation explicit |
| Matching | Python rules + cosine similarity | Combines transparent evidence with semantic matching |
| Similarity maths | `numpy` | Provides simple, well-tested vector calculations |
| LLM | Provider adapter with Gemini/OpenAI-compatible implementation | Keeps the application testable and provider-independent |
| Embeddings | Embedding provider adapter, with deterministic local fallback for tests | Supports semantic search without making tests dependent on an API |
| Frontend contract | JSON REST under `/api/v1` | Easy React integration and generated API types |
| Speech | STT and TTS provider adapters | Allows voice interviews without coupling the domain layer to one vendor |
| API testing | FastAPI Swagger UI + `httpx` | Lets students try endpoints in a browser and write simple API tests |
| Testing | `pytest` + `pytest-cov` | Clear unit and integration test workflow |
| Code quality | `ruff` + `mypy` | Finds common mistakes and type problems early |
| Local database | Docker Compose | Starts PostgreSQL consistently without complex infrastructure |
| First voice option | Browser Web Speech API | Allows a simple frontend voice prototype before a paid STT provider |

PostgreSQL is the source of truth. SQLite may be used only for isolated unit tests
if it supports the tested feature; it is not the planned application database.

### Tools deliberately not required at the start

Do not add LangChain, microservices, Redis, Celery, Kafka, Kubernetes, or a
separate vector database for the first implementation. They add concepts and
operational work without being necessary for the PS-06 requirements. Add one only
if a later measured requirement proves that the simple architecture is insufficient.

### Simple implementation rule

Build each feature in this order:

1. A plain Python function that demonstrates the rule.
2. A service that uses that function and saves its result.
3. A FastAPI route that validates input and calls the service.
4. A focused test for the function and an integration test for the route.
5. An optional LLM, embedding, or speech provider behind a small interface.

This keeps the core behavior understandable even when an external AI provider is
unavailable.

### Beginner glossary

- **API:** A set of URLs that lets the React frontend communicate with the backend.
- **FastAPI:** The Python framework used to create those API URLs.
- **Model:** A Python description of a database table.
- **Repository:** A small class or module that reads and writes database records.
- **Service:** The part of the application that performs a business operation,
  such as matching a student to a job.
- **Migration:** A recorded database change, such as adding a new table or column.
- **Embedding:** A list of numbers representing the meaning of text.
- **Cosine similarity:** A score that estimates how similar two embedding vectors are.
- **Provider adapter:** A small wrapper that allows an external service to be
  replaced by a mock service during local development and tests.
- **JWT:** A signed login token sent by the frontend to prove who the user is.
- **CORS:** A browser security rule that controls which frontend origins may call
  the backend.
- **OpenAPI:** A machine-readable description of the API used for documentation
  and TypeScript client generation.

---

## 3. Core Domain Model

All IDs are UUIDs. Store timestamps in UTC. Use PostgreSQL JSONB only for
provider-specific or genuinely variable data; keep queryable fields relational.

| Model | Purpose | Important fields |
|---|---|---|
| `User` | Login and role | `id`, `email`, `password_hash`, `role` (`STUDENT`/`ADMIN`), `name`, timestamps |
| `StudentProfile` | Student career profile | `user_id`, `branch`, `graduation_year`, `cgpa`, `resume_text`, `parsed_resume`, `profile_embedding`, `profile_quality_score` |
| `Skill` | Canonical skill vocabulary | `name`, `category`, `aliases` |
| `StudentSkill` | Evidence that a student has a skill | `student_id`, `skill_id`, `proficiency` (0-5), `evidence`, `source`, `updated_at` |
| `JobDescription` | Curated job dataset | `title`, `company`, `description`, `role_family`, `required_cgpa` (nullable), `embedding`, `is_active` |
| `JobSkillRequirement` | Skill requirements for a job | `job_id`, `skill_id`, `importance` (1-5), `minimum_proficiency`, `requirement_type` |
| `MatchAnalysis` | Reproducible matching result | `student_id`, `job_id`, `overall_score`, `semantic_score`, `skill_score`, `eligibility`, `matched_skills`, `missing_skills`, `explanation`, `created_at` |
| `LearningResource` | Curated course/resource catalogue | `title`, `provider`, `url`, `resource_type`, `difficulty`, `estimated_hours`, `is_verified` |
| `ResourceSkill` | Maps resources to skills | `resource_id`, `skill_id`, `coverage_level` |
| `UpskillingPlan` | Personalised plan for a target role | `student_id`, `target_job_id` (nullable), `target_role`, `status`, `total_estimated_hours`, timestamps |
| `PlanItem` | Ordered plan step | `plan_id`, `skill_id`, `priority`, `reason`, `resource_id`, `target_proficiency`, `status`, `due_date` |
| `InterviewSession` | One mock interview | `student_id`, `target_job_id` (nullable), `target_role`, `difficulty`, `status`, `overall_score`, timestamps |
| `InterviewQuestion` | Question asked in a session | `session_id`, `skill_id`, `difficulty`, `question_text`, `question_type`, `sequence_number` |
| `InterviewAnswer` | Student answer and evaluation | `question_id`, `text_answer`, `audio_reference` (nullable), `transcript` (nullable), `score`, `feedback`, `strengths`, `improvements` |
| `ProgressEvent` | Historical progress evidence | `student_id`, `event_type`, `skill_id` (nullable), `score` (nullable), `metadata`, `occurred_at` |
| `ReadinessSnapshot` | Readiness at a point in time | `student_id`, `target_role`, `readiness_score`, `skill_coverage`, `interview_score`, `plan_completion`, `created_at` |

### Important constraints

- A student can have one profile and many target roles/plans.
- A job requirement references a canonical `Skill`, not free-form text.
- Match explanations must be generated from persisted evidence, not only an LLM response.
- Progress records are append-only; corrections create a new event.
- Audio is optional and should be stored outside PostgreSQL when possible, with only a
  protected reference retained in `InterviewAnswer`.

---

## 4. API Contract and Frontend Handoff

The API is the integration boundary between this backend and the React frontend.
Every student and admin screen must be implementable using documented API
requests; frontend code should not need direct database access or provider keys.

### Frontend integration requirements

- Generate and publish the OpenAPI specification from FastAPI.
- Generate TypeScript request/response types from the OpenAPI specification.
- Keep endpoint paths, field names, enum values, pagination, and error codes stable.
- Use ISO-8601 UTC timestamps and UUID strings in all public responses.
- Use `camelCase` JSON aliases for React/TypeScript compatibility.
- Return loading-friendly, deterministic response shapes for dashboard cards,
  tables, charts, progress timelines, and interview steps.
- Configure explicit development and production CORS origins.
- Never expose LLM, embedding, speech, database, or JWT secrets to the frontend.
- Document which endpoints require `STUDENT` or `ADMIN` authorization.
- Version breaking API changes under `/api/v2` rather than silently changing `/api/v1`.

### Frontend handoff deliverables

The backend implementation is complete for frontend integration when it includes:

1. OpenAPI documentation at `/docs` and a checked-in generated `openapi.json`.
2. Generated TypeScript types or an equivalent frontend client package.
3. An `.env.example` containing the API base URL and safe public settings only.
4. Request/response examples for each student and admin workflow.
5. Seed accounts/data and a documented local demo flow.
6. Contract and integration tests covering the flows listed below.

### React workflow mapping

| React screen/workflow | Backend endpoints |
|---|---|
| Student landing/dashboard | `GET /students/me/dashboard` |
| Resume upload and audit | `POST /students/me/resume`, `POST /students/me/resume/parse`, `GET /students/me/profile` |
| Job catalogue and match details | `GET /jobs`, `GET /jobs/{job_id}`, `GET /students/me/matches`, `GET /jobs/{job_id}/match` |
| Skill gaps and roadmap | `GET /students/me/skill-gaps`, `POST /students/me/plans`, `GET /students/me/plans/{plan_id}` |
| Plan progress updates | `PATCH /students/me/plans/{plan_id}/items/{item_id}`, `GET /students/me/progress` |
| Mock interview | `POST /interviews`, `GET /interviews/{session_id}`, `POST /interviews/{session_id}/answers`, `POST /interviews/{session_id}/finish` |
| Voice interview controls | `POST /speech/transcribe`, `POST /speech/synthesize` |
| Placement-cell dashboard | `/admin/analytics/*`, `/admin/analytics/export` |
| Admin authentication | `POST /auth/login`, `GET /auth/me` |

The frontend owns routing, visual design, charts, drag-and-drop behavior, browser
speech capture, client-side caching, and user-facing loading/error presentation.
The backend owns authorization, validation, persistence, calculations, provider
calls, and the authoritative workflow state.

All endpoints are under `/api/v1`. Responses use HTTP status codes and a consistent
error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The uploaded resume is empty",
    "details": {}
  }
}
```

### Authentication and browser access

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create a student or admin account |
| `POST` | `/auth/login` | Return an access token |
| `GET` | `/auth/me` | Return the current user |

Use JWT access tokens with role-based dependencies. Never put secrets, default
passwords, or API keys in source code.

For browser clients:

- Accept the token through the `Authorization: Bearer <token>` header.
- Configure CORS from an environment variable, not `*` in production.
- Return `401` for missing/expired tokens and `403` for insufficient roles.
- Include safe request correlation IDs in error responses and server logs.
- Apply rate limits to resume parsing, matching, interview evaluation, and speech
  endpoints because they may call paid or slow providers.

### Student profile and dashboard

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/students/me/resume` | Upload a PDF/text resume |
| `POST` | `/students/me/resume/parse` | Parse and save structured resume data |
| `GET` | `/students/me/profile` | View profile, parsed skills, and data quality |
| `PATCH` | `/students/me/profile` | Correct profile fields or skills |
| `GET` | `/students/me/dashboard` | Return recommended jobs, top gaps, active plan, recent progress, and readiness |

Resume parsing must expose the parsed skills and allow students to correct them.

### Jobs and matching agent

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/jobs` | Browse/filter the curated job dataset |
| `GET` | `/jobs/{job_id}` | View job details and required skills |
| `POST` | `/matching/analyse` | Analyse one student against selected/all active jobs |
| `GET` | `/students/me/matches` | Return cached matches with explanations |
| `GET` | `/jobs/{job_id}/match` | Return the current student's detailed match |

Each match returns:

- overall score (0-100)
- semantic similarity score
- skill coverage score
- eligibility result
- matched skills with evidence
- missing skills with importance and current/target proficiency
- explanation and recommended next action

### Skill gaps and upskilling

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/students/me/skill-gaps` | List prioritised gaps for a target role/job |
| `POST` | `/students/me/plans` | Generate a plan from selected gaps and resources |
| `GET` | `/students/me/plans` | List plans |
| `GET` | `/students/me/plans/{plan_id}` | View ordered milestones and resources |
| `PATCH` | `/students/me/plans/{plan_id}/items/{item_id}` | Mark an item not started/in progress/completed |
| `GET` | `/skills` | Browse canonical skills |
| `GET` | `/skills/{skill_id}/resources` | Browse mapped catalogue resources |

The planner prioritises gaps using:

```text
priority = job_importance * proficiency_gap * estimated_role_value
```

It then recommends catalogue resources, estimated effort, milestones, and a reason
for every item. The LLM may improve wording, but must not invent resources or skills.

### Adaptive mock interviews

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/interviews` | Start an interview for a role/job |
| `GET` | `/interviews/{session_id}` | Get session state and history |
| `POST` | `/interviews/{session_id}/answers` | Submit text or audio answer |
| `POST` | `/interviews/{session_id}/finish` | Finish and persist the session summary |
| `POST` | `/speech/transcribe` | Convert supported audio to text |
| `POST` | `/speech/synthesize` | Convert feedback/question text to audio |

The interview agent:

1. Selects questions from required skills and current gaps.
2. Starts at a difficulty appropriate to the student.
3. Evaluates answer relevance, correctness, clarity, and examples.
4. Increases difficulty after strong answers and decreases or provides scaffolding
   after weak answers.
5. Stores feedback, strengths, improvements, and the next recommended practice area.

### Progress and placement-cell analytics

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/students/me/progress` | Return time-series progress and completed activities |
| `POST` | `/students/me/progress/events` | Record a verified external learning event |
| `POST` | `/students/me/readiness/snapshot` | Capture readiness for a role |
| `GET` | `/admin/analytics/overview` | Cohort size, readiness, plan completion, and interview trends |
| `GET` | `/admin/analytics/skills` | Most common missing skills by role/branch/year |
| `GET` | `/admin/analytics/roles` | Readiness and match distribution by target role |
| `GET` | `/admin/analytics/progress` | Progress over time and training completion |
| `GET` | `/admin/analytics/export` | Export filtered aggregate data as CSV |

Admin analytics must be aggregate by default. Student-level records require an
admin role and should not be exposed in cohort charts unnecessarily.

---

## 5. Agent and Service Design

Keep routes thin and put business logic in services. Every service should have a
provider-free unit-testable path.

| Service | Responsibility |
|---|---|
| `ResumeParserService` | Extract structured education, projects, experience, and skills; calculate profile quality |
| `SkillNormaliser` | Map aliases such as `JS` and `JavaScript` to one canonical skill |
| `MatchingService` | Calculate semantic/skill scores and persist explainable `MatchAnalysis` records |
| `SkillGapService` | Compare student evidence with job requirements and prioritise gaps |
| `UpskillingPlanner` | Build ordered plan items from gaps and verified catalogue resources |
| `InterviewService` | Manage sessions, select questions, evaluate answers, and adapt difficulty |
| `ProgressService` | Append progress events and calculate readiness snapshots |
| `AnalyticsService` | Run privacy-aware aggregate queries for the placement cell |
| `EmbeddingProvider` | Generate and cache embeddings for profiles and job descriptions |
| `LLMProvider` | Parse, evaluate, and generate constrained interview content |
| `SpeechProvider` | Transcribe and synthesise audio through replaceable adapters |

### Matching calculation

The initial score should be deterministic and explainable:

```text
overall_score = 0.45 * semantic_score
              + 0.45 * skill_coverage_score
              + 0.10 * eligibility_score
```

Weights must be configuration, not hidden constants. If a provider is unavailable,
the service should report the degraded mode in logs and use the deterministic
fallback; it must not return a fabricated successful result.

### Readiness calculation

Readiness is a role-specific score, not a permanent student label:

```text
readiness = 0.40 * skill_coverage
          + 0.25 * interview_performance
          + 0.20 * plan_completion
          + 0.15 * profile_quality
```

Store the component scores so the dashboard can explain changes over time.

---

## 6. Project Structure

```text
careersync-backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   ├── schemas/
│   ├── api/v1/
│   ├── repositories/
│   ├── services/
│   │   ├── resume_parser.py
│   │   ├── matching.py
│   │   ├── skill_gaps.py
│   │   ├── planner.py
│   │   ├── interviews.py
│   │   ├── progress.py
│   │   └── analytics.py
│   ├── providers/
│   │   ├── llm.py
│   │   ├── embeddings.py
│   │   └── speech.py
│   └── utils/
├── alembic/
├── seeds/
│   ├── skills.json
│   ├── job_descriptions.json
│   ├── learning_resources.json
│   └── interview_questions.json
├── tests/
├── scripts/seed_db.py
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 7. Data and Privacy Requirements

- Validate file type and size before processing resumes or audio.
- Do not log resume text, transcripts, passwords, tokens, or provider secrets.
- Encrypt or protect stored resume/audio references in deployment storage.
- Let students update or delete their profile data according to the product policy.
- Keep analytics queries aggregated and document the minimum cohort size for reports.
- Record the source of every extracted skill (`resume`, `student_confirmed`,
  `interview`, or `learning_event`) so recommendations remain explainable.

---

## 8. Seed Data

The demo dataset should include:

- 30-50 canonical skills with aliases and categories.
- 10-20 realistic job descriptions across 4-6 role families.
- Required skills, importance, minimum proficiency, and optional CGPA fields per job.
- 30-50 curated learning resources mapped to skills.
- Interview questions for each role family, skill, and difficulty.
- Several synthetic student profiles for matching, gap, interview, progress, and
  analytics tests.

Seeds must be clearly labelled as synthetic/demo data and loaded idempotently.

---

## 9. Delivery Plan

### Level 1: Simple working MVP

Complete this level before adding external AI providers or speech services. It
still implements the required product workflow using deterministic Python rules,
seed data, and mock providers.

#### Phase 1 - Foundation

- Create the FastAPI project and a local Python virtual environment.
- Start PostgreSQL with Docker Compose.
- Add SQLAlchemy models, Alembic migrations, and a health endpoint.
- Add JWT authentication and student/admin role dependencies.
- Add `.env` configuration with `pydantic-settings`.
- Add idempotent skills, jobs, resources, and question seeds.
- Open `/docs` and verify the first health and authentication endpoints manually.

#### Phase 2 - Student profile and basic matching

- Implement resume upload, simple text parsing, skill normalisation, and profile editing.
- Implement deterministic skill matching with Python sets and clear evidence.
- Persist match analyses and return explanations.
- Add the dashboard and job catalogue endpoints.
- Add focused tests before adding semantic embeddings.

#### Phase 3 - Gaps and personalised planning

- Implement gap calculation and priority scoring.
- Implement resource lookup and plan generation from the verified catalogue.
- Add plan item progress updates and validation that resources come from the catalogue.
- Record progress events and calculate a basic readiness snapshot.

#### Phase 4 - Text interview and analytics

- Implement question selection, session state, text answer evaluation, and simple
  difficulty adaptation.
- Add student progress endpoints.
- Add aggregate placement-cell analytics and CSV export.

### Level 2: Required intelligence and integrations

Add these features only after Level 1 works and its tests pass.

#### Phase 5 - Embeddings and LLM assistance

- Add the embedding provider behind `EmbeddingProvider`.
- Add cosine similarity using `numpy` and compare it with deterministic skill coverage.
- Add the LLM provider behind `LLMProvider` for structured resume parsing and
  constrained interview feedback.
- Validate all provider output with Pydantic before saving or returning it.
- Keep deterministic fallback behavior available for tests and offline demos.

#### Phase 6 - Adaptive voice interviews and handoff

- Add STT/TTS provider adapters and optional audio endpoints.
- Let the React frontend use the browser Web Speech API as the simplest first voice
  option, while the backend remains ready for provider-based speech.
- Add provider timeout/retry policies and explicit degraded-mode errors.
- Generate OpenAPI/TypeScript contracts for the React frontend.
- Add rate limits, audit-safe logs, and final integration tests.
- Document local setup, seed loading, environment variables, API examples, and limitations.

### Implementation checkpoints

At the end of each phase, verify:

1. The application starts without an API key.
2. The affected endpoint works in FastAPI Swagger UI.
3. The focused tests pass.
4. Error cases return the documented error shape.
5. The frontend handoff contract has not changed unexpectedly.

The frontend can begin using the documented OpenAPI contract after Level 1,
while the complete AI-assisted and speech-enabled experience is delivered by
Level 2.

### Original feature checklist

- Resume parsing and profile quality
- Embedding-based semantic matching
- Deterministic skill-gap analysis
- Personalised resource-based upskilling plan
- Adaptive mock interview
- Optional speech-to-text and text-to-speech
- Progress tracking and readiness snapshots
- Placement-cell aggregate analytics
- React-compatible OpenAPI and TypeScript handoff

---

## 10. Testing Strategy

### Unit tests

- Skill alias normalisation and proficiency calculations.
- Matching weights, score bounds, eligibility, and explanation evidence.
- Gap prioritisation and plan ordering.
- Interview difficulty transitions and answer score handling.
- Readiness component calculations.

### Integration tests

- Authentication and role protection.
- Resume-to-profile-to-match flow.
- Match-to-gap-to-plan flow.
- Interview session with multiple adaptive answers.
- Progress events reflected in readiness and dashboard responses.
- Admin analytics return aggregates and reject student access.

### Provider tests

- Mock LLM, embedding, STT, and TTS adapters.
- Test timeout and unavailable-provider behavior.
- Ensure no test requires a real API key.

Run:

```bash
pytest
ruff check .
mypy app/
```

---

## 11. Configuration

Required environment variables:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/careersync
JWT_SECRET_KEY=change-this-in-development
LLM_PROVIDER=mock
LLM_API_KEY=
EMBEDDING_PROVIDER=local
EMBEDDING_API_KEY=
STT_PROVIDER=mock
TTS_PROVIDER=mock
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_BYTES=10485760
```

Provider selection must be explicit. The mock provider is for local development
and tests; production configuration must use a strong secret and a real provider
or a clearly supported local implementation.

---

## 12. Development Commands

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt

docker compose up -d postgres
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --reload --port 8000

pytest
ruff check .
mypy app/
```

The first implementation should follow the delivery phases in order. The frontend
can begin against the documented OpenAPI contract after Phase 2, while the complete
student and placement-cell experience is delivered by Phase 5.
