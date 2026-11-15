import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVIEW_ANSWER_MAX_LENGTH,
  INTERVIEW_ANSWER_MIN_LENGTH,
  getInterviewAnswerValidation
} from '../../src/utils/interviewAnswer.js';

test('answer exactly at the backend limit can be submitted', () => {
  const answer = 'a'.repeat(INTERVIEW_ANSWER_MAX_LENGTH);
  const result = getInterviewAnswerValidation(answer);

  assert.equal(result.length, 2000);
  assert.equal(result.isTooLong, false);
  assert.equal(result.canSubmit, true);
  assert.equal(result.message, '');
});

test('a long pasted answer over the limit is blocked without losing text', () => {
  const answer = `${'a'.repeat(INTERVIEW_ANSWER_MAX_LENGTH)}\nand one more line`;
  const result = getInterviewAnswerValidation(answer);

  assert.equal(result.length, answer.length);
  assert.ok(result.length > INTERVIEW_ANSWER_MAX_LENGTH);
  assert.equal(result.isTooLong, true);
  assert.equal(result.canSubmit, false);
  assert.match(result.message, new RegExp(`${answer.length} characters`));
  assert.match(result.message, /2000 characters or fewer/);

  // The student's text is never truncated; the same string is still available.
  assert.equal(answer.length, 2018);
  assert.ok(answer.endsWith('and one more line'));
});

test('answers shorter than the backend minimum are blocked', () => {
  assert.equal(getInterviewAnswerValidation('').canSubmit, false);
  assert.equal(getInterviewAnswerValidation('a').canSubmit, false);
  assert.equal(getInterviewAnswerValidation(' a ').canSubmit, false);
  assert.equal(getInterviewAnswerValidation('ab').canSubmit, true);
});

test('multi-line answers count every character the backend counts', () => {
  const line = `${'x'.repeat(48)}\n`;
  const answer = line.repeat(40) + 'x'.repeat(80);

  assert.ok(answer.length > INTERVIEW_ANSWER_MAX_LENGTH);
  assert.equal(answer.length, 2040);
  assert.equal(getInterviewAnswerValidation(answer).isTooLong, true);

  const exactlyAtLimit = answer.slice(0, INTERVIEW_ANSWER_MAX_LENGTH);
  const result = getInterviewAnswerValidation(exactlyAtLimit);

  assert.equal(exactlyAtLimit.length, INTERVIEW_ANSWER_MAX_LENGTH);
  assert.equal(result.canSubmit, true);
  assert.equal(INTERVIEW_ANSWER_MIN_LENGTH, 2);
});
