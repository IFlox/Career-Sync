/**
 * Student-scoped hidden-role visibility.
 *
 * The backend stores at most one feedback record per (student, entity) pair.
 * A HIDDEN action is therefore authoritative: it hides the role until the
 * record changes. Feedback is loaded per student on refresh, so visibility is
 * always derived from that student's records instead of a local-only id list.
 */

import { resolveSelectedJobId } from './jobRelevance.js';

const JOB_ENTITY_TYPE = 'JOB';
const HIDDEN_ACTION = 'HIDDEN';

function toKey(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function isJobFeedbackRecord(record) {
  return Boolean(record) && String(record.entity_type || '').toUpperCase() === JOB_ENTITY_TYPE;
}

export function getHiddenJobIds(feedbackRecords) {
  const hiddenJobIds = new Set();
  if (!Array.isArray(feedbackRecords)) return hiddenJobIds;

  feedbackRecords.forEach(record => {
    if (!isJobFeedbackRecord(record)) return;
    if (String(record.action || '').toUpperCase() !== HIDDEN_ACTION) return;

    const key = toKey(record.entity_id);
    if (key !== null) hiddenJobIds.add(key);
  });

  return hiddenJobIds;
}

export function isJobHidden(jobId, hiddenJobIds) {
  const key = toKey(jobId);
  if (key === null) return false;

  if (hiddenJobIds instanceof Set) return hiddenJobIds.has(key);
  if (Array.isArray(hiddenJobIds)) return hiddenJobIds.some(id => toKey(id) === key);
  return false;
}

export function filterVisibleJobs(jobs, feedbackRecords) {
  if (!Array.isArray(jobs)) return [];

  const hiddenJobIds = getHiddenJobIds(feedbackRecords);
  if (hiddenJobIds.size === 0) return jobs;

  return jobs.filter(job => !isJobHidden(job?.id, hiddenJobIds));
}

/**
 * Chooses the job to display after a hide or a refresh.
 *
 * The previously selected role is kept while it remains visible. When it has
 * been hidden, the next visible role after it is selected, wrapping to the
 * start of the list. This matches the dropdown order instead of always
 * jumping back to the first role.
 */
export function resolveVisibleJobId(jobs, selectedJobId, feedbackRecords) {
  if (!Array.isArray(jobs) || jobs.length === 0) return null;

  const hiddenJobIds = getHiddenJobIds(feedbackRecords);
  const selectedKey = toKey(selectedJobId);
  if (
    selectedKey !== null
    && !hiddenJobIds.has(selectedKey)
    && jobs.some(job => toKey(job?.id) === selectedKey)
  ) {
    return selectedJobId;
  }

  const selectedIndex = jobs.findIndex(job => toKey(job?.id) === selectedKey);
  if (selectedIndex >= 0) {
    for (let offset = 1; offset <= jobs.length; offset += 1) {
      const candidate = jobs[(selectedIndex + offset) % jobs.length];
      const candidateKey = toKey(candidate?.id);
      if (candidateKey !== null && !hiddenJobIds.has(candidateKey)) {
        return candidate.id;
      }
    }
  }

  return resolveSelectedJobId(filterVisibleJobs(jobs, feedbackRecords), null);
}

export function resolveVisibleJobState({ jobs, selectedJobId, feedbackRecords }) {
  const visibleJobs = filterVisibleJobs(jobs, feedbackRecords);

  return {
    visibleJobs,
    hiddenJobIds: getHiddenJobIds(feedbackRecords),
    selectedJobId: resolveVisibleJobId(jobs, selectedJobId, feedbackRecords)
  };
}

/**
 * Applies a local HIDDEN record immediately so the role disappears before the
 * network round-trip finishes. Returns the profile patch and a rollback
 * snapshot that preserves any prior feedback (for example a bookmark).
 */
export function applyOptimisticHide(profileState, jobId) {
  const currentRecords = Array.isArray(profileState?.feedbackRecords)
    ? profileState.feedbackRecords
    : [];
  const jobKey = toKey(jobId);
  const retainedRecords = currentRecords.filter(record => (
    !(isJobFeedbackRecord(record) && toKey(record.entity_id) === jobKey)
  ));
  const feedbackRecords = [
    { entity_type: JOB_ENTITY_TYPE, entity_id: jobId, action: HIDDEN_ACTION, reason: '' },
    ...retainedRecords
  ];
  const visibility = resolveVisibleJobState({
    jobs: profileState?.jobsList,
    selectedJobId: profileState?.selectedJobId,
    feedbackRecords
  });

  return {
    patch: {
      feedbackRecords,
      selectedJobId: visibility.selectedJobId
    },
    snapshot: {
      feedbackRecords: currentRecords,
      selectedJobId: profileState?.selectedJobId ?? null
    }
  };
}

/** Restores the exact pre-hide feedback and selection after a failed request. */
export function rollbackHide(profileState, snapshot) {
  const feedbackRecords = Array.isArray(snapshot?.feedbackRecords)
    ? snapshot.feedbackRecords
    : [];
  const visibility = resolveVisibleJobState({
    jobs: profileState?.jobsList,
    selectedJobId: snapshot?.selectedJobId,
    feedbackRecords
  });

  return {
    feedbackRecords,
    selectedJobId: visibility.selectedJobId
  };
}

/**
 * Reconciles the profile with the authoritative feedback list returned after a
 * successful hide. Falls back to the optimistic records if the refresh fails.
 */
export function applyHideSuccess(profileState, feedbackRecords) {
  const records = Array.isArray(feedbackRecords)
    ? feedbackRecords
    : (Array.isArray(profileState?.feedbackRecords) ? profileState.feedbackRecords : []);
  const visibility = resolveVisibleJobState({
    jobs: profileState?.jobsList,
    selectedJobId: profileState?.selectedJobId,
    feedbackRecords: records
  });

  return {
    feedbackRecords: records,
    selectedJobId: visibility.selectedJobId
  };
}
