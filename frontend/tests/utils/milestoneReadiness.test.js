import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCompletedMilestonesToRoadmap,
  applyMilestoneToggleResult,
  normalizeCompletedMilestones
} from '../../src/utils/milestones.js';
import {
  buildProfileReadiness,
  computeMilestoneCompletion
} from '../../src/utils/readiness.js';
import {
  resolveRoadmapRecommendation
} from '../../src/utils/roadmapRecommendation.js';
import { getProfileState, updateProfileState } from '../../src/utils/profileState.js';

const ROADMAP = [
  { week: 1, skill: 'System Design', is_completed: false },
  { week: 2, skill: 'Docker', is_completed: false },
  { week: 3, skill: 'RAG Pipelines', is_completed: false },
  { week: 4, skill: 'FastAPI', is_completed: false }
];

const READINESS_INPUT = {
  skill_coverage: 71,
  interview_performance: 70,
  profile_quality: 88
};

function readinessFor(completedMilestones, roadmap = ROADMAP) {
  return buildProfileReadiness({
    roadmap,
    completedMilestones,
    ...READINESS_INPUT
  });
}

function initialProfileState(overrides = {}) {
  return {
    roadmap: ROADMAP,
    completedMilestones: [],
    ...overrides
  };
}

test('milestone completion applies the server list and recalculates readiness', () => {
  const before = readinessFor([]);
  const result = applyMilestoneToggleResult(
    { completed_milestones: [1], new_readiness: 99 },
    1,
    []
  );

  assert.deepEqual(result.completedMilestones, [1]);
  assert.equal(result.isCompleted, true);

  const after = readinessFor(result.completedMilestones);
  assert.equal(before.overall, 59);
  assert.equal(after.milestone_completion, 25);
  assert.equal(after.overall, 64);
  // The backend's separate ±5 readiness value is not used.
  assert.notEqual(after.overall, 99);
});

test('milestone reopening applies the server list and recalculates readiness', () => {
  const before = readinessFor([1, 2]);
  const result = applyMilestoneToggleResult(
    { completed_milestones: [2], new_readiness: 99 },
    1,
    [1, 2]
  );

  assert.deepEqual(result.completedMilestones, [2]);
  assert.equal(result.isCompleted, false);

  const after = readinessFor(result.completedMilestones);
  assert.equal(before.overall, 69);
  assert.equal(after.milestone_completion, 25);
  assert.equal(after.overall, 64);
});

test('a malformed toggle response keeps the profile milestone state', () => {
  const result = applyMilestoneToggleResult(
    { status: 'success' },
    1,
    [2]
  );

  assert.deepEqual(result.completedMilestones, [2]);
  assert.equal(result.isCompleted, false);
  assert.deepEqual(normalizeCompletedMilestones(undefined, [2, 2, '3']), [2, 3]);
});

test('shared readiness recalculation counts only visible roadmap weeks', () => {
  const readiness = readinessFor([1, 9, 'not-a-week']);

  assert.equal(computeMilestoneCompletion(ROADMAP, [1, 9, 'not-a-week']), 25);
  assert.equal(readiness.milestone_completion, 25);
  assert.equal(readiness.overall, 64);

  // Before the roadmap loads, the shared four-week plan denominator is used.
  const pendingRoadmap = readinessFor([1, 2], []);
  assert.equal(pendingRoadmap.milestone_completion, 50);
  assert.equal(pendingRoadmap.overall, 69);
});

test('reopening a milestone reopens its roadmap card and recommendation', () => {
  const loadedRoadmap = ROADMAP.map(item => ({
    ...item,
    is_completed: item.week <= 2
  }));

  const result = applyMilestoneToggleResult(
    { completed_milestones: [2] },
    1,
    [1, 2]
  );
  const syncedRoadmap = applyCompletedMilestonesToRoadmap(
    loadedRoadmap,
    result.completedMilestones
  );

  assert.equal(syncedRoadmap[0].is_completed, false);
  assert.equal(syncedRoadmap[1].is_completed, true);
  assert.equal(syncedRoadmap[2].is_completed, false);

  const view = resolveRoadmapRecommendation({
    roadmap: syncedRoadmap,
    completedMilestones: result.completedMilestones,
    targetRoleTitle: 'AI Systems & RAG Engineer',
    readiness: readinessFor(result.completedMilestones, syncedRoadmap)
  });

  assert.equal(view.recommendation.roadmap_week, 1);
  assert.equal(view.recommendation.projected_readiness, 69);
});

test('milestone responses stay isolated to the active profile', () => {
  let store = {};
  store = updateProfileState(store, 'stud-01', initialProfileState());
  store = updateProfileState(store, 'stud-02', initialProfileState({
    completedMilestones: [1, 2]
  }));

  const result = applyMilestoneToggleResult(
    { completed_milestones: [1] },
    1,
    getProfileState(store, 'stud-01').completedMilestones
  );
  store = updateProfileState(store, 'stud-01', {
    completedMilestones: result.completedMilestones
  });

  const first = getProfileState(store, 'stud-01');
  const second = getProfileState(store, 'stud-02');

  assert.deepEqual(first.completedMilestones, [1]);
  assert.deepEqual(second.completedMilestones, [1, 2]);
  assert.equal(readinessFor(first.completedMilestones).overall, 64);
  assert.equal(readinessFor(second.completedMilestones).overall, 69);
});

test('recommendation projection matches the readiness after that milestone completes', () => {
  const before = readinessFor([]);
  const view = resolveRoadmapRecommendation({
    roadmap: ROADMAP,
    completedMilestones: [],
    targetRoleTitle: 'AI Systems & RAG Engineer',
    readiness: before
  });

  assert.equal(view.status, 'ready');
  assert.equal(view.recommendation.roadmap_week, 1);
  assert.equal(view.recommendation.projected_readiness, 64);
  assert.match(view.recommendation.description, /from 59% to approximately 64%/);

  const after = readinessFor([1]);
  const nextView = resolveRoadmapRecommendation({
    roadmap: ROADMAP,
    completedMilestones: [1],
    targetRoleTitle: 'AI Systems & RAG Engineer',
    readiness: after
  });

  // The projection shown before completing Week 1 is now the displayed value.
  assert.equal(after.overall, view.recommendation.projected_readiness);
  assert.equal(nextView.recommendation.roadmap_week, 2);
  assert.equal(nextView.recommendation.projected_readiness, 69);
  assert.match(nextView.recommendation.description, /from 64% to approximately 69%/);
});

test('recommendation projection uses the same distinct-week denominator as readiness', () => {
  const multiItemRoadmap = [
    { week: 1, skill: 'System Design', is_completed: false },
    { week: 1, skill: 'Data Modeling', is_completed: false },
    { week: 2, skill: 'Docker', is_completed: false },
    { week: 3, skill: 'FastAPI', is_completed: false }
  ];

  const before = readinessFor([], multiItemRoadmap);
  const view = resolveRoadmapRecommendation({
    roadmap: multiItemRoadmap,
    completedMilestones: [],
    targetRoleTitle: 'Backend Engineer',
    readiness: before
  });
  const after = readinessFor([1], multiItemRoadmap);

  assert.equal(before.milestone_completion, 0);
  assert.equal(after.milestone_completion, 33);
  assert.equal(view.recommendation.roadmap_week, 1);
  assert.equal(view.recommendation.projected_readiness, after.overall);
});
