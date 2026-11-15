/**
 * Live job listing helpers.
 *
 * Job postings are fetched at runtime from the backend's live provider. The
 * portal must never render a local seed or an AI-generated listing, so every
 * item has to carry explicit LIVE_DATA provenance and a real source URL before
 * it reaches the UI. Provider data is preserved; nothing is invented here.
 */

export const LIVE_JOBS_LOAD_ERROR =
  'Live job listings are unavailable right now. Please retry.';
export const LIVE_JOBS_EMPTY_MESSAGE =
  'No live technical job listings are available right now. Please retry.';

const PLACEHOLDER_HOSTS = [
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  '0.0.0.0'
];

export function isSafeLiveJobUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (!host || PLACEHOLDER_HOSTS.includes(host)) return false;
  if (host.endsWith('.localhost') || host.endsWith('.example')) return false;

  return true;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * A listing is displayable only when the backend marked it live, kept the
 * provider's source ID, title, description, and a valid source URL.
 */
export function hasLiveJobProvenance(job) {
  if (!job || typeof job !== 'object') return false;

  return job.content_origin === 'LIVE_DATA'
    && job.data_mode === 'LIVE_DATA'
    && job.is_live === true
    && isNonEmptyString(job.id)
    && isNonEmptyString(job.source_job_id)
    && isNonEmptyString(job.title)
    && isNonEmptyString(job.description)
    && isNonEmptyString(job.source_name)
    && isNonEmptyString(job.fetched_at)
    && isSafeLiveJobUrl(job.source_url);
}

function jobKeys(job) {
  return [
    job.id.trim().toLowerCase(),
    job.source_job_id.trim().toLowerCase(),
    job.source_url.trim().toLowerCase()
  ];
}

export function normalizeLiveJob(job) {
  if (!hasLiveJobProvenance(job)) return null;

  const requiredSkills = Array.isArray(job.required_skills)
    ? job.required_skills.filter(isNonEmptyString).map(skill => skill.trim())
    : [];

  return {
    ...job,
    id: job.id.trim(),
    source_job_id: job.source_job_id.trim(),
    title: job.title.trim(),
    company: isNonEmptyString(job.company) ? job.company.trim() : 'Company not provided',
    location: isNonEmptyString(job.location) ? job.location.trim() : 'Location not provided',
    description: job.description.trim(),
    required_skills: requiredSkills,
    requiredSkills,
    source_url: job.source_url.trim(),
    source_name: job.source_name.trim(),
    content_origin: 'LIVE_DATA',
    data_mode: 'LIVE_DATA',
    is_live: true
  };
}

export function normalizeLiveJobs(jobs) {
  if (!Array.isArray(jobs)) return [];

  const seen = new Set();
  const normalized = [];

  jobs.forEach(raw => {
    const job = normalizeLiveJob(raw);
    if (!job) return;

    const keys = jobKeys(job);
    if (keys.some(key => seen.has(key))) return;

    keys.forEach(key => seen.add(key));
    normalized.push(job);
  });

  return normalized;
}

export function getLiveJobSourceName(job) {
  return isNonEmptyString(job?.source_name) ? job.source_name.trim() : 'Live provider';
}
