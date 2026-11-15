import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_JOBS_EMPTY_MESSAGE,
  LIVE_JOBS_LOAD_ERROR,
  getLiveJobSourceName,
  hasLiveJobProvenance,
  isSafeLiveJobUrl,
  normalizeLiveJob,
  normalizeLiveJobs
} from '../../src/utils/liveJobs.js';

const LIVE_JOB = {
  id: 'live-acme-backend-1',
  source_job_id: 'acme-backend-1',
  title: 'Backend Engineer',
  company: 'Acme GmbH',
  location: 'Berlin',
  description: 'Build Python services with Docker.',
  required_skills: ['Python', 'Docker'],
  source_url: 'https://jobs.acme.example.org/roles/1',
  source_name: 'Arbeitnow',
  source_label: 'Arbeitnow live job board',
  fetched_at: '2026-01-02T03:04:05+00:00',
  content_origin: 'LIVE_DATA',
  data_mode: 'LIVE_DATA',
  is_live: true
};

test('normalizes a live listing without changing provider data', () => {
  const job = normalizeLiveJob(LIVE_JOB);

  assert.equal(job.id, LIVE_JOB.id);
  assert.equal(job.source_job_id, LIVE_JOB.source_job_id);
  assert.equal(job.title, LIVE_JOB.title);
  assert.equal(job.company, LIVE_JOB.company);
  assert.equal(job.description, LIVE_JOB.description);
  assert.deepEqual(job.requiredSkills, ['Python', 'Docker']);
  assert.deepEqual(job.required_skills, ['Python', 'Docker']);
  assert.equal(job.source_url, LIVE_JOB.source_url);
  assert.equal(job.content_origin, 'LIVE_DATA');
  assert.equal(job.data_mode, 'LIVE_DATA');
});

test('seeded, demo, and AI-generated jobs are rejected', () => {
  assert.equal(
    normalizeLiveJob({ ...LIVE_JOB, data_mode: 'DEMO_DATA' }),
    null
  );
  assert.equal(
    normalizeLiveJob({ ...LIVE_JOB, content_origin: 'AI_GENERATED' }),
    null
  );
  assert.equal(
    normalizeLiveJob({
      id: 'job-ai-sys',
      title: 'AI Systems & RAG Engineer',
      company: 'Anthropic / Enterprise Labs',
      requiredSkills: ['Python']
    }),
    null
  );
});

test('a listing without a valid source URL is not rendered', () => {
  for (const source_url of [
    '',
    'not a url',
    'ftp://jobs.acme.example.org/1',
    'https://example.com/jobs/1',
    'http://localhost:3000/jobs/1'
  ]) {
    assert.equal(normalizeLiveJob({ ...LIVE_JOB, source_url }), null);
  }
});

test('missing source ID, title, description, or provider name is rejected', () => {
  for (const field of ['source_job_id', 'title', 'description', 'source_name']) {
    assert.equal(normalizeLiveJob({ ...LIVE_JOB, [field]: '   ' }), null);
  }
});

test('safe source URLs accept real external hosts only', () => {
  assert.equal(isSafeLiveJobUrl('https://jobs.acme.com/roles/1'), true);
  assert.equal(isSafeLiveJobUrl('http://careers.acme.io/jobs/1'), true);
  assert.equal(isSafeLiveJobUrl('javascript:alert(1)'), false);
  assert.equal(isSafeLiveJobUrl('https://user:pass@jobs.acme.com/1'), false);
});

test('duplicate listings are removed by id, source id, and URL', () => {
  const sameId = { ...LIVE_JOB };
  const sameSourceId = { ...LIVE_JOB, id: 'live-other' };
  const sameUrl = {
    ...LIVE_JOB,
    id: 'live-third',
    source_job_id: 'third'
  };

  const jobs = normalizeLiveJobs([LIVE_JOB, sameId, sameSourceId, sameUrl]);
  assert.equal(jobs.length, 1);
  assert.deepEqual(normalizeLiveJobs(null), []);
});

test('provenance requires the backend LIVE_DATA markers', () => {
  assert.equal(hasLiveJobProvenance(LIVE_JOB), true);
  assert.equal(hasLiveJobProvenance({ ...LIVE_JOB, is_live: false }), false);
  assert.equal(hasLiveJobProvenance({ ...LIVE_JOB, fetched_at: '' }), false);
});

test('the source/provider name is shown from the listing', () => {
  assert.equal(getLiveJobSourceName(LIVE_JOB), 'Arbeitnow');
  assert.equal(getLiveJobSourceName(null), 'Live provider');
});

test('unavailable messages are explicit and retryable', () => {
  assert.match(LIVE_JOBS_LOAD_ERROR, /unavailable/i);
  assert.match(LIVE_JOBS_LOAD_ERROR, /retry/i);
  assert.match(LIVE_JOBS_EMPTY_MESSAGE, /no live/i);
});
