import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInterviewSession,
  getInterviewSession,
  saveInterviewSession
} from '../../src/utils/interviewSession.js';

test('each student receives a fresh default interview session', () => {
  const priya = getInterviewSession({}, 'stud-01', 'RAG Pipelines');
  const rahul = getInterviewSession({}, 'stud-02', 'PostgreSQL');

  assert.equal(priya.currentSkill, 'RAG Pipelines');
  assert.equal(rahul.currentSkill, 'PostgreSQL');
  assert.deepEqual(rahul.sessionScores, []);
});

test('saved interview state is restored independently per student', () => {
  let cache = {};
  cache = saveInterviewSession(cache, 'stud-01', {
    ...createInterviewSession('RAG Pipelines'),
    currentQuestion: { question: 'Explain vector search.', level: 'Advanced', keywords: [] },
    feedback: { score: 8 },
    sessionScores: [7, 8]
  });
  cache = saveInterviewSession(cache, 'stud-02', {
    ...createInterviewSession('PostgreSQL'),
    feedback: { score: 5 },
    sessionScores: [5]
  });

  const priya = getInterviewSession(cache, 'stud-01', 'RAG Pipelines');
  const rahul = getInterviewSession(cache, 'stud-02', 'PostgreSQL');

  assert.equal(priya.currentQuestion.question, 'Explain vector search.');
  assert.deepEqual(priya.sessionScores, [7, 8]);
  assert.equal(priya.feedback.score, 8);
  assert.equal(rahul.currentQuestion.question, 'Loading adaptive question...');
  assert.deepEqual(rahul.sessionScores, [5]);
  assert.equal(rahul.feedback.score, 5);
});

test('leaving a profile clears only transient loading flags', () => {
  const cache = saveInterviewSession({}, 'stud-01', {
    ...createInterviewSession('RAG Pipelines'),
    isRecording: true,
    isEvaluating: true,
    isLoadingQuestion: true,
    questionError: 'Previous question failed.',
    sessionScores: [6]
  });

  assert.equal(cache['stud-01'].isRecording, false);
  assert.equal(cache['stud-01'].isEvaluating, false);
  assert.equal(cache['stud-01'].isLoadingQuestion, false);
  assert.equal(cache['stud-01'].questionError, 'Previous question failed.');
  assert.deepEqual(cache['stud-01'].sessionScores, [6]);
});

test('switching away and back restores the exact saved session', () => {
  let cache = {};
  const priyaSession = {
    ...createInterviewSession('System Design'),
    currentSkill: 'System Design',
    difficulty: 9,
    questionCount: 4,
    currentQuestion: { question: 'Design a rate limiter.', level: 'Advanced', keywords: ['Redis'] },
    sessionScores: [6, 8, 7]
  };
  cache = saveInterviewSession(cache, 'stud-01', priyaSession);
  cache = saveInterviewSession(cache, 'stud-02', createInterviewSession('Docker'));

  const restored = getInterviewSession(cache, 'stud-01', 'System Design');

  assert.equal(restored.currentSkill, 'System Design');
  assert.equal(restored.difficulty, 9);
  assert.equal(restored.questionCount, 4);
  assert.equal(restored.currentQuestion.question, 'Design a rate limiter.');
  assert.deepEqual(restored.sessionScores, [6, 8, 7]);
});
