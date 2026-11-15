import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPLOADED_CANDIDATES_STORAGE_KEY,
  addUploadedCandidateId,
  findCandidateProfile,
  loadUploadedCandidateIds,
  mergeCandidateProfiles,
  normalizeCandidateProfile,
  removeUploadedCandidateId,
  saveUploadedCandidateIds
} from '../../src/utils/profileCandidates.js';
import { getProfileState, updateProfileState } from '../../src/utils/profileState.js';

const DEMO = [
  { id: 'stud-01', name: 'Priya Sharma', branch: 'Computer Science & Engineering' },
  { id: 'stud-02', name: 'Rahul Verma', branch: 'Information Technology' },
  { id: 'stud-03', name: 'Amit Patel', branch: 'Electronics & Communication' }
];

const uploaded = (id, name = 'Uploaded Candidate', extra = {}) => ({
  id,
  name,
  branch: 'Engineering Division',
  source: 'uploaded',
  ...extra
});

const createStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
    removeItem: key => { delete data[key]; },
    dump: () => data
  };
};

test('an uploaded candidate appears in the selectable list after the demo profiles', () => {
  const catalog = mergeCandidateProfiles(DEMO, [uploaded('cand-abc123', 'Neha Iyer')]);

  assert.equal(catalog.length, 4);
  assert.deepEqual(catalog.slice(0, 3).map(p => p.id), ['stud-01', 'stud-02', 'stud-03']);
  assert.equal(catalog[3].id, 'cand-abc123');
  assert.equal(findCandidateProfile(catalog, 'cand-abc123').name, 'Neha Iyer');
});

test('demo profiles remain available and unchanged when no candidate was uploaded', () => {
  assert.deepEqual(mergeCandidateProfiles(DEMO, []), DEMO);
  assert.deepEqual(mergeCandidateProfiles(DEMO), DEMO);
  assert.equal(mergeCandidateProfiles(DEMO, undefined).length, 3);
});

test('switching away and back keeps the uploaded candidate selectable', () => {
  const catalog = mergeCandidateProfiles(DEMO, [uploaded('cand-abc123', 'Neha Iyer')]);

  const activeAfterUpload = findCandidateProfile(catalog, 'cand-abc123');
  const activeAfterSwitchAway = findCandidateProfile(catalog, 'stud-02');
  const activeAfterSwitchBack = findCandidateProfile(catalog, 'cand-abc123');

  assert.equal(activeAfterUpload.id, 'cand-abc123');
  assert.equal(activeAfterSwitchAway.id, 'stud-02');
  assert.equal(activeAfterSwitchBack.id, 'cand-abc123');
  assert.equal(catalog.length, 4);
});

test('switching away and back preserves that candidate profile state', () => {
  let store = updateProfileState({}, 'cand-abc123', {
    selectedJobId: 'job-ai-sys',
    interviewScore: 64
  });
  store = updateProfileState(store, 'stud-02', { selectedJobId: 'job-backend' });

  const restored = getProfileState(store, 'cand-abc123');
  assert.equal(restored.selectedJobId, 'job-ai-sys');
  assert.equal(restored.interviewScore, 64);
  assert.equal(getProfileState(store, 'stud-02').selectedJobId, 'job-backend');
});

test('uploading the same candidate twice keeps a single entry with the latest data', () => {
  const first = uploaded('cand-abc123', 'Neha Iyer', { cgpa: 7.1 });
  const second = uploaded('cand-abc123', 'Neha Iyer (updated)', { cgpa: 8.2 });

  const catalog = mergeCandidateProfiles(DEMO, [first, second]);

  assert.equal(catalog.length, 4);
  assert.equal(catalog.filter(p => p.id === 'cand-abc123').length, 1);
  assert.equal(findCandidateProfile(catalog, 'cand-abc123').cgpa, 8.2);
});

test('a candidate that shares a demo id never shadows the demo profile', () => {
  const catalog = mergeCandidateProfiles(DEMO, [uploaded('stud-01', 'Impostor')]);

  assert.equal(catalog.length, 3);
  assert.equal(findCandidateProfile(catalog, 'stud-01').name, 'Priya Sharma');
});

test('duplicate and malformed entries are ignored safely', () => {
  const catalog = mergeCandidateProfiles(
    [...DEMO, DEMO[0]],
    [null, { id: '' }, { name: 'No id' }, uploaded('cand-abc123'), uploaded('cand-abc123')]
  );

  assert.deepEqual(catalog.map(p => p.id), ['stud-01', 'stud-02', 'stud-03', 'cand-abc123']);
});

test('persisted uploaded ids survive a reload and are deduplicated', () => {
  const storage = createStorage();

  addUploadedCandidateId(storage, 'cand-abc123');
  addUploadedCandidateId(storage, 'cand-abc123');
  addUploadedCandidateId(storage, 'cand-def456');

  assert.deepEqual(loadUploadedCandidateIds(storage), ['cand-abc123', 'cand-def456']);
  assert.equal(
    JSON.parse(storage.dump()[UPLOADED_CANDIDATES_STORAGE_KEY]).length,
    2
  );
});

test('removing a candidate clears it from persistence', () => {
  const storage = createStorage();
  saveUploadedCandidateIds(storage, ['cand-abc123', 'cand-def456']);

  removeUploadedCandidateId(storage, 'cand-abc123');

  assert.deepEqual(loadUploadedCandidateIds(storage), ['cand-def456']);
});

test('corrupt or unavailable storage degrades to an empty list', () => {
  const corrupt = createStorage({ [UPLOADED_CANDIDATES_STORAGE_KEY]: '{not json' });
  const wrongShape = createStorage({ [UPLOADED_CANDIDATES_STORAGE_KEY]: '{"id":"cand-abc"}' });

  assert.deepEqual(loadUploadedCandidateIds(corrupt), []);
  assert.deepEqual(loadUploadedCandidateIds(wrongShape), []);
  assert.deepEqual(loadUploadedCandidateIds(undefined), []);
  assert.deepEqual(addUploadedCandidateId(undefined, 'cand-abc123'), []);
});

test('persisted student rows are normalized for the portal', () => {
  const profile = normalizeCandidateProfile({
    id: 'cand-abc123',
    name: 'Neha Iyer',
    branch: 'Engineering Division',
    cgpa: 8.15,
    active_apps_count: 2,
    sla_hours_pending: 3,
    admin_status: 'Pending',
    target_role: 'job-backend',
    skills: ['Python', 'FastAPI'],
    raw_resume: 'Resume text',
    quality_score: 84
  });

  assert.equal(profile.id, 'cand-abc123');
  assert.equal(profile.activeAppsCount, 2);
  assert.equal(profile.slaHoursPending, 3);
  assert.equal(profile.targetRole, 'job-backend');
  assert.equal(profile.qualityScore, 84);
  assert.deepEqual(profile.skills, ['Python', 'FastAPI']);
  assert.equal(profile.source, 'uploaded');
});

test('unusable records are rejected instead of produced as blank profiles', () => {
  assert.equal(normalizeCandidateProfile(null), null);
  assert.equal(normalizeCandidateProfile({}), null);
  assert.equal(normalizeCandidateProfile({ id: '   ' }), null);
});
