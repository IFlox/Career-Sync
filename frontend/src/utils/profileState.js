/**
 * Helpers for profile-scoped UI state.
 *
 * Every student keeps an independent state entry. Async responses always write
 * back to the student that requested them, so switching profiles can never
 * inherit another student's data. Request ids protect against out-of-order
 * responses for the same profile.
 */

export function getProfileState(store, studentId) {
  if (!studentId || !store) return undefined;
  return Object.prototype.hasOwnProperty.call(store, studentId)
    ? store[studentId]
    : undefined;
}

export function updateProfileState(store, studentId, patch, createDefault = () => ({})) {
  if (!studentId) return store || {};

  const current = getProfileState(store, studentId);
  const base = current || createDefault();
  const next = typeof patch === 'function' ? patch(base) : patch;

  return {
    ...(store || {}),
    [studentId]: { ...base, ...(next || {}) }
  };
}

export function beginRequest(requestIds, key) {
  if (!key) return 0;
  const next = (requestIds?.[key] || 0) + 1;
  if (requestIds) requestIds[key] = next;
  return next;
}

export function isLatestRequest(requestIds, key, requestId) {
  if (!key) return false;
  return requestIds?.[key] === requestId;
}

export function isResponseForStudent(requestStudentId, activeStudentId) {
  return Boolean(requestStudentId) && requestStudentId === activeStudentId;
}
