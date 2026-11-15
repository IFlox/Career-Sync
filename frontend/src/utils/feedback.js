/**
 * Shared inline-feedback helpers.
 *
 * These keep success copy and error normalization consistent across flows
 * while preserving the real message returned by the API.
 */

export const FEEDBACK_VARIANT = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info'
});

export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const candidate = typeof error === 'string' ? error : error?.message;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  return fallback;
}

export function createSuccessFeedback(title, message) {
  return { variant: FEEDBACK_VARIANT.SUCCESS, title, message };
}

export function createErrorFeedback(title, error, { fallback = DEFAULT_ERROR_MESSAGE } = {}) {
  return { variant: FEEDBACK_VARIANT.ERROR, title, message: getErrorMessage(error, fallback) };
}

export function createInfoFeedback(title, message) {
  return { variant: FEEDBACK_VARIANT.INFO, title, message };
}

export function formatSkillList(skills) {
  if (!Array.isArray(skills)) return '';

  return skills
    .filter(skill => typeof skill === 'string')
    .map(skill => skill.trim())
    .filter(Boolean)
    .join(', ');
}

export function buildUrlAnalysisMessage(skills) {
  const summary = formatSkillList(skills);
  return summary
    ? `Extracted criteria: ${summary}.`
    : 'No skill criteria were detected in that listing.';
}

export function buildApplicationMessage(serverMessage, jobTitle) {
  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage.trim();
  }
  return `Application submitted for ${jobTitle || 'this role'}.`;
}

export function buildBookmarkMessage(isSaved, jobTitle) {
  const title = jobTitle || 'this role';
  return isSaved ? `Removed bookmark from ${title}.` : `Bookmarked ${title}.`;
}

export function buildHiddenJobMessage(jobTitle) {
  return `Moved ${jobTitle || 'this role'} to your hidden roles.`;
}

export function buildMilestoneMessage(weekNumber, isCompleted) {
  return isCompleted
    ? `Week ${weekNumber} milestone completed and saved.`
    : `Week ${weekNumber} milestone reopened.`;
}

export function buildResumeUploadMessage(fileName, cgpa) {
  const name = fileName || 'your resume';
  const score = cgpa === null || cgpa === undefined || cgpa === '' ? null : Number(cgpa);

  return Number.isFinite(score)
    ? `Analyzed ${name} (CGPA: ${score}). Saved to your profile.`
    : `Analyzed ${name}. Saved to your profile.`;
}

export function buildPreferencesMessage() {
  return 'Your career preferences were saved. Job rankings and your roadmap are refreshing.';
}
