import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_VARIANT,
  DEFAULT_ERROR_MESSAGE,
  buildApplicationMessage,
  buildBookmarkMessage,
  buildHiddenJobMessage,
  buildMilestoneMessage,
  buildPreferencesMessage,
  buildResumeUploadMessage,
  buildUrlAnalysisMessage,
  createErrorFeedback,
  createInfoFeedback,
  createSuccessFeedback,
  formatSkillList,
  getErrorMessage
} from './feedback.js';

test('getErrorMessage preserves the real error message', () => {
  assert.equal(getErrorMessage(new Error('Upload processing error')), 'Upload processing error');
  assert.equal(getErrorMessage('Server rejected status update'), 'Server rejected status update');
  assert.equal(getErrorMessage(new Error('  spaced message  ')), 'spaced message');
});

test('getErrorMessage falls back when no usable message exists', () => {
  assert.equal(getErrorMessage(null), DEFAULT_ERROR_MESSAGE);
  assert.equal(getErrorMessage(undefined), DEFAULT_ERROR_MESSAGE);
  assert.equal(getErrorMessage(new Error('')), DEFAULT_ERROR_MESSAGE);
  assert.equal(getErrorMessage('   '), DEFAULT_ERROR_MESSAGE);
  assert.equal(getErrorMessage({}), DEFAULT_ERROR_MESSAGE);
  assert.equal(getErrorMessage(null, 'Custom fallback'), 'Custom fallback');
});

test('success and error feedback descriptors use the shared variants', () => {
  assert.deepEqual(createSuccessFeedback('Saved', 'All good.'), {
    variant: FEEDBACK_VARIANT.SUCCESS,
    title: 'Saved',
    message: 'All good.'
  });

  assert.deepEqual(createErrorFeedback('Failed', new Error('Real failure'), { fallback: 'Ignored' }), {
    variant: FEEDBACK_VARIANT.ERROR,
    title: 'Failed',
    message: 'Real failure'
  });

  assert.deepEqual(createInfoFeedback('Notice', 'Heads up.'), {
    variant: FEEDBACK_VARIANT.INFO,
    title: 'Notice',
    message: 'Heads up.'
  });
});

test('error feedback uses the fallback only when the error is empty', () => {
  const feedback = createErrorFeedback('Failed', null, { fallback: 'Try again in a moment.' });
  assert.equal(feedback.variant, FEEDBACK_VARIANT.ERROR);
  assert.equal(feedback.message, 'Try again in a moment.');
});

test('formatSkillList trims, drops blanks, and ignores non-string entries', () => {
  assert.equal(formatSkillList(['Docker', ' System Design ', '', null, 42]), 'Docker, System Design');
  assert.equal(formatSkillList(null), '');
  assert.equal(formatSkillList('Docker'), '');
  assert.equal(formatSkillList([]), '');
});

test('URL analysis message lists the extracted skills', () => {
  assert.equal(
    buildUrlAnalysisMessage(['RAG Pipelines', 'FastAPI']),
    'Extracted criteria: RAG Pipelines, FastAPI.'
  );
});

test('URL analysis message is honest when no skills were found', () => {
  assert.equal(
    buildUrlAnalysisMessage([]),
    'No skill criteria were detected in that listing.'
  );
  assert.equal(
    buildUrlAnalysisMessage(null),
    'No skill criteria were detected in that listing.'
  );
});

test('application message prefers the server response', () => {
  assert.equal(
    buildApplicationMessage('Enrolled for AI Systems. 2 of 3 drives used.', 'AI Systems'),
    'Enrolled for AI Systems. 2 of 3 drives used.'
  );
  assert.equal(
    buildApplicationMessage('', 'AI Systems'),
    'Application submitted for AI Systems.'
  );
  assert.equal(
    buildApplicationMessage(undefined, undefined),
    'Application submitted for this role.'
  );
});

test('bookmark messages describe the change that was saved', () => {
  assert.equal(buildBookmarkMessage(false, 'Backend Developer'), 'Bookmarked Backend Developer.');
  assert.equal(buildBookmarkMessage(true, 'Backend Developer'), 'Removed bookmark from Backend Developer.');
  assert.equal(buildBookmarkMessage(false, undefined), 'Bookmarked this role.');
});

test('hidden-role message names the role', () => {
  assert.equal(buildHiddenJobMessage('Data Engineer'), 'Moved Data Engineer to your hidden roles.');
  assert.equal(buildHiddenJobMessage(null), 'Moved this role to your hidden roles.');
});

test('milestone message reflects completed and reopened states', () => {
  assert.equal(buildMilestoneMessage(2, true), 'Week 2 milestone completed and saved.');
  assert.equal(buildMilestoneMessage(2, false), 'Week 2 milestone reopened.');
});

test('resume message includes the CGPA when the server returns one', () => {
  assert.equal(
    buildResumeUploadMessage('priya.pdf', 8.8),
    'Analyzed priya.pdf (CGPA: 8.8). Saved to your profile.'
  );
  assert.equal(
    buildResumeUploadMessage('priya.pdf', null),
    'Analyzed priya.pdf. Saved to your profile.'
  );
  assert.equal(
    buildResumeUploadMessage(undefined, 'not-a-number'),
    'Analyzed your resume. Saved to your profile.'
  );
});

test('preferences message confirms the dependent refreshes', () => {
  assert.match(buildPreferencesMessage(), /preferences were saved/i);
  assert.match(buildPreferencesMessage(), /roadmap/i);
});
