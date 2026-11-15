import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_LABELS,
  ROADMAP_LOAD_ERROR,
  buildSearchUrl,
  hasAiProvenance,
  isSafeMaterialUrl,
  normalizeAiRoadmap,
  normalizeRoadmapItem,
  resolveMaterialLink
} from '../../src/utils/learningPlan.js';

const AI_ITEM = {
  week: 2,
  skill: 'Docker',
  title: 'Build a multi-stage production image',
  learning_objective: 'Explain how layer caching and build stages reduce image size.',
  activity_type: 'HANDS_ON_LAB',
  estimated_hours: 4,
  study_note: 'Compare a single-stage and multi-stage build for the same service.',
  search_query: 'docker multistage build tutorial',
  content_origin: 'AI_GENERATED',
  is_completed: false
};

const SEEDED_ITEM = {
  week: 1,
  skill: 'Docker',
  title: 'Docker & Containerization Bootcamp',
  provider: 'FreeCodeCamp & Docker Docs',
  url: 'https://docs.docker.com/get-started/',
  format_badge: '🛠️ Hands-on Project Lab'
};

test('normalizes an AI-generated learning week and keeps its provenance', () => {
  const normalized = normalizeRoadmapItem(AI_ITEM);

  assert.equal(normalized.week, 2);
  assert.equal(normalized.skill, 'Docker');
  assert.equal(normalized.activity_type, 'HANDS_ON_LAB');
  assert.equal(normalized.activity_label, ACTIVITY_LABELS.HANDS_ON_LAB);
  assert.equal(normalized.estimated_hours, 4);
  assert.equal(normalized.content_origin, 'AI_GENERATED');
  assert.equal(normalized.provider, undefined);
});

test('legacy seeded roadmap items are rejected instead of displayed', () => {
  assert.equal(normalizeRoadmapItem(SEEDED_ITEM), null);
  assert.deepEqual(normalizeAiRoadmap([SEEDED_ITEM, AI_ITEM]).map(item => item.week), [2]);
  assert.deepEqual(normalizeAiRoadmap(null), []);
});

test('roadmap weeks are returned in order and invalid items are dropped', () => {
  const roadmap = normalizeAiRoadmap([
    { ...AI_ITEM, week: 3 },
    { ...AI_ITEM, week: 1 },
    { ...AI_ITEM, week: 'not-a-week' },
    { ...AI_ITEM, week: 2, title: '  ' }
  ]);

  assert.deepEqual(roadmap.map(item => item.week), [1, 3]);
});

test('provenance is only reported when every visible week is AI generated', () => {
  assert.equal(hasAiProvenance([AI_ITEM]), true);
  assert.equal(hasAiProvenance([]), false);
  assert.equal(hasAiProvenance([AI_ITEM, SEEDED_ITEM]), false);
  assert.equal(hasAiProvenance([SEEDED_ITEM]), false);
});

test('a fabricated or placeholder URL is never offered as material', () => {
  assert.equal(isSafeMaterialUrl('https://example.com/docker'), false);
  assert.equal(isSafeMaterialUrl('http://localhost:8000/docs'), false);
  assert.equal(isSafeMaterialUrl('javascript:alert(1)'), false);
  assert.equal(isSafeMaterialUrl('not a url'), false);
  assert.equal(isSafeMaterialUrl('https://docs.docker.com/get-started/'), true);
});

test('search_query is used when no safe URL exists', () => {
  const link = resolveMaterialLink(AI_ITEM);
  assert.equal(link.kind, 'search');
  assert.equal(link.label, 'Search for material');
  assert.equal(
    link.href,
    'https://duckduckgo.com/?q=docker%20multistage%20build%20tutorial'
  );

  const unsafe = resolveMaterialLink({ ...AI_ITEM, url: 'https://example.com/fake' });
  assert.equal(unsafe.kind, 'search');
});

test('a safe URL wins over the search query', () => {
  const link = resolveMaterialLink({ ...AI_ITEM, url: 'https://docs.docker.com/get-started/' });
  assert.equal(link.kind, 'external');
  assert.equal(link.href, 'https://docs.docker.com/get-started/');
});

test('an item with neither a safe URL nor a search query renders no link', () => {
  assert.equal(resolveMaterialLink({ ...AI_ITEM, search_query: '' }), null);
  assert.equal(buildSearchUrl('   '), null);
  assert.equal(buildSearchUrl('rag pipeline'), 'https://duckduckgo.com/?q=rag%20pipeline');
});

test('unknown activity types fall back to a neutral label', () => {
  const normalized = normalizeRoadmapItem({ ...AI_ITEM, activity_type: 'PODCAST' });
  assert.equal(normalized.activity_type, null);
  assert.equal(normalized.activity_label, 'Learning Activity');
});

test('the roadmap unavailable message is explicit and retryable', () => {
  assert.match(ROADMAP_LOAD_ERROR, /unavailable/i);
  assert.match(ROADMAP_LOAD_ERROR, /retry/i);
});
