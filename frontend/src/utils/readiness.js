/**
 * Shared placement-readiness calculations.
 *
 * The same holistic formula drives the header, the overall readiness card,
 * the placement dossier, the next-best-step projection, and the current value
 * shown by the saved-progress widget:
 *
 * readiness = 0.40 * skill_coverage + 0.25 * interview_performance
 *           + 0.20 * milestone_completion + 0.15 * profile_quality
 */

export const READINESS_WEIGHTS = Object.freeze({
  skill_coverage: 0.40,
  interview_performance: 0.25,
  milestone_completion: 0.20,
  profile_quality: 0.15
});

const MAX_READINESS = 99;

// The preparation plan is advertised as four weeks; used when the roadmap is
// not available yet so the milestone component keeps a stable denominator.
export const ROADMAP_PLAN_WEEKS = 4;

export function clampReadiness(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function computeOverallReadiness({
  skill_coverage,
  interview_performance,
  milestone_completion,
  profile_quality
} = {}) {
  return clampReadiness(
    (READINESS_WEIGHTS.skill_coverage * clampReadiness(skill_coverage)) +
    (READINESS_WEIGHTS.interview_performance * clampReadiness(interview_performance)) +
    (READINESS_WEIGHTS.milestone_completion * clampReadiness(milestone_completion)) +
    (READINESS_WEIGHTS.profile_quality * clampReadiness(profile_quality))
  );
}

export function buildReadinessPayload(input = {}) {
  const components = {
    skill_coverage: clampReadiness(input.skill_coverage),
    interview_performance: clampReadiness(input.interview_performance),
    milestone_completion: clampReadiness(input.milestone_completion),
    profile_quality: clampReadiness(input.profile_quality)
  };

  return {
    overall: computeOverallReadiness(components),
    ...components
  };
}

/**
 * Distinct week numbers in the roadmap that is currently on screen.
 */
export function resolveRoadmapWeeks(roadmap) {
  if (!Array.isArray(roadmap)) return [];

  const weeks = [];
  roadmap.forEach(item => {
    const week = Number(item?.week);
    if (Number.isFinite(week) && !weeks.includes(week)) weeks.push(week);
  });

  return weeks;
}

/**
 * Milestone completion for the plan actually being displayed.
 *
 * Only weeks that belong to the visible roadmap count, so readiness never
 * credits milestones from a different target role. When the roadmap has not
 * loaded yet, completed weeks inside the standard four-week plan are used.
 * This is the single input for the milestone component of the readiness
 * formula; the overall readiness formula itself stays unchanged.
 */
export function computeMilestoneCompletion(roadmap, completedMilestones = []) {
  const completed = new Set(
    (Array.isArray(completedMilestones) ? completedMilestones : []).map(Number)
  );
  const weeks = resolveRoadmapWeeks(roadmap);

  if (weeks.length === 0) {
    const completedInPlan = Array.from(completed).filter(
      week => Number.isFinite(week) && week >= 1 && week <= ROADMAP_PLAN_WEEKS
    ).length;
    return clampReadiness((completedInPlan / ROADMAP_PLAN_WEEKS) * 100);
  }

  const completedWeeks = weeks.filter(week => completed.has(week)).length;
  return clampReadiness((completedWeeks / weeks.length) * 100);
}

/**
 * The readiness payload displayed by the portal.
 *
 * This is the single entry point for page readiness: milestone completion is
 * always derived from the visible roadmap and the saved milestone list, then
 * fed through the shared weighted formula. Callers must not calculate a
 * separate milestone percentage or overall score.
 */
export function buildProfileReadiness({
  roadmap,
  completedMilestones = [],
  skill_coverage,
  interview_performance,
  profile_quality
} = {}) {
  return buildReadinessPayload({
    skill_coverage,
    interview_performance,
    milestone_completion: computeMilestoneCompletion(roadmap, completedMilestones),
    profile_quality
  });
}

/**
 * Rewrites the server recommendation's readiness projection so it starts from
 * the shared current readiness instead of the backend's role-match baseline.
 * The backend-provided boost is preserved, not invented.
 */
export function syncNextActionReadiness(action, currentReadiness, fallbackBaseline) {
  if (!action) return action;

  const description = action.description || '';
  const fromMatch = description.match(/from\s+(\d{1,3})%/i);
  const serverProjected = Number(action.projected_readiness);
  const parsedBaseline = fromMatch ? Number(fromMatch[1]) : null;
  const baseline = Number.isFinite(parsedBaseline)
    ? parsedBaseline
    : Number(fallbackBaseline);
  const current = clampReadiness(currentReadiness);

  if (!Number.isFinite(serverProjected) || !Number.isFinite(baseline)) {
    return action;
  }

  const projected = Math.min(MAX_READINESS, current + Math.max(0, clampReadiness(serverProjected) - clampReadiness(baseline)));
  const syncedAction = { ...action, projected_readiness: projected };

  if (fromMatch) {
    const serverBaseline = clampReadiness(parsedBaseline);
    const projectedServerValue = clampReadiness(serverProjected);
    const readinessPattern = new RegExp(`\\b(${serverBaseline}|${projectedServerValue})%`, 'g');

    syncedAction.description = description.replace(readinessPattern, (match, value) => (
      Number(value) === projectedServerValue ? `${projected}%` : `${current}%`
    ));
  }

  return syncedAction;
}
