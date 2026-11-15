/**
 * Student application state restoration and duplicate prevention.
 *
 * The backend already exposes application activity through the student progress
 * endpoint (`recent_events` with `APPLICATION_SUBMITTED` entries). These helpers
 * map those events back to job ids, keep state scoped per student profile, and
 * provide the button state used while history is loading or unavailable.
 */

export const APPLICATION_HISTORY_ERROR =
  'Application history could not be loaded. Enrollment is disabled until it is restored.';

export function normalizeApplicationText(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function mergeAppliedJobIds(...lists) {
  const seen = new Set();
  const merged = [];

  lists.flat().forEach(jobId => {
    if (typeof jobId === 'string' && jobId && !seen.has(jobId)) {
      seen.add(jobId);
      merged.push(jobId);
    }
  });

  return merged;
}

export function getAppliedJobIds(applicationsByStudent, studentId) {
  if (!studentId) return [];
  const entry = applicationsByStudent?.[studentId];
  const jobIds = Array.isArray(entry) ? entry : entry?.jobIds;
  return mergeAppliedJobIds(jobIds);
}

export function addAppliedJob(applicationsByStudent, studentId, jobId) {
  if (!studentId || typeof jobId !== 'string' || !jobId) {
    return applicationsByStudent || {};
  }

  const current = getAppliedJobIds(applicationsByStudent, studentId);
  if (current.includes(jobId)) return applicationsByStudent || {};

  return {
    ...(applicationsByStudent || {}),
    [studentId]: [...current, jobId]
  };
}

export function isJobApplied(applicationsByStudent, studentId, jobId) {
  return getAppliedJobIds(applicationsByStudent, studentId).includes(jobId);
}

export function deriveAppliedJobsFromProgress(progress, jobs) {
  const events = Array.isArray(progress?.recent_events) ? progress.recent_events : [];
  const jobList = Array.isArray(jobs) ? jobs : [];
  if (events.length === 0 || jobList.length === 0) return [];

  const candidates = jobList
    .filter(job => job && job.id && typeof job.title === 'string' && job.title.trim())
    .slice()
    .sort((a, b) => b.title.length - a.title.length);

  const matchedJobIds = [];

  events.forEach(event => {
    if (event?.event_type !== 'APPLICATION_SUBMITTED') return;

    const eventTitle = normalizeApplicationText(event.title);
    if (!eventTitle) return;

    const match = candidates.find(job => {
      const jobTitle = normalizeApplicationText(job.title);
      if (!jobTitle || !eventTitle.includes(jobTitle)) return false;

      const company = normalizeApplicationText(job.company);
      return !company || eventTitle.includes(company);
    });

    if (match?.id) matchedJobIds.push(match.id);
  });

  return mergeAppliedJobIds(matchedJobIds);
}

export function restoreAppliedJobs({ localJobIds = [], progress, jobs }) {
  return mergeAppliedJobIds(
    localJobIds,
    deriveAppliedJobsFromProgress(progress, jobs)
  );
}

export function resolveApplicationActionState({
  hasJob = true,
  hasApplied = false,
  isSubmitting = false,
  isLoadingHistory = false,
  historyError = null,
  isCapBlocked = false,
  isCgpaBlocked = false
} = {}) {
  if (!hasJob) {
    return { disabled: true, label: 'No role selected', tone: 'disabled' };
  }
  if (hasApplied) {
    return { disabled: true, label: 'Application Submitted', tone: 'applied' };
  }
  if (isSubmitting) {
    return { disabled: true, label: 'Submitting Application...', tone: 'submitting' };
  }
  if (isLoadingHistory) {
    return { disabled: true, label: 'Checking Application History...', tone: 'loading' };
  }
  if (historyError) {
    return { disabled: true, label: 'Application History Unavailable', tone: 'error' };
  }
  if (isCapBlocked) {
    return { disabled: true, label: 'Application Limit (3) Reached', tone: 'blocked' };
  }
  if (isCgpaBlocked) {
    return { disabled: true, label: 'Restricted by CGPA', tone: 'blocked' };
  }
  return { disabled: false, label: 'Enroll for Campus Drive', tone: 'ready' };
}

export function isDuplicateApplicationError(error) {
  const message = normalizeApplicationText(error?.message || error);
  return (
    message.includes('already exists') ||
    message.includes('already applied') ||
    message.includes('already enrolled') ||
    message.includes('duplicate')
  );
}
