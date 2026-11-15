/**
 * AI learning-plan helpers.
 *
 * Roadmaps are generated at runtime by the backend AI engine. These helpers
 * keep the portal honest:
 * - only items marked AI_GENERATED are displayed, so a legacy seeded payload
 *   can never render as if it were part of the AI plan,
 * - provider names are never surfaced,
 * - a material link is only rendered for a safe http(s) URL, otherwise the
 *   plain-text search_query is turned into a search link.
 */

export const ROADMAP_LOAD_ERROR =
  'AI learning roadmap generation is unavailable right now. Please retry.';

export const ACTIVITY_LABELS = Object.freeze({
  HANDS_ON_LAB: 'Hands-on Lab',
  VIDEO: 'Video',
  DOC: 'Documentation'
});

const BLOCKED_URL_HOSTS = ['example.com', 'example.org', 'example.net', 'localhost'];

export function normalizeActivityType(value) {
  const type = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ACTIVITY_LABELS[type] ? type : null;
}

export function isSafeMaterialUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.toLowerCase();
  return Boolean(host) && !BLOCKED_URL_HOSTS.includes(host);
}

export function buildSearchUrl(searchQuery) {
  const query = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  if (!query) return null;
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Resolves the only material action the card may show. A fabricated or seeded
 * URL is ignored; the search_query is used instead.
 */
export function resolveMaterialLink(item) {
  if (!item || typeof item !== 'object') return null;

  if (isSafeMaterialUrl(item.url)) {
    return { href: item.url.trim(), label: 'Open material', kind: 'external' };
  }

  const href = buildSearchUrl(item.search_query);
  if (href) {
    return { href, label: 'Search for material', kind: 'search' };
  }

  return null;
}

export function isAiGeneratedRoadmapItem(item) {
  return Boolean(item) && item.content_origin === 'AI_GENERATED';
}

export function normalizeRoadmapItem(raw) {
  if (!isAiGeneratedRoadmapItem(raw)) return null;

  const week = Number(raw.week);
  const skill = typeof raw.skill === 'string' ? raw.skill.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!Number.isFinite(week) || week < 1 || !skill || !title) return null;

  const activityType = normalizeActivityType(raw.activity_type);
  const estimatedHours = Number(raw.estimated_hours ?? raw.allocated_hours);
  const weeklyBudget = Number(raw.weekly_budget);

  return {
    week,
    skill,
    title,
    learning_objective:
      typeof raw.learning_objective === 'string' ? raw.learning_objective.trim() : '',
    activity_type: activityType,
    activity_label: activityType ? ACTIVITY_LABELS[activityType] : 'Learning Activity',
    estimated_hours: Number.isFinite(estimatedHours) && estimatedHours > 0 ? estimatedHours : null,
    weekly_budget: Number.isFinite(weeklyBudget) && weeklyBudget > 0 ? weeklyBudget : null,
    study_note: typeof raw.study_note === 'string' ? raw.study_note.trim() : '',
    search_query: typeof raw.search_query === 'string' ? raw.search_query.trim() : '',
    // Only a safe external URL is kept; seeded provider/link fields are dropped.
    url: isSafeMaterialUrl(raw.url) ? raw.url.trim() : undefined,
    is_completed: Boolean(raw.is_completed),
    content_origin: 'AI_GENERATED'
  };
}

export function normalizeAiRoadmap(roadmap) {
  if (!Array.isArray(roadmap)) return [];

  return roadmap
    .map(normalizeRoadmapItem)
    .filter(Boolean)
    .sort((a, b) => a.week - b.week);
}

export function hasAiProvenance(roadmap) {
  return Array.isArray(roadmap)
    && roadmap.length > 0
    && roadmap.every(isAiGeneratedRoadmapItem);
}
