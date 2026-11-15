import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTechnicalJobs,
  isTechnicalJob,
  resolveSelectedJobId,
  selectTechnicalJobs
} from '../../src/utils/jobRelevance.js';

test('technical roles are retained across engineering families', () => {
  const roles = [
    { title: 'Software Engineer', requiredSkills: ['Python', 'AWS'] },
    { title: 'Senior Backend Developer', requiredSkills: ['Node.js', 'PostgreSQL'] },
    { title: 'Frontend Engineer', requiredSkills: ['React', 'TypeScript'] },
    { title: 'AI / ML Engineer', requiredSkills: ['PyTorch', 'Vector Embeddings'] },
    { title: 'Applied Data Scientist', requiredSkills: ['Python', 'Scikit-Learn'] },
    { title: 'Cloud Infrastructure Engineer', requiredSkills: ['AWS', 'Terraform'] },
    { title: 'DevOps Engineer', requiredSkills: ['Kubernetes', 'CI/CD'] },
    { title: 'Security Engineer', requiredSkills: ['OWASP', 'Penetration Testing'] },
    { title: 'QA Automation Engineer', requiredSkills: ['Selenium', 'Cypress'] },
    { title: 'Site Reliability Engineer', requiredSkills: ['Kubernetes', 'Prometheus'] },
    { title: 'Platform Engineer', requiredSkills: ['Docker', 'Linux'] }
  ];

  roles.forEach(role => {
    assert.equal(isTechnicalJob(role), true, `${role.title} should be retained`);
  });
});

test('non-technical business roles are excluded', () => {
  const roles = [
    { title: 'Account Executive', requiredSkills: ['Go'] },
    { title: 'Legal Counsel', requiredSkills: [] },
    { title: 'Senior Group Marketing Controller', requiredSkills: ['React', 'Go'] },
    { title: 'Senior People Operations Specialist', requiredSkills: ['Go'] },
    { title: 'Senior Price & Discount Strategy Manager', requiredSkills: ['SQL', 'Go'] },
    { title: 'Senior Executive Assistant to the CTO', requiredSkills: ['Go'] },
    { title: 'Director Spectrum Value Stream', requiredSkills: ['Go'] },
    { title: 'Strategic Core Account Executive - Insurance', requiredSkills: ['Go'] }
  ];

  roles.forEach(role => {
    assert.equal(isTechnicalJob(role), false, `${role.title} should be excluded`);
  });
});

test('generic skills do not rescue a clearly non-technical title', () => {
  assert.equal(
    isTechnicalJob({
      title: 'Marketing Operations Manager',
      requiredSkills: ['React', 'Go', 'SQL', 'AWS'],
      description: 'Build Python and Kubernetes workflows for campaign reporting.'
    }),
    false
  );
});

test('explicit metadata is preferred over the title', () => {
  assert.equal(
    isTechnicalJob({ title: 'Associate', category: 'Software Engineering', requiredSkills: [] }),
    true
  );
  assert.equal(
    isTechnicalJob({ title: 'Associate', department: 'Legal', requiredSkills: ['Python', 'AWS'] }),
    false
  );
  assert.equal(
    isTechnicalJob({ title: 'Platform Analyst', is_technical: false }),
    false
  );
  assert.equal(
    isTechnicalJob({ title: 'Business Analyst', isTechnical: true }),
    true
  );
});

test('missing metadata falls back to title and skills without crashing', () => {
  assert.equal(isTechnicalJob({ title: 'Backend Engineer' }), true);
  assert.equal(isTechnicalJob({ title: 'Account Executive' }), false);
  assert.equal(isTechnicalJob({}), false);
  assert.equal(isTechnicalJob(null), false);
  assert.equal(isTechnicalJob(undefined), false);
  assert.equal(
    isTechnicalJob({ requiredSkills: ['Python', 'Kubernetes'] }),
    true
  );
  assert.equal(
    isTechnicalJob({ requiredSkills: ['Go'] }),
    false
  );
  assert.equal(
    isTechnicalJob({ title: 'Member of Technical Staff', description: 'Build Python services on AWS with Kubernetes.' }),
    true
  );
});

test('live-style required_skills strings are understood', () => {
  assert.equal(
    isTechnicalJob({ title: 'Platform Engineer', required_skills: 'Kubernetes Docker AWS' }),
    true
  );
  assert.equal(
    isTechnicalJob({ title: 'Account Executive', required_skills: 'Go' }),
    false
  );

  const [job] = filterTechnicalJobs([
    { id: 'live-1', title: 'Platform Engineer', required_skills: 'Kubernetes Docker AWS' }
  ]);
  assert.deepEqual(
    [...job.requiredSkills].sort(),
    ['AWS', 'Docker', 'Kubernetes'].sort()
  );
  assert.deepEqual(job.required_skills, job.requiredSkills);
});

test('an empty or entirely non-technical feed returns an empty list', () => {
  assert.deepEqual(filterTechnicalJobs([]), []);
  assert.deepEqual(filterTechnicalJobs(null), []);
  assert.deepEqual(
    filterTechnicalJobs([
      { title: 'Account Executive' },
      { title: 'Legal Counsel' },
      { title: 'Marketing Manager' }
    ]),
    []
  );
});

test('selected job is preserved when it survives filtering', () => {
  const jobs = [
    { id: 'job-a', title: 'Backend Engineer' },
    { id: 'job-b', title: 'Frontend Engineer' }
  ];

  assert.equal(resolveSelectedJobId(jobs, 'job-b'), 'job-b');
});

test('selected job falls back to the first remaining valid job', () => {
  const jobs = [
    { id: 'job-a', title: 'Backend Engineer' },
    { id: 'job-b', title: 'Frontend Engineer' }
  ];

  assert.equal(resolveSelectedJobId(jobs, 'removed-role'), 'job-a');
  assert.equal(resolveSelectedJobId(jobs, null), 'job-a');
});

test('selected job is null when no valid jobs remain', () => {
  assert.equal(resolveSelectedJobId([], 'job-a'), null);
  assert.equal(resolveSelectedJobId(null, 'job-a'), null);
});

test('selectTechnicalJobs filters and repairs the selection together', () => {
  const rawJobs = [
    { id: 'sales-1', title: 'Account Executive' },
    { id: 'eng-1', title: 'Backend Engineer' },
    { id: 'eng-2', title: 'Data Engineer' }
  ];

  assert.deepEqual(selectTechnicalJobs(rawJobs, 'sales-1'), {
    jobs: [
      { id: 'eng-1', title: 'Backend Engineer', requiredSkills: [], required_skills: [] },
      { id: 'eng-2', title: 'Data Engineer', requiredSkills: [], required_skills: [] }
    ],
    selectedJobId: 'eng-1'
  });

  assert.deepEqual(selectTechnicalJobs(rawJobs, 'eng-2'), {
    jobs: [
      { id: 'eng-1', title: 'Backend Engineer', requiredSkills: [], required_skills: [] },
      { id: 'eng-2', title: 'Data Engineer', requiredSkills: [], required_skills: [] }
    ],
    selectedJobId: 'eng-2'
  });
});
