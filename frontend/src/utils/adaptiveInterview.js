/**
 * Adaptive interview question selection.
 *
 * Questions are generated at runtime by the AI provider. These helpers keep
 * the "next question" flow honest:
 * - a genuinely different question is preferred,
 * - the request is retried once when the provider repeats itself,
 * - and no seeded question bank is used as fallback. If generation fails, the
 *   caller surfaces the explicit unavailable error instead.
 */

export const QUESTION_LOAD_ERROR = 'AI interview question generation is unavailable right now. Please retry.';

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
    : Array.isArray(raw.expected_keywords)
      ? raw.expected_keywords
      : Array.isArray(raw.idealKeywords)
        ? raw.idealKeywords
        : [];

  return {
    ...raw,
    question,
    level: raw.level || 'Adaptive',
    keywords,
    expected_keywords: Array.isArray(raw.expected_keywords) ? raw.expected_keywords : keywords,
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
 * Loads the next runtime-generated question. Retries once when the provider
 * repeats the current question, then keeps that response and flags it. There
 * is no local/seeded fallback; transport or validation failures reject with the
 * provider's unavailable error.
 *
 * Resolves with { question, attempts, usedFallback, sameQuestion }.
 */
export async function loadNextAdaptiveQuestion({
  skill,
  difficulty,
  currentQuestion,
  fetchQuestion,
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
