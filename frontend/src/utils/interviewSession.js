/**
 * Profile-scoped mock-interview session state.
 *
 * The interview component stays mounted while the active student changes, so
 * each student needs an independent session snapshot. Transient request flags
 * are cleared when a session is saved because an in-flight request belongs to
 * the profile being left behind.
 */

export const INTERVIEW_PLACEHOLDER_QUESTION = Object.freeze({
  question: "Loading adaptive question...",
  level: "Intermediate",
  keywords: []
});

export function hasRealInterviewQuestion(question) {
  return Boolean(question?.question) &&
    question.question !== INTERVIEW_PLACEHOLDER_QUESTION.question;
}

export function createInterviewSession(initialSkill = "RAG Pipelines") {
  return {
    currentSkill: initialSkill,
    difficulty: 6,
    currentQuestion: { ...INTERVIEW_PLACEHOLDER_QUESTION },
    questionCount: 1,
    answer: "",
    isRecording: false,
    isEvaluating: false,
    isLoadingQuestion: false,
    questionError: null,
    questionErrorSource: 'initial',
    questionNotice: null,
    evaluationError: null,
    feedback: null,
    sessionScores: [],
    speechNotice: null
  };
}

export function getInterviewSession(cache, studentId, initialSkill) {
  const saved = studentId && cache ? cache[studentId] : null;
  return saved
    ? { ...createInterviewSession(initialSkill), ...saved }
    : createInterviewSession(initialSkill);
}

export function saveInterviewSession(cache, studentId, session) {
  if (!studentId) return cache || {};

  return {
    ...(cache || {}),
    [studentId]: {
      ...session,
      isRecording: false,
      isEvaluating: false,
      isLoadingQuestion: false
    }
  };
}
