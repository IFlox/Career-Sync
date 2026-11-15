import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const adminPortalSource = await readFile(
  fileURLToPath(new URL('../../src/components/AdminPortal.jsx', import.meta.url)),
  'utf8'
);
const apiClientSource = await readFile(
  fileURLToPath(new URL('../../src/api/client.js', import.meta.url)),
  'utf8'
);

test('admin portal never invents a quality score fallback', () => {
  assert.doesNotMatch(adminPortalSource, /\|\|\s*70\b/);
  assert.doesNotMatch(adminPortalSource, /qualityScore\s*\|\|\s*quality_score\s*\|\|/);
  assert.match(adminPortalSource, /Unavailable/);
});

test('admin portal has no hardcoded skill-gap percentages', () => {
  assert.doesNotMatch(adminPortalSource, /\bpct:\s*(67|54|48|40)\b/);
  assert.doesNotMatch(adminPortalSource, /12%\s*boost/i);
});

test('summary cards read the live overview fields', () => {
  for (const field of [
    'average_quality_score',
    'high_risk_count',
    'approved_count',
    'cohort_size',
  ]) {
    assert.match(adminPortalSource, new RegExp(field));
  }
});

test('business thresholds remain but are not used as fabricated values', () => {
  assert.match(adminPortalSource, /< 6\.0/);
  assert.match(adminPortalSource, /CGPA &lt; 6\.0/);
});

test('average score card renders Unavailable when the live average is null', () => {
  assert.match(adminPortalSource, /average_quality_score !== null/);
  assert.match(adminPortalSource, /average_quality_score !== undefined/);
  assert.match(adminPortalSource, /hasAverageScore/);
  assert.match(adminPortalSource, /No candidate has a recorded quality score yet/);
});

test('refresh analytics button calls fetchAdminData and disables while running', () => {
  assert.match(adminPortalSource, /Refresh Analytics/);
  assert.match(adminPortalSource, /onClick=\{\(\) => fetchAdminData\(\{ reportErrors: true \}\)\}/);
  assert.match(adminPortalSource, /disabled=\{isRefreshing\}/);
  assert.match(adminPortalSource, /if \(refreshInFlight\.current\) return false;/);
});

test('a successful status update refreshes analytics afterwards', () => {
  assert.match(
    adminPortalSource,
    /await apiClient\.updateStudentStatus\([\s\S]*?await fetchAdminData\(\{ reportErrors: true \}\)/
  );
});

test('refresh failure keeps last values instead of fabricating analytics', () => {
  assert.doesNotMatch(adminPortalSource, /setOverviewAnalytics\(null\)/);
  assert.doesNotMatch(adminPortalSource, /catch\(\(\) => setStudents\(DEMO_PROFILES\)\)/);
  assert.match(adminPortalSource, /Showing the last loaded values/);
  assert.match(adminPortalSource, /prev\.length > 0 \? prev : DEMO_PROFILES/);
});

test('admin portal does not poll for analytics', () => {
  assert.doesNotMatch(adminPortalSource, /setInterval|setTimeout\(/);
});

test('empty live skill gaps are reported honestly instead of loading forever', () => {
  assert.match(adminPortalSource, /No skill gaps to report/);
  assert.match(
    adminPortalSource,
    /overviewStatus === "error"[\s\S]*?overviewStatus === "ready"[\s\S]*?No skill gaps to report/
  );
});

test('api client calls the admin analytics overview endpoint with admin headers', () => {
  assert.match(apiClientSource, /\/admin\/analytics\/overview/);
  assert.match(apiClientSource, /getAnalyticsOverview\(\)\s*\{[\s\S]*?getAdminHeaders\(\)/);
});

test('skill-gap chart is described as detected live signals, not guaranteed requirements', () => {
  assert.match(adminPortalSource, /Skills Missing Across Live Job Listings/);
  assert.match(
    adminPortalSource,
    /Based on skills detected in current live job titles, descriptions, and tags/
  );
  assert.doesNotMatch(adminPortalSource, /Most Common Skill Gaps Across Students/);
  assert.doesNotMatch(adminPortalSource, /Aggregated from current live job listings/);
});

test('skill-gap chart displays live skill-data coverage metadata', () => {
  for (const field of [
    'live_job_count',
    'jobs_with_skill_data',
    'skill_data_coverage_percentage',
  ]) {
    assert.match(adminPortalSource, new RegExp(field));
  }
  assert.match(adminPortalSource, /Live jobs analysed/);
  assert.match(adminPortalSource, /Jobs with skill data/);
  assert.match(adminPortalSource, /\{skillDataCoverage\}% skill data coverage/);
});

test('zero skill-data coverage renders an insufficient-data state', () => {
  assert.match(adminPortalSource, /Insufficient live skill data/);
  assert.match(adminPortalSource, /const hasInsufficientSkillData = overviewReady/);
});

test('admin portal never calculates percentages in the browser', () => {
  assert.doesNotMatch(adminPortalSource, /\*\s*100\b/);
  assert.doesNotMatch(adminPortalSource, /Math\.round/);
  assert.doesNotMatch(adminPortalSource, /missing_percentage\s*\//);
});

test('skill-gap bars still render the API batch_missing_skills values', () => {
  assert.match(adminPortalSource, /overviewAnalytics\?\.batch_missing_skills/);
  assert.match(adminPortalSource, /missingSkills\.map/);
  assert.match(adminPortalSource, /\{bar\.missing_percentage\}% of batch missing/);
});
