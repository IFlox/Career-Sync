/**
 * Milestone state helpers.
 *
 * The milestone toggle endpoint is the source of truth for which weeks are
 * completed. These helpers only normalize that response so the portal can apply
 * it to the correct profile without a malformed payload erasing saved progress.
 * Readiness itself is never calculated here; see utils/readiness.js.
 */

export function normalizeCompletedMilestones(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : (Array.isArray(fallback) ? fallback : []);

  return Array.from(new Set(
    source
      .map(Number)
      .filter(Number.isFinite)
  ));
}

/**
 * Applies a toggle response to the milestone list of one profile.
 *
 * Returns the normalized list plus whether the toggled week is completed, so
 * the success message and the readiness recalculation both describe the same
 * response. A missing or malformed list keeps the previous state instead of
 * inventing progress.
 */
export function applyMilestoneToggleResult(
  response,
  weekNumber,
  previousMilestones = []
) {
  const completedMilestones = normalizeCompletedMilestones(
    response?.completed_milestones,
    previousMilestones
  );

  return {
    completedMilestones,
    isCompleted: completedMilestones.includes(Number(weekNumber))
  };
}

/**
 * Keeps the roadmap cards aligned with the authoritative milestone list.
 * Without this, a week completed when the roadmap first loaded would still
 * render as completed after it is reopened.
 */
export function applyCompletedMilestonesToRoadmap(roadmap, completedMilestones) {
  if (!Array.isArray(roadmap)) return [];

  const completed = new Set(normalizeCompletedMilestones(completedMilestones));

  return roadmap.map(item => {
    if (!item || typeof item !== 'object') return item;
    return {
      ...item,
      is_completed: completed.has(Number(item.week))
    };
  });
}
