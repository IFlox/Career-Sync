import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findNextRoadmapItem,
  resolveRoadmapRecommendation
} from '../../src/utils/roadmapRecommendation.js';
import { buildProfileReadiness } from '../../src/utils/readiness.js';

const ROADMAP = [
  { week: 1, skill: 'System Design', is_completed: false },
  { week: 2, skill: 'Docker', is_completed: false },
  { week: 3, skill: 'RAG Pipelines', is_completed: false },
  { week: 4, skill: 'FastAPI', is_completed: false }
];

const READINESS_COMPONENTS = {
  skill_coverage: 71,
  interview_performance: 70,
  profile_quality: 88
};

function readinessFor(completedMilestones) {
  return buildProfileReadiness({
    roadmap: ROADMAP,
    completedMilestones,
    ...READINESS_COMPONENTS
  });
}

function resolve(overrides = {}) {
  const completedMilestones = overrides.completedMilestones || [];

  return resolveRoadmapRecommendation({
    roadmap: ROADMAP,
    completedMilestones,
    targetRoleTitle: 'AI Systems & RAG Engineer',
    readiness: readinessFor(completedMilestones),
    ...overrides
  });
}

test('recommendation references the exact visible roadmap week and skill', () => {
  const view = resolve();

  assert.equal(view.status, 'ready');
  assert.equal(view.recommendation.roadmap_week, 1);
  assert.equal(view.recommendation.target_skill, 'System Design');
  assert.match(view.recommendation.headline, /Week 1 milestone for System Design/);
  assert.match(view.recommendation.description, /from 59% to approximately 64%/);
});

test('recommendation moves to the next incomplete visible roadmap week', () => {
  const view = resolve({ completedMilestones: [1] });

  assert.equal(view.status, 'ready');
  assert.equal(view.recommendation.roadmap_week, 2);
  assert.equal(view.recommendation.target_skill, 'Docker');
  assert.match(view.recommendation.headline, /Week 2 milestone for Docker/);
  assert.doesNotMatch(view.recommendation.headline, /System Design/);
});

test('recommendation handles a roadmap with every milestone completed', () => {
  const view = resolve({ completedMilestones: [1, 2, 3, 4] });

  assert.equal(view.status, 'complete');
  assert.equal(view.recommendation.roadmap_week, null);
  assert.equal(view.recommendation.target_skill, null);
  assert.match(view.recommendation.headline, /All roadmap milestones complete/);
});

test('missing roadmap data produces no recommendation', () => {
  assert.deepEqual(resolve({ roadmap: [] }), { status: 'empty' });
  assert.deepEqual(resolve({ roadmap: null }), { status: 'empty' });
  assert.equal(findNextRoadmapItem(null, []), null);
});

test('loading state wins over stale roadmap data and produces no recommendation', () => {
  const view = resolve({ isLoading: true });

  assert.deepEqual(view, { status: 'loading' });
});

test('roadmap error state is surfaced without a fake recommendation', () => {
  const view = resolve({ error: 'Roadmap service unavailable.' });

  assert.equal(view.status, 'error');
  assert.equal(view.message, 'Roadmap service unavailable.');
  assert.equal(view.recommendation, undefined);
});

test('malformed roadmap items do not generate a recommendation', () => {
  const view = resolve({
    roadmap: [{ week: null, skill: 'System Design' }]
  });

  assert.deepEqual(view, { status: 'empty' });
});
