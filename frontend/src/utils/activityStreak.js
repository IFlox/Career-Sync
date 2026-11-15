/**
 * Activity-streak presentation rules.
 *
 * The saved-progress widget renders a fixed 14-dot activity grid, so the
 * highlighted dots must map one-to-one onto the reported streak length.
 * Missing or malformed data resolves to 0 rather than inventing activity.
 */

export const ACTIVITY_DOT_COUNT = 14;

export function normalizeActivityStreakDays(value) {
  if (value === null || value === undefined || value === '') return 0;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;

  return Math.min(ACTIVITY_DOT_COUNT, Math.max(0, Math.trunc(numeric)));
}

export function buildActivityDots(value, dotCount = ACTIVITY_DOT_COUNT) {
  const total = Number.isInteger(dotCount) && dotCount > 0 ? dotCount : ACTIVITY_DOT_COUNT;
  const activeDays = normalizeActivityStreakDays(value);

  return Array.from({ length: total }, (_, index) => ({
    index,
    isActive: index < activeDays
  }));
}

export function formatActivityStreakLabel(value) {
  const activeDays = normalizeActivityStreakDays(value);
  return `${activeDays} ${activeDays === 1 ? 'day' : 'days'} of prep logged`;
}
