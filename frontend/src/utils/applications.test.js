import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAppliedJob,
  deriveAppliedJobsFromProgress,
  getAppliedJobIds,
  isDuplicateApplicationError,
  isJobApplied,
  mergeAppliedJobIds,
  resolveApplicationActionState,
  restoreAppliedJobs
} from './applications.js';

const JOBS = [
  {
    id: 'job-ai-sys',
    title: 'AI Systems & RAG Engineer',
    company: 'NeuralWorks Labs'
  },
  {
    id: 'job-cloud-devops',
    title: 'Cloud DevOps Engineer',
    company: 'CloudScale Systems'
  },
  {
    id: 'job-backend',
    title: 'Backend Engineer',
    company: 'CloudScale Systems'
  }
];

const applicationEvent = (title, eventType = 'APPLICATION_SUBMITTED') => ({
  event_type: eventType,
  title
});

test('restores applied jobs from application events in progress history', () => {
  const progress = {
    recent_events: [
      applicationEvent('Applied to AI Systems & RAG Engineer at NeuralWorks Labs'),
      { event_type: 'INTERVIEW_EVALUATION', title: 'Technical Mock Interview: RAG Pipelines (Score: 8/10)' }
    ]
  };

  const restored = restoreAppliedJobs({ localJobIds: [], progress, jobs: JOBS });

  assert.deepEqual(restored, ['job-ai-sys']);
});

test('restoration merges local applications with history without duplicates', () => {
  const progress = {
    recent_events: [
      applicationEvent('Applied to AI Systems & RAG Engineer at NeuralWorks Labs')
    ]
  };

  const restored = restoreAppliedJobs({
    localJobIds: ['job-ai-sys', 'job-backend'],
    progress,
    jobs: JOBS
  });

  assert.deepEqual(restored, ['job-ai-sys', 'job-backend']);
});

test('restoration matches longer job titles before shorter substring collisions', () => {
  const jobs = [
    { id: 'job-short', title: 'AI Engineer', company: 'Acme' },
    { id: 'job-long', title: 'Senior AI Engineer', company: 'Acme' }
  ];
  const progress = {
    recent_events: [applicationEvent('Applied to Senior AI Engineer at Acme')]
  };

  assert.deepEqual(deriveAppliedJobsFromProgress(progress, jobs), ['job-long']);
});

test('already-applied state disables enrollment and labels the application as submitted', () => {
  const state = resolveApplicationActionState({ hasApplied: true });

  assert.equal(state.disabled, true);
  assert.equal(state.tone, 'applied');
  assert.equal(state.label, 'Application Submitted');
});

test('an in-flight submission disables enrollment to block duplicate attempts', () => {
  const state = resolveApplicationActionState({ isSubmitting: true });

  assert.equal(state.disabled, true);
  assert.equal(state.tone, 'submitting');
  assert.equal(state.label, 'Submitting Application...');
});

test('an applied job stays applied after a refresh-style restoration', () => {
  const appliedJobsByStudent = { 'stud-01': ['job-ai-sys'] };
  const progress = {
    recent_events: [
      applicationEvent('Applied to AI Systems & RAG Engineer at NeuralWorks Labs')
    ]
  };

  const restored = restoreAppliedJobs({
    localJobIds: getAppliedJobIds(appliedJobsByStudent, 'stud-01'),
    progress,
    jobs: JOBS
  });

  assert.equal(isJobApplied({ 'stud-01': restored }, 'stud-01', 'job-ai-sys'), true);
  assert.equal(
    resolveApplicationActionState({ hasApplied: restored.includes('job-ai-sys') }).disabled,
    true
  );
});

