import {
  clampReadiness,
  computeMilestoneCompletion,
  computeOverallReadiness
} from './readiness.js';

export function isRoadmapItemCompleted(item, completedMilestones = []) {
  return Boolean(item?.is_completed) || (completedMilestones || []).includes(item?.week);
}

function isValidRoadmapItem(item) {
  return Boolean(item)
    && item.week !== null
    && item.week !== undefined
    && Number.isFinite(Number(item.week))
    && typeof item.skill === 'string'
    && item.skill.trim().length > 0;
}

export function findNextRoadmapItem(roadmap, completedMilestones = []) {
  if (!Array.isArray(roadmap)) return null;

  return roadmap
    .filter(isValidRoadmapItem)
    .find(item => !isRoadmapItemCompleted(item, completedMilestones)) || null;
}

export function projectReadinessAfterRoadmapWeek(
  readiness,
  roadmap,
  completedMilestones = [],
  weekNumber = null
) {
  const current = clampReadiness(readiness?.overall);
  if (!Array.isArray(roadmap) || roadmap.length === 0) return current;

  const nextWeek = Number.isFinite(Number(weekNumber))
    ? Number(weekNumber)
    : Number(findNextRoadmapItem(roadmap, completedMilestones)?.week);

  if (!Number.isFinite(nextWeek)) return current;

  // Project from the same roadmap-aware milestone calculation the page uses,
  // with the next week added to the saved milestone list.
  const nextCompletedMilestones = Array.from(new Set([
    ...(Array.isArray(completedMilestones) ? completedMilestones : [])
      .map(Number)
      .filter(Number.isFinite),
    nextWeek
  ]));

  const nextMilestoneCompletion = computeMilestoneCompletion(
    roadmap,
    nextCompletedMilestones
  );

  return computeOverallReadiness({
    skill_coverage: readiness?.skill_coverage,
    interview_performance: readiness?.interview_performance,
    milestone_completion: nextMilestoneCompletion,
    profile_quality: readiness?.profile_quality
  });
}

export function resolveRoadmapRecommendation({
  roadmap,
  completedMilestones = [],
  targetRoleTitle,
  readiness,
  isLoading = false,
  error = null
}) {
  if (isLoading) {
    return { status: 'loading' };
  }

  if (error) {
    return { status: 'error', message: error };
  }

  const validRoadmap = Array.isArray(roadmap) ? roadmap.filter(isValidRoadmapItem) : [];
  if (validRoadmap.length === 0) {
    return { status: 'empty' };
  }

  const nextItem = findNextRoadmapItem(validRoadmap, completedMilestones);
  const currentReadiness = clampReadiness(readiness?.overall);

  if (!nextItem) {
    return {
      status: 'complete',
      recommendation: {
        headline: `All roadmap milestones complete for ${targetRoleTitle || 'your target role'}`,
        description: "Every week in your preparation plan is complete. Schedule a final mock interview to verify your readiness.",
        action_type: "PRACTICE_INTERVIEW",
        target_skill: null,
        roadmap_week: null,
        projected_readiness: currentReadiness
      }
    };
  }

  const projectedReadiness = projectReadinessAfterRoadmapWeek(
    readiness,
    validRoadmap,
    completedMilestones,
    nextItem.week
  );

  return {
    status: 'ready',
    recommendation: {
      headline: `Complete Week ${nextItem.week} milestone for ${nextItem.skill}`,
      description: `Finishing this practical module will elevate your ${targetRoleTitle || 'target role'} readiness from ${currentReadiness}% to approximately ${projectedReadiness}%.`,
      action_type: "STUDY_MILESTONE",
      target_skill: nextItem.skill,
      roadmap_week: nextItem.week,
      projected_readiness: projectedReadiness
    }
  };
}
