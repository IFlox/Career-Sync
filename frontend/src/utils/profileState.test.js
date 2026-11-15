import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginRequest,
  getProfileState,
  isLatestRequest,
  isResponseForStudent,
  updateProfileState
} from './profileState.js';

test('profile state is isolated per student', () => {
  const store = {};

  const withPriya = updateProfileState(store, 'stud-01', {
    selectedJobId: 'job-ai-sys',
    interviewScore: 82
  });
  const withRahul = updateProfileState(withPriya, 'stud-02', {
    selectedJobId: 'job-backend',
    interviewScore: 54
  });

  assert.equal(getProfileState(withRahul, 'stud-01').selectedJobId, 'job-ai-sys');
  assert.equal(getProfileState(withRahul, 'stud-01').interviewScore, 82);
  assert.equal(getProfileState(withRahul, 'stud-02').selectedJobId, 'job-backend');
  assert.equal(getProfileState(withRahul, 'stud-02').interviewScore, 54);
});

test('updating one profile never mutates other profiles', () => {
  const initial = updateProfileState({}, 'stud-01', {
    selectedJobId: 'job-ai-sys',
    completedMilestones: [1, 2]
  });
  const updated = updateProfileState(initial, 'stud-02', {
    selectedJobId: 'job-backend'
  });

  assert.notEqual(initial, updated);
  assert.deepEqual(initial['stud-01'].completedMilestones, [1, 2]);
  assert.equal(initial['stud-02'], undefined);
  assert.deepEqual(updated['stud-01'].completedMilestones, [1, 2]);
});

test('functional patches receive only the target profile state', () => {
  const store = updateProfileState({}, 'stud-01', {
    selectedJobId: 'job-ai-sys',
    jobsList: [{ id: 'job-ai-sys' }]
  });

  const updated = updateProfileState(store, 'stud-01', current => ({
    selectedJobId: current.jobsList[0].id
  }));

  assert.equal(updated['stud-01'].selectedJobId, 'job-ai-sys');
});

test('a missing profile starts from the supplied default state', () => {
  const updated = updateProfileState(
    {},
    'stud-03',
    { interviewScore: 44 },
    () => ({ interviewScore: 70, completedMilestones: [] })
  );

  assert.equal(updated['stud-03'].interviewScore, 44);
  assert.deepEqual(updated['stud-03'].completedMilestones, []);
});

test('request ids reject stale responses for the same profile', () => {
  const requestIds = {};
  const first = beginRequest(requestIds, 'roadmap:stud-01');
  const second = beginRequest(requestIds, 'roadmap:stud-01');

  assert.equal(isLatestRequest(requestIds, 'roadmap:stud-01', first), false);
  assert.equal(isLatestRequest(requestIds, 'roadmap:stud-01', second), true);
});

test('request ids are independent across profiles', () => {
  const requestIds = {};
  const priyaRequest = beginRequest(requestIds, 'progress:stud-01');
  const rahulRequest = beginRequest(requestIds, 'progress:stud-02');

  assert.equal(isLatestRequest(requestIds, 'progress:stud-01', priyaRequest), true);
  assert.equal(isLatestRequest(requestIds, 'progress:stud-02', rahulRequest), true);
});

test('responses are only accepted for the student that requested them', () => {
  assert.equal(isResponseForStudent('stud-01', 'stud-01'), true);
  assert.equal(isResponseForStudent('stud-01', 'stud-02'), false);
  assert.equal(isResponseForStudent(null, 'stud-01'), false);
});
