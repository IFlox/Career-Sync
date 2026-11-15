/**
 * Selectable candidate profiles for the student portal.
 *
 * The three demo profiles are always available. Candidates created by a resume
 * upload are appended to the same list so they stay selectable after the user
 * switches to another profile.
 *
 * This module only manages the profile catalogue and its persisted ids. The
 * per-profile UI state continues to live in `profileState.js`.
 */

export const UPLOADED_CANDIDATES_STORAGE_KEY = 'careersync_uploaded_candidates';

const isValidProfile = (profile) =>
  Boolean(profile) && typeof profile.id === 'string' && profile.id.trim() !== '';

const field = (record, camelKey, snakeKey, fallback) => {
  if (record?.[camelKey] !== undefined && record?.[camelKey] !== null) return record[camelKey];
  if (record?.[snakeKey] !== undefined && record?.[snakeKey] !== null) return record[snakeKey];
  return fallback;
};

/**
 * Maps an uploaded-candidate record (upload response or persisted student row)
 * into the profile shape the portal renders. Returns null for unusable records.
 */
export function normalizeCandidateProfile(record) {
  if (!isValidProfile(record)) return null;

  return {
    id: record.id,
    name: field(record, 'name', 'name', 'Uploaded Candidate'),
    branch: field(record, 'branch', 'branch', 'Engineering Division'),
    cgpa: Number(field(record, 'cgpa', 'cgpa', 7.5)) || 0,
    activeAppsCount: Number(field(record, 'activeAppsCount', 'active_apps_count', 0)) || 0,
    slaHoursPending: Number(field(record, 'slaHoursPending', 'sla_hours_pending', 1)) || 0,
    adminStatus: field(record, 'adminStatus', 'admin_status', 'Pending'),
    targetRole: field(record, 'targetRole', 'target_role', ''),
    skills: Array.isArray(record.skills) ? record.skills : [],
    rawResume: field(record, 'rawResume', 'raw_resume', ''),
    qualityScore: Number(field(record, 'qualityScore', 'quality_score', 75)) || 0,
    weakBullets: Array.isArray(record.weakBullets) ? record.weakBullets : [],
    data_mode: record.data_mode || 'LIVE_DATA',
    source: 'uploaded'
  };
}

/**
 * Builds the selectable list. Demo profiles always come first and are never
 * shadowed by a candidate that shares an id. Repeated uploads of the same
 * candidate replace the previous entry in place instead of duplicating it.
 */
export function mergeCandidateProfiles(demoProfiles = [], uploadedProfiles = []) {
  const merged = [];
  const indexById = new Map();
  const demoIds = new Set();

  (Array.isArray(demoProfiles) ? demoProfiles : []).forEach(profile => {
    if (!isValidProfile(profile) || indexById.has(profile.id)) return;
    indexById.set(profile.id, merged.length);
    demoIds.add(profile.id);
    merged.push(profile);
  });

  (Array.isArray(uploadedProfiles) ? uploadedProfiles : []).forEach(profile => {
    if (!isValidProfile(profile) || demoIds.has(profile.id)) return;

    if (indexById.has(profile.id)) {
      merged[indexById.get(profile.id)] = profile;
      return;
    }

    indexById.set(profile.id, merged.length);
    merged.push(profile);
  });

  return merged;
}

export function findCandidateProfile(profiles, studentId) {
  if (!studentId) return null;
  return (profiles || []).find(profile => profile?.id === studentId) || null;
}

function uniqueIds(ids) {
  const seen = new Set();
  return (Array.isArray(ids) ? ids : []).filter(id => {
    if (typeof id !== 'string' || !id.trim() || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function loadUploadedCandidateIds(storage) {
  try {
    const raw = storage?.getItem(UPLOADED_CANDIDATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return uniqueIds(parsed);
  } catch {
    return [];
  }
}

export function saveUploadedCandidateIds(storage, ids) {
  const next = uniqueIds(ids);
  try {
    storage?.setItem(UPLOADED_CANDIDATES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort; the candidate still works for this session.
  }
  return next;
}

export function addUploadedCandidateId(storage, id) {
  if (!storage) return [];
  if (typeof id !== 'string' || !id.trim()) return loadUploadedCandidateIds(storage);
  return saveUploadedCandidateIds(storage, [...loadUploadedCandidateIds(storage), id]);
}

export function removeUploadedCandidateId(storage, id) {
  return saveUploadedCandidateIds(
    storage,
    loadUploadedCandidateIds(storage).filter(candidateId => candidateId !== id)
  );
}
