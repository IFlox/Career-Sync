import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHideSuccess,
  applyOptimisticHide,
  filterVisibleJobs,
  getHiddenJobIds,
  resolveVisibleJobId,
  resolveVisibleJobState,
  rollbackHide
} from './hiddenJobs.js';
import {
  beginRequest,
  getProfileState,
  isLatestRequest,
  updateProfileState
} from './profileState.js';

const JOBS = [
  { id: 'job-a', title: 'Backend Engineer' },
  { id: 'job-b', title: 'Frontend Engineer' },
  { id: 'job-c', title: 'Data Engineer' }
];

const SAVED_A = { entity_type: 'JOB', entity_id: 'job-a', action: 'SAVED' };
const HIDDEN = id => ({ entity_type: 'JOB', entity_id: id, action: 'HIDDEN' });

function profileState(overrides = {}) {
  return {
    jobsList: JOBS,
    selectedJobId: 'job-a',
    feedbackRecords: [],
    ...overrides
  };
}

test('a hidden job is removed while bookmarked jobs stay visible', () => {
  const records = [SAVED_A, HIDDEN('job-b')];
  const visible = filterVisibleJobs(JOBS, records);

  assert.deepEqual(visible.map(job => job.id), ['job-a', 'job-c']);
  assert.deepEqual([...getHiddenJobIds(records)], ['job-b']);
});

test('hiding a selected job selects the next visible technical job', () => {
  assert.equal(resolveVisibleJobId(JOBS, 'job-b', [HIDDEN('job-b')]), 'job-c');
  // The last role wraps to the first remaining role.
  assert.equal(resolveVisibleJobId(JOBS, 'job-c', [HIDDEN('job-c')]), 'job-a');
  // A visible selection is never disturbed.
  assert.equal(resolveVisibleJobId(JOBS, 'job-a', [HIDDEN('job-b')]), 'job-a');
});

test('hiding the final visible job yields the empty selection', () => {
  const records = JOBS.map(job => HIDDEN(job.id));
  const state = resolveVisibleJobState({
    jobs: JOBS,
    selectedJobId: 'job-b',
    feedbackRecords: records
  });

  assert.deepEqual(state.visibleJobs, []);
  assert.equal(state.selectedJobId, null);
});

test('feedback loaded after refresh restores hidden jobs and repairs the selection', () => {
  const restoredFeedback = [HIDDEN('job-a'), HIDDEN('job-b')];
  const state = resolveVisibleJobState({
    jobs: JOBS,
    selectedJobId: 'job-b',
    feedbackRecords: restoredFeedback
  });

  assert.deepEqual(state.visibleJobs.map(job => job.id), ['job-c']);
  assert.equal(state.selectedJobId, 'job-c');
});

test('hide results stay isolated to the requesting student profile', () => {
  let store = {};
  store = updateProfileState(store, 'stud-01', profileState({ selectedJobId: 'job-b' }));
  store = updateProfileState(store, 'stud-02', profileState({ selectedJobId: 'job-b' }));

  const requestIds = {};
  const firstRequest = beginRequest(requestIds, 'feedback-action:stud-01');
  beginRequest(requestIds, 'feedback-action:stud-02');

  const optimistic = applyOptimisticHide(getProfileState(store, 'stud-01'), 'job-b');
  store = updateProfileState(store, 'stud-01', optimistic.patch);

  // A stale response for the older profile is still allowed to finish its own
  // request, but it must never touch the other student's state.
  assert.equal(isLatestRequest(requestIds, 'feedback-action:stud-01', firstRequest), true);
  assert.equal(getProfileState(store, 'stud-01').selectedJobId, 'job-c');
  assert.deepEqual(getProfileState(store, 'stud-01').feedbackRecords.map(r => r.entity_id), ['job-b']);

  const second = getProfileState(store, 'stud-02');
  assert.equal(second.selectedJobId, 'job-b');
  assert.deepEqual(second.feedbackRecords, []);
  assert.deepEqual(second.jobsList.map(job => job.id), ['job-a', 'job-b', 'job-c']);
});

test('a failed hide rolls back visibility and preserves an existing bookmark', () => {
  const before = profileState({
    selectedJobId: 'job-b',
    feedbackRecords: [SAVED_A]
  });

  const optimistic = applyOptimisticHide(before, 'job-b');
  const hiddenState = { ...before, ...optimistic.patch };

  assert.equal(hiddenState.selectedJobId, 'job-c');
  assert.deepEqual(hiddenState.feedbackRecords.map(r => r.entity_id), ['job-b', 'job-a']);

  const rolledBack = rollbackHide(hiddenState, optimistic.snapshot);

  assert.equal(rolledBack.selectedJobId, 'job-b');
  assert.deepEqual(rolledBack.feedbackRecords, [SAVED_A]);
  // The bookmark record is restored, not stripped, by the failed hide.
  assert.equal(rolledBack.feedbackRecords[0].action, 'SAVED');
  assert.deepEqual(filterVisibleJobs(JOBS, rolledBack.feedbackRecords).map(job => job.id), [
    'job-a',
    'job-b',
    'job-c'
  ]);
});

test('a successful hide reconciles with the canonical feedback response', () => {
  const current = profileState({
    selectedJobId: 'job-c',
    feedbackRecords: [HIDDEN('job-b')]
  });
  const reconciled = applyHideSuccess(current, [HIDDEN('job-b'), HIDDEN('job-c')]);

  assert.equal(reconciled.selectedJobId, 'job-a');
  assert.deepEqual(reconciled.feedbackRecords.map(r => r.entity_id), ['job-b', 'job-c']);
});
