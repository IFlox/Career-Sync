"""
Live Industry Job Provider

Fetches technical job listings at runtime from the Arbeitnow public job board and
returns only validated LIVE_DATA records. There is no curated fallback: when the
provider cannot be reached the caller receives LiveJobsUnavailableError and the
route returns an explicit unavailable/empty state.

Nothing in this module invents employers, descriptions, URLs, CGPA rules, tiers,
or skills. Every returned record is traced back to the provider's own listing ID,
URL, and fetch timestamp.
"""

import html
import ipaddress
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests

FEED_URL = "https://www.arbeitnow.com/api/job-board-api"
SOURCE_NAME = "Arbeitnow"
SOURCE_LABEL = "Arbeitnow live job board"
CACHE_TTL_SECONDS = 7200  # 2 hours
FETCH_TIMEOUT_SECONDS = 8
REQUEST_HEADERS = {"User-Agent": "CareerSync-Agent/3.0"}

LIVE_DATA = "LIVE_DATA"

# Only fields produced by this provider are accepted. A seeded or app-fabricated
# field (tier, min_cgpa, provider, verified, placement_guarantee, ...) is
# rejected by validate_live_job instead of being rendered as live data.
ALLOWED_JOB_FIELDS = frozenset({
    "id",
    "source_job_id",
    "title",
    "company",
    "location",
    "description",
    "required_skills",
    "requiredSkills",
    "tags",
    "source_url",
    "source_name",
    "source_label",
    "fetched_at",
    "content_origin",
    "data_mode",
    "is_live",
    "remote",
    "employment_type",
})

_PLACEHOLDER_HOSTS = frozenset({
    "example.com",
    "example.org",
    "example.net",
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
})

# Claims our application must never add to a live listing. These are checked on
# application-controlled provenance fields only; provider descriptions are
# preserved verbatim and are not rewritten.
_FABRICATED_CLAIM_PATTERN = re.compile(
    r"\b(verified|official|certified|accredited|institutional|institution|"
    r"university|college|partner(?:s|ship)?|placement\s+guarantee|"
    r"guaranteed\s+placement|provided\s+by|endorsed|sponsored)\b",
    re.IGNORECASE,
)

_TECHNICAL_TERMS = (
    "software", "engineer", "engineering", "developer", "development",
    "devops", "data", "machine learning", "artificial intelligence", " ai ",
    "cloud", "backend", "back end", "frontend", "front end", "full stack",
    "platform", "infrastructure", "security", "qa", "quality assurance",
    "sre", "site reliability", "systems", "database", "python", "java",
    "javascript", "typescript", "react", "node", "golang", "rust", "kotlin",
)

# Skill labels used to recognize technology mentions in the provider's own tags,
# titles, and descriptions. This is a lookup, not a source of requirements: a
# skill appears only when the provider text contains one of these aliases.
_SKILL_ALIASES = {
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "c++": "C++",
    "c#": "C#",
    "golang": "Go",
    "rust": "Rust",
    "ruby": "Ruby",
    "php": "PHP",
    "scala": "Scala",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "sql": "SQL",
    "nosql": "NoSQL",
    "bash": "Bash",
    "react": "React",
    "react native": "React Native",
    "angular": "Angular",
    "vue": "Vue",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "spring": "Spring",
    "spring boot": "Spring Boot",
    ".net": ".NET",
    "dotnet": ".NET",
    "graphql": "GraphQL",
    "rest": "REST",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "microservices": "Microservices",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "keras": "Keras",
    "scikit-learn": "Scikit-Learn",
    "scikit learn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "spark": "Spark",
    "kafka": "Kafka",
    "airflow": "Airflow",
    "langchain": "LangChain",
    "llm": "LLM",
    "rag": "RAG",
    "nlp": "NLP",
    "computer vision": "Computer Vision",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "google cloud": "Google Cloud",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "terraform": "Terraform",
    "ansible": "Ansible",
    "jenkins": "Jenkins",
    "ci/cd": "CI/CD",
    "ci cd": "CI/CD",
    "linux": "Linux",
    "redis": "Redis",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "elasticsearch": "Elasticsearch",
    "graphql api": "GraphQL",
    "system design": "System Design",
    "distributed systems": "Distributed Systems",
    "algorithms": "Algorithms",
    "data structures": "Data Structures",
    "cybersecurity": "Cybersecurity",
    "penetration testing": "Penetration Testing",
    "selenium": "Selenium",
    "cypress": "Cypress",
    "playwright": "Playwright",
    "embedded systems": "Embedded Systems",
}

