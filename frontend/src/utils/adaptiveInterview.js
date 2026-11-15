/**
 * Adaptive interview question selection.
 *
 * The backend endpoint returns the question closest to the requested
 * difficulty. Because that selection is deterministic, asking again for the
 * same skill and difficulty can return the exact question the student just
 * answered. These helpers keep the "next question" flow honest:
 * - a genuinely different question is preferred,
 * - the request is retried once when the backend repeats itself,
 * - the existing frontend question bank is used as a bounded fallback,
 * - and state changes only advance the counter once a question is ready.
 */

import { MOCK_INTERVIEW_QUESTIONS } from '../data/seedData.js';

export const QUESTION_LOAD_ERROR = 'We could not load the next adaptive question. Please retry.';

export function normalizeQuestionText(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const question = typeof raw.question === 'string' ? raw.question.trim() : '';
  if (!question) return null;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
    : Array.isArray(raw.idealKeywords)
      ? raw.idealKeywords
      : [];

  return {
    ...raw,
    question,
    level: raw.level || 'Adaptive',
    keywords,
    difficulty: Number.isFinite(Number(raw.difficulty)) ? Number(raw.difficulty) : undefined
  };
}

export function isSameQuestion(first, second) {
  const firstText = normalizeQuestionText(first?.question);
  const secondText = normalizeQuestionText(second?.question);

  if (firstText && secondText) return firstText === secondText;
  if (first?.id && second?.id) return String(first.id) === String(second.id);
  return false;
}

/**
 * Picks the closest-difficulty question from the existing frontend bank that
 * is not the question currently on screen. Returns null when the bank has no
 * alternative for this skill.
 */
export function findAlternativeQuestion(bank, skill, difficulty, currentQuestion) {
  const entries = bank?.[skill];
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const candidates = entries
    .map(normalizeQuestion)
    .filter(Boolean)
    .filter(question => !isSameQuestion(question, currentQuestion));

  if (candidates.length === 0) return null;

  const target = Math.max(1, Math.min(10, Number(difficulty) || 6));
  return candidates.reduce((best, candidate) => {
    const bestDistance = Math.abs((best.difficulty ?? target) - target);
    const candidateDistance = Math.abs((candidate.difficulty ?? target) - target);
    return candidateDistance < bestDistance ? candidate : best;
  });
}

/**
 * Loads the next question. Retries once on a repeated question, then falls
 * back to the local question bank when it has an alternative. The retry count
 * is bounded so a deterministic endpoint cannot cause an infinite loop.
 *
 * Resolves with { question, attempts, usedFallback, sameQuestion }. Throws only
 * when loading failed and no local alternative exists.
 */
export async function loadNextAdaptiveQuestion({
  skill,
  difficulty,
  currentQuestion,
  fetchQuestion,
  bank = MOCK_INTERVIEW_QUESTIONS,
  maxRetries = 1
}) {
  if (typeof fetchQuestion !== 'function') {
    throw new Error(QUESTION_LOAD_ERROR);
  }

  const attemptsAllowed = Math.max(0, Number(maxRetries) || 0);
  let lastCandidate = null;
  let lastError = null;

  for (let attempt = 0; attempt <= attemptsAllowed; attempt += 1) {
    try {
      const candidate = normalizeQuestion(await fetchQuestion(skill, difficulty));
      lastCandidate = candidate;

      if (candidate && !isSameQuestion(candidate, currentQuestion)) {
        return {
          question: candidate,
          attempts: attempt + 1,
          usedFallback: false,
          sameQuestion: false
        };
      }
    } catch (error) {
      lastError = error;
      // Do not hammer a failing endpoint; surface the error after one try.
      break;
    }
  }

  const alternative = findAlternativeQuestion(bank, skill, difficulty, currentQuestion);
  if (alternative) {
    return {
      question: alternative,
      attempts: lastError ? 1 : attemptsAllowed + 1,
      usedFallback: true,
      sameQuestion: false
    };
  }

  if (lastError) throw lastError;

  if (lastCandidate) {
    return {
      question: lastCandidate,
      attempts: attemptsAllowed + 1,
      usedFallback: false,
      sameQuestion: true
    };
  }

  throw new Error(QUESTION_LOAD_ERROR);
}

export function beginNextQuestion(state = {}) {
  return {
    questionCount: state.questionCount ?? 1,
    answer: '',
    feedback: null,
    evaluationError: null,
    isLoadingQuestion: true,
    questionError: null
  };
}

export function finishNextQuestion(state = {}, question) {
  return {
    question,
    questionCount: (state.questionCount ?? 1) + 1,
    answer: '',
    feedback: null,
    evaluationError: null,
    isLoadingQuestion: false,
    questionError: null
  };
}

export function failNextQuestion(state = {}, message) {
  return {
    questionCount: state.questionCount ?? 1,
    isLoadingQuestion: false,
    questionError: message || QUESTION_LOAD_ERROR
  };
}
