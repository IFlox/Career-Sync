import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTION_LOAD_ERROR,
  beginNextQuestion,
  failNextQuestion,
  finishNextQuestion,
  findAlternativeQuestion,
  isSameQuestion,
  loadNextAdaptiveQuestion,
  normalizeQuestion
} from './adaptiveInterview.js';

const RAG_CURRENT = {
  id: 'rag-q1',
  level: 'Intermediate',
  question:
    'How do you handle chunk boundary overlap and lost context when splitting documents into embeddings for RAG?',
  keywords: ['sliding window', 'overlap'],
  difficulty: 6
};

const RAG_ALTERNATIVE = {
  id: 'rag-q2',
  level: 'Advanced',
  question:
    'Explain the role of a cross-encoder re-ranker before feeding retrieved vectors to an LLM context window.',
  idealKeywords: ['cross-encoder', 're-ranking'],
  difficulty: 8
};

const RAG_BANK = {
  'RAG Pipelines': [RAG_CURRENT, RAG_ALTERNATIVE]
};

test('loads a genuinely new question in a single request', async () => {
  let calls = 0;
  const result = await loadNextAdaptiveQuestion({
    skill: 'RAG Pipelines',
    difficulty: 7,
    currentQuestion: RAG_CURRENT,
    fetchQuestion: async () => {
      calls += 1;
      return RAG_ALTERNATIVE;
    },
    bank: RAG_BANK
  });

  assert.equal(calls, 1);
  assert.equal(result.sameQuestion, false);
  assert.equal(result.usedFallback, false);
  assert.equal(result.question.question, RAG_ALTERNATIVE.question);
  assert.equal(result.question.level, 'Advanced');
  assert.deepEqual(result.question.keywords, ['cross-encoder', 're-ranking']);
});

test('question counter advances only after a question is ready', () => {
  const started = beginNextQuestion({
    questionCount: 3,
    answer: 'previous answer',
    feedback: { score: 8 },
    evaluationError: 'previous error'
  });
  assert.equal(started.questionCount, 3);

  const finished = finishNextQuestion({ questionCount: 3 }, RAG_ALTERNATIVE);
  assert.equal(finished.questionCount, 4);

  const failed = failNextQuestion({ questionCount: 3 }, 'network down');
  assert.equal(failed.questionCount, 3);
});

test('starting the next question clears the previous answer', () => {
  const started = beginNextQuestion({
    questionCount: 2,
    answer: 'An old submitted answer',
    feedback: { score: 7 }
  });

  assert.equal(started.answer, '');
});

test('starting the next question clears previous feedback and evaluation errors', () => {
  const started = beginNextQuestion({
    questionCount: 2,
    feedback: { score: 7, critique: 'Old critique' },
    evaluationError: 'Old evaluation failure'
  });

  assert.equal(started.feedback, null);
  assert.equal(started.evaluationError, null);
  assert.equal(started.isLoadingQuestion, true);
  assert.equal(started.questionError, null);
});

test('a repeated backend question is retried once, then replaced from the local bank', async () => {
  let calls = 0;
  const result = await loadNextAdaptiveQuestion({
    skill: 'RAG Pipelines',
    difficulty: 7,
    currentQuestion: RAG_CURRENT,
    fetchQuestion: async () => {
      calls += 1;
      return { ...RAG_CURRENT };
    },
    bank: RAG_BANK,
    maxRetries: 1
  });

  assert.equal(calls, 2, 'the request is bounded to one retry');
  assert.equal(result.sameQuestion, false);
  assert.equal(result.usedFallback, true);
  assert.equal(result.question.question, RAG_ALTERNATIVE.question);
});

test('a repeated question without alternatives does not loop forever', async () => {
  let calls = 0;
  const onlyQuestion = { question: 'Only Docker question available.', difficulty: 5 };
  const result = await loadNextAdaptiveQuestion({
    skill: 'Docker',
    difficulty: 5,
    currentQuestion: onlyQuestion,
    fetchQuestion: async () => {
      calls += 1;
      return { ...onlyQuestion };
    },
    bank: { Docker: [{ ...onlyQuestion }] },
    maxRetries: 1
  });

  assert.equal(calls, 2);
  assert.equal(result.attempts, 2);
  assert.equal(result.sameQuestion, true);
  assert.equal(result.usedFallback, false);
  assert.equal(result.question.question, onlyQuestion.question);
});

test('failed question loading rejects without retrying the endpoint', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      loadNextAdaptiveQuestion({
        skill: 'Unknown Skill',
        difficulty: 6,
        currentQuestion: RAG_CURRENT,
        fetchQuestion: async () => {
          calls += 1;
          throw new Error('network down');
        },
        bank: {},
        maxRetries: 1
      }),
    /network down/
  );

  assert.equal(calls, 1);
});

test('failed loading keeps the counter and exposes a retryable error', () => {
  const failed = failNextQuestion({ questionCount: 4 }, 'network down');

  assert.equal(failed.questionCount, 4);
  assert.equal(failed.isLoadingQuestion, false);
  assert.equal(failed.questionError, 'network down');
});

test('failed loading can use a local alternative instead of showing an error', async () => {
  const result = await loadNextAdaptiveQuestion({
    skill: 'RAG Pipelines',
    difficulty: 7,
    currentQuestion: RAG_CURRENT,
    fetchQuestion: async () => {
      throw new Error('network down');
    },
    bank: RAG_BANK
  });

  assert.equal(result.usedFallback, true);
  assert.equal(result.sameQuestion, false);
  assert.equal(result.question.question, RAG_ALTERNATIVE.question);
});

test('missing question payloads produce a clear fallback error', async () => {
  await assert.rejects(
    () =>
      loadNextAdaptiveQuestion({
        skill: 'Unknown Skill',
        difficulty: 6,
        currentQuestion: RAG_CURRENT,
        fetchQuestion: async () => null,
        bank: {},
        maxRetries: 0
      }),
    new RegExp(QUESTION_LOAD_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );
});

test('question comparison normalizes whitespace and casing', () => {
  assert.equal(
    isSameQuestion(
      { question: '  Explain   the RAG pipeline. ' },
      { question: 'explain the rag pipeline.' }
    ),
    true
  );
  assert.equal(
    isSameQuestion({ question: 'Explain the RAG pipeline.' }, { question: 'Explain the vector store.' }),
    false
  );
});

test('alternative selection prefers the closest difficulty and skips the current question', () => {
  const alternative = findAlternativeQuestion(RAG_BANK, 'RAG Pipelines', 7, RAG_CURRENT);
  assert.equal(alternative.question, RAG_ALTERNATIVE.question);

  const normalized = normalizeQuestion(RAG_ALTERNATIVE);
  assert.equal(normalized.level, 'Advanced');
  assert.deepEqual(normalized.keywords, ['cross-encoder', 're-ranking']);
});