test('application state is scoped per student profile', () => {
  let state = {};
  state = addAppliedJob(state, 'stud-01', 'job-ai-sys');

  assert.deepEqual(getAppliedJobIds(state, 'stud-01'), ['job-ai-sys']);
  assert.deepEqual(getAppliedJobIds(state, 'stud-02'), []);
  assert.equal(isJobApplied(state, 'stud-02', 'job-ai-sys'), false);

  const progressForSecondStudent = {
    recent_events: [
      applicationEvent('Applied to Cloud DevOps Engineer at CloudScale Systems')
    ]
  };
  const restoredForSecond = restoreAppliedJobs({
    localJobIds: getAppliedJobIds(state, 'stud-02'),
    progress: progressForSecondStudent,
    jobs: JOBS
  });

  assert.deepEqual(restoredForSecond, ['job-cloud-devops']);
  assert.deepEqual(getAppliedJobIds(state, 'stud-01'), ['job-ai-sys']);
});

test('missing application data restores nothing instead of guessing', () => {
  assert.deepEqual(deriveAppliedJobsFromProgress(null, JOBS), []);
  assert.deepEqual(deriveAppliedJobsFromProgress({}, JOBS), []);
  assert.deepEqual(deriveAppliedJobsFromProgress({ recent_events: [] }, JOBS), []);
  assert.deepEqual(restoreAppliedJobs({ localJobIds: [], progress: null, jobs: JOBS }), []);
  assert.deepEqual(getAppliedJobIds(undefined, 'stud-01'), []);
});

test('non-application events are ignored during restoration', () => {
  const progress = {
    recent_events: [
      applicationEvent('Applied to Backend Engineer at CloudScale Systems', 'MILESTONE_COMPLETED')
    ]
  };

  assert.deepEqual(deriveAppliedJobsFromProgress(progress, JOBS), []);
});

test('loading history disables enrollment with a checking state', () => {
  const idle = resolveApplicationActionState({ isLoadingHistory: true });
  const loading = resolveApplicationActionState({ isLoadingHistory: true, historyError: null });

  assert.equal(idle.disabled, true);
  assert.equal(idle.tone, 'loading');
  assert.equal(idle.label, 'Checking Application History...');
  assert.equal(loading.disabled, true);
});

test('failed history disables enrollment instead of showing the job as available', () => {
  const state = resolveApplicationActionState({
    isLoadingHistory: false,
    historyError: 'Failed to load application history.'
  });

  assert.equal(state.disabled, true);
  assert.equal(state.tone, 'error');
  assert.equal(state.label, 'Application History Unavailable');
});

test('application cap still blocks enrollment after history is restored', () => {
  const state = resolveApplicationActionState({
    hasApplied: false,
    isLoadingHistory: false,
    historyError: null,
    isCapBlocked: true
  });

  assert.equal(state.disabled, true);
  assert.equal(state.label, 'Application Limit (3) Reached');
});

test('adding the same job twice never creates a duplicate application', () => {
  let state = {};
  state = addAppliedJob(state, 'stud-01', 'job-ai-sys');
  state = addAppliedJob(state, 'stud-01', 'job-ai-sys');
  state = addAppliedJob(state, 'stud-01', 'job-ai-sys');

  assert.deepEqual(getAppliedJobIds(state, 'stud-01'), ['job-ai-sys']);
});

test('merged application ids are deduplicated across sources', () => {
  assert.deepEqual(
    mergeAppliedJobIds(['job-ai-sys'], ['job-ai-sys', 'job-backend'], [], ['job-backend']),
    ['job-ai-sys', 'job-backend']
  );
});

test('duplicate backend responses are recognized as already applied', () => {
  assert.equal(
    isDuplicateApplicationError(new Error('An application for this job already exists.')),
    true
  );
  assert.equal(isDuplicateApplicationError({ message: 'Student already applied to this drive.' }), true);
  assert.equal(isDuplicateApplicationError('Duplicate application detected'), true);
  assert.equal(isDuplicateApplicationError(new Error('CGPA is below the eligibility cutoff.')), false);
  assert.equal(isDuplicateApplicationError(null), false);
});