_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")

# Provider tags that describe a department, function, or broad discipline.
# They are deliberately never treated as required skills, even if a future
# alias happens to contain the same word.
_NON_SKILL_CATEGORY_TAGS = frozenset({
    "engineering",
    "backend",
    "back end",
    "back-end",
    "frontend",
    "front end",
    "front-end",
    "technology",
    "product",
    "it",
    "software",
})

# Go is ambiguous because provider tags also use "Go To Market" for business
# roles. Only an exact "Go" tag, a "Golang" token, or an explicit Go-language
# phrase counts as a Go requirement.
_GO_PHRASE_RE = re.compile(
    r"(?<![a-z0-9])"
    r"(?:golang|go\s+(?:language|developer|development|programming|programmer|engineer))"
    r"(?![a-z0-9])"
)
_GO_LIST_SEPARATOR_RE = re.compile(r"\s*[,/|&;]\s*")

# Aliases that are also common English (or neighbouring-language) words. They
# are trusted in provider tags but rejected in free text, where they mostly
# appear as ordinary prose ("decisions rest on", "spark creativity",
# "spring mit uns aufs Rad", "swift implementation", "point de vue"). Longer
# aliases such as "rest apis" and "spring boot" are still detected in prose.
_PROSE_AMBIGUOUS_ALIASES = frozenset({
    "flask",
    "rest",
    "rust",
    "spark",
    "spring",
    "swift",
    "vue",
})

_SKILL_ALIAS_PATTERNS = tuple(
    (
        alias,
        re.compile(r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"),
        label,
    )
    for alias, label in _SKILL_ALIASES.items()
)


def _is_explicit_go_signal(lowered_tag: str) -> bool:
    """True only for explicit Go-language signals, never for 'Go To Market'."""
    if lowered_tag == "go":
        return True
    if _GO_PHRASE_RE.search(lowered_tag):
        return True
    return "go" in _GO_LIST_SEPARATOR_RE.split(lowered_tag)


class LiveJobsUnavailableError(Exception):
    """Raised when the external live job provider cannot be reached or parsed."""


class LiveJobValidationError(ValueError):
    """Raised when a provider listing fails live-data validation."""


_job_cache: Dict[str, Any] = {
    "timestamp": 0.0,
    "jobs": [],
    "feed_status": "UNINITIALIZED",
}


def _plain_text(value: Any) -> str:
    text = str(value or "")
    if "<" in text and ">" in text:
        text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def _is_safe_source_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False

    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"}:
        return False
    if parsed.username or parsed.password:
        return False

    host = (parsed.hostname or "").lower()
    if not host or host in _PLACEHOLDER_HOSTS:
        return False
    if host.endswith(".localhost") or host.endswith(".example"):
        return False

    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return True

    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
    )


def _dedupe_labels(labels: List[str]) -> List[str]:
    """De-duplicates canonical skill labels case-insensitively, keeping order."""
    deduped: List[str] = []
    seen = set()
    for label in labels:
        key = label.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(label)
    return deduped


def _labels_in_text(
    text: str,
    *,
    allow_bare_go: bool,
    skipped_aliases: frozenset = frozenset(),
) -> List[str]:
    """Finds canonical skill labels in one piece of provider text."""
    lowered = text.lower()
    labels: List[str] = []

    if allow_bare_go:
        if _is_explicit_go_signal(lowered):
            labels.append("Go")
    elif _GO_PHRASE_RE.search(lowered):
        # In prose, only explicit Go-language phrases count. A bare "go" is
        # almost always ordinary English ("go to market", "go beyond").
        labels.append("Go")

    for alias, pattern, label in _SKILL_ALIAS_PATTERNS:
        if alias in skipped_aliases:
            continue
        if pattern.search(lowered):
            labels.append(label)

    return _dedupe_labels(labels)


def _normalize_skills(tags: List[str]) -> List[str]:
    """Extracts canonical skill labels from provider tags only."""
    skills: List[str] = []
    for tag in tags:
        text = _plain_text(tag)
        if not text:
            continue

        if text.lower() in _NON_SKILL_CATEGORY_TAGS:
            continue

        skills.extend(_labels_in_text(text, allow_bare_go=True))
    return _dedupe_labels(skills)


