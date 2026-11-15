import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReadinessPayload,
  clampReadiness,
  computeOverallReadiness,
  syncNextActionReadiness
} from './readiness.js';

test('buildReadinessPayload uses the shared weighted formula', () => {
  const payload = buildReadinessPayload({
    skill_coverage: 71,
    interview_performance: 70,
    milestone_completion: 25,
    profile_quality: 88
  });

  assert.deepEqual(payload, {
    overall: 64,
    skill_coverage: 71,
    interview_performance: 70,
    milestone_completion: 25,
    profile_quality: 88
  });
});

test('computeOverallReadiness rounds and clamps component values', () => {
  assert.equal(computeOverallReadiness({
    skill_coverage: 120,
    interview_performance: -10,
    milestone_completion: 50,
    profile_quality: 100
  }), 65);
  assert.equal(clampReadiness('73.6'), 74);
  assert.equal(clampReadiness(undefined), 0);
});

test('syncNextActionReadiness keeps the server boost but rebases it on shared readiness', () => {
  const action = {
    headline: 'Complete Week 2 milestone for RAG Pipelines',
    description: 'Finishing this practical module will elevate your AI Systems & RAG Engineer readiness from 76% to approximately 81%.',
    projected_readiness: 81
  };

  const synced = syncNextActionReadiness(action, 64);

  assert.equal(synced.projected_readiness, 69);
  assert.match(synced.description, /from 64%/);
  assert.match(synced.description, /approximately 69%/);
  assert.doesNotMatch(synced.description, /76%|81%/);
});

test('syncNextActionReadiness uses a fallback baseline when the description has no range', () => {
  const action = {
    description: 'All weekly preparation milestones are complete.',
    projected_readiness: 81
  };

  const synced = syncNextActionReadiness(action, 64, 76);

  assert.equal(synced.projected_readiness, 69);
  assert.equal(synced.description, action.description);
});

test('syncNextActionReadiness leaves the action untouched without usable server data', () => {
  const action = {
    description: 'No server projection available.',
    projected_readiness: 81
  };

  assert.equal(syncNextActionReadiness(action, 64), action);
  assert.equal(syncNextActionReadiness(null, 64), null);
});
