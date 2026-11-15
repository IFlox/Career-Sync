/**
 * Interview answer submission limits.
 *
 * These mirror the backend Pydantic contract in
 * `backend/routes/student_routes.py` (AnswerSubmitRequest.answer_text:
 * min_length=2, max_length=2000). The UI validates locally so a long pasted
 * answer is caught before the request, but it never truncates or rewrites the
 * student's text: the backend stays the source of truth and the student keeps
 * every character so they can edit it down themselves.
 */

export const INTERVIEW_ANSWER_MIN_LENGTH = 2;
export const INTERVIEW_ANSWER_MAX_LENGTH = 2000;

export function getInterviewAnswerValidation(answer) {
  const text = typeof answer === 'string' ? answer : '';
  const length = text.length;
  const isTooShort = text.trim().length < INTERVIEW_ANSWER_MIN_LENGTH;
  const isTooLong = length > INTERVIEW_ANSWER_MAX_LENGTH;

  let message = '';
  if (isTooLong) {
    message = `Your answer is ${length} characters. Trim it to ${INTERVIEW_ANSWER_MAX_LENGTH} characters or fewer to submit.`;
  } else if (isTooShort) {
    message = `Write at least ${INTERVIEW_ANSWER_MIN_LENGTH} characters to submit.`;
  }

  return {
    length,
    minLength: INTERVIEW_ANSWER_MIN_LENGTH,
    maxLength: INTERVIEW_ANSWER_MAX_LENGTH,
    isTooShort,
    isTooLong,
    canSubmit: !isTooShort && !isTooLong,
    message
  };
}