def _extract_skills_from_text(text: Any) -> List[str]:
    """
    Conservatively extracts canonical skills from a job title or description.

    Only aliases from _SKILL_ALIASES are recognized, so broad category labels
    such as "Engineering" or "Backend" never become skills on their own. Go is
    matched only through explicit Go-language phrases; "Go To Market" is not.
    """
    plain = _plain_text(text)
    if not plain:
        return []
    return _labels_in_text(
        plain,
        allow_bare_go=False,
        skipped_aliases=_PROSE_AMBIGUOUS_ALIASES,
    )


def _is_technical_listing(job: Dict[str, Any]) -> bool:
    text = " ".join([
        str(job.get("title") or ""),
        str(job.get("description") or ""),
        " ".join(job.get("tags") or []),
    ]).lower()
    return any(term in text for term in _TECHNICAL_TERMS)


def validate_live_job(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates one provider listing and returns it unchanged.

    Raises LiveJobValidationError for missing source identity, malformed URLs,
    empty descriptions, duplicate identity fields, unsupported fields, or
    application-added verification/partner/placement claims.
    """
    if not isinstance(job, dict):
        raise LiveJobValidationError("Live job listing must be an object.")

    unsupported = sorted(set(job) - ALLOWED_JOB_FIELDS)
    if unsupported:
        raise LiveJobValidationError(
            f"Live job listing contains unsupported fields: {', '.join(unsupported)}."
        )

    source_job_id = _plain_text(job.get("source_job_id"))
    if not source_job_id:
        raise LiveJobValidationError("Live job listing is missing its source job ID.")

    if not _plain_text(job.get("id")):
        raise LiveJobValidationError("Live job listing is missing an application ID.")

    if not _plain_text(job.get("title")):
        raise LiveJobValidationError("Live job listing is missing a title.")

    if not _plain_text(job.get("company")):
        raise LiveJobValidationError("Live job listing is missing an employer name.")

    if not _plain_text(job.get("description")):
        raise LiveJobValidationError("Live job listing has an empty description.")

    source_url = job.get("source_url")
    if not _is_safe_source_url(source_url):
        raise LiveJobValidationError("Live job listing has a missing or malformed source URL.")

    source_name = _plain_text(job.get("source_name"))
    if not source_name:
        raise LiveJobValidationError("Live job listing is missing its source/provider name.")

    if job.get("content_origin") != LIVE_DATA or job.get("data_mode") != LIVE_DATA:
        raise LiveJobValidationError("Live job listing is not marked as LIVE_DATA.")

    if job.get("is_live") is not True:
        raise LiveJobValidationError("Live job listing is not flagged as live.")

    fetched_at = _plain_text(job.get("fetched_at"))
    if not fetched_at:
        raise LiveJobValidationError("Live job listing is missing its fetch timestamp.")
    try:
        datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise LiveJobValidationError("Live job listing has an invalid fetch timestamp.") from exc

    required_skills = job.get("required_skills")
    if not isinstance(required_skills, list):
        raise LiveJobValidationError("Live job listing skills must be a list.")
    if any(not _plain_text(skill) for skill in required_skills):
        raise LiveJobValidationError("Live job listing contains an empty skill.")

    tags = job.get("tags")
    if not isinstance(tags, list) or any(not _plain_text(tag) for tag in tags):
        raise LiveJobValidationError("Live job listing tags must be a list of text values.")

    # Only provenance fields are application-controlled. If our code ever adds a
    # verification, partner, institutional, or placement-guarantee claim here,
    # the listing is rejected instead of being shown as source data.
    for field in ("source_name", "source_label"):
        value = _plain_text(job.get(field))
        if value and _FABRICATED_CLAIM_PATTERN.search(value):
            raise LiveJobValidationError(
                "Live job listing contains an application-added verification claim."
            )

    return job


def validate_live_jobs(raw_jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Validates and de-duplicates a provider batch, dropping unusable listings."""
    if not isinstance(raw_jobs, list):
        raise LiveJobsUnavailableError("Live job provider returned an invalid payload.")

    validated: List[Dict[str, Any]] = []
    seen_ids = set()
    seen_source_ids = set()
    seen_urls = set()

    for raw in raw_jobs:
        try:
            job = validate_live_job(raw)
        except LiveJobValidationError:
            continue

        job_id = job["id"]
        source_job_id = job["source_job_id"]
        source_url = job["source_url"].strip().lower()
        if job_id in seen_ids or source_job_id in seen_source_ids or source_url in seen_urls:
            continue

        seen_ids.add(job_id)
        seen_source_ids.add(source_job_id)
        seen_urls.add(source_url)
        validated.append(job)

    return validated


def _parse_listing(item: Dict[str, Any], fetched_at: str) -> Optional[Dict[str, Any]]:
    if not isinstance(item, dict):
        return None

    source_job_id = _plain_text(item.get("slug") or item.get("id"))
    title = _plain_text(item.get("title"))
    company = _plain_text(item.get("company_name") or item.get("company"))
    description = _plain_text(item.get("description"))
    location = _plain_text(item.get("location")) or "Location not provided"
    source_url = str(item.get("url") or "").strip()

    if not source_job_id or not title or not company or not description or not source_url:
        return None

    tags: List[str] = []
    for raw_tag in item.get("tags") or []:
        tag = _plain_text(raw_tag)
        if tag and tag.lower() not in {existing.lower() for existing in tags}:
            tags.append(tag)

    skills = _dedupe_labels(
        _normalize_skills(tags)
        + _extract_skills_from_text(title)
        + _extract_skills_from_text(description)
    )

    job: Dict[str, Any] = {
        "id": f"live-{source_job_id}",
        "source_job_id": source_job_id,
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "required_skills": skills,
        "requiredSkills": skills,
        "tags": tags,
        "source_url": source_url,
        "source_name": SOURCE_NAME,
        "source_label": SOURCE_LABEL,
        "fetched_at": fetched_at,
        "content_origin": LIVE_DATA,
        "data_mode": LIVE_DATA,
        "is_live": True,
    }

    remote = item.get("remote")
    if isinstance(remote, bool):
        job["remote"] = remote

    job_types = item.get("job_types")
    if isinstance(job_types, list):
        employment_type = ", ".join(
            text for text in (_plain_text(value) for value in job_types) if text
        )
        if employment_type:
            job["employment_type"] = employment_type

    return job


class LiveJobProvider:
    @classmethod
    def get_jobs(cls, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Returns validated live technical listings.

        A fresh cache is served to avoid hammering the provider. A provider
        failure always raises LiveJobsUnavailableError; curated or cached jobs
        are never substituted for a failed fetch.
        """
        current_time = time.time()
        if (
            not force_refresh
            and _job_cache["jobs"]
            and (current_time - _job_cache["timestamp"]) < CACHE_TTL_SECONDS
        ):
            return list(_job_cache["jobs"])

        payload = cls._fetch_live_payload()
        fetched_at = datetime.now(timezone.utc).isoformat()

        parsed: List[Dict[str, Any]] = []
        for item in payload:
            job = _parse_listing(item, fetched_at)
            if job is not None and _is_technical_listing(job):
                parsed.append(job)

        jobs = validate_live_jobs(parsed)

        _job_cache["jobs"] = jobs
        _job_cache["timestamp"] = current_time
        _job_cache["feed_status"] = LIVE_DATA if jobs else "EMPTY"
        return list(jobs)

    @staticmethod
    def _fetch_live_payload() -> List[Dict[str, Any]]:
        try:
            response = requests.get(
                FEED_URL,
                timeout=FETCH_TIMEOUT_SECONDS,
                headers=REQUEST_HEADERS,
            )
        except Exception as exc:
            raise LiveJobsUnavailableError(
                "Live job provider request failed."
            ) from exc

        if response.status_code != 200:
            raise LiveJobsUnavailableError(
                f"Live job provider returned HTTP {response.status_code}."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise LiveJobsUnavailableError(
                "Live job provider returned a non-JSON response."
            ) from exc

        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise LiveJobsUnavailableError(
                "Live job provider returned an invalid payload."
            )

        return payload["data"]

    @staticmethod
    def reset_cache() -> None:
        _job_cache["jobs"] = []
        _job_cache["timestamp"] = 0.0
        _job_cache["feed_status"] = "UNINITIALIZED"

    @staticmethod
    def cache_status() -> Tuple[str, int]:
        return _job_cache["feed_status"], len(_job_cache["jobs"])
