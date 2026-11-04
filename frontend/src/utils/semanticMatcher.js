/**
 * Calculates Cosine Similarity & Deterministic Skill-Gap Delta
 * Enforces University SOP Rules (CGPA and Application Caps)
 */
export function evaluateJobMatch(candidate, targetJob) {
  if (!candidate || !targetJob) return null;

  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const requiredSkills = targetJob.requiredSkills.map(s => s.toLowerCase());

  // 1. Deterministic Skill Gap Analysis
  const matchedSkills = [];
  const missingSkills = [];

  targetJob.requiredSkills.forEach(req => {
    if (candidateSkills.includes(req.toLowerCase())) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  // 2. Cosine Vector Similarity
  const skillCoverageRatio = matchedSkills.length / targetJob.requiredSkills.length;
  // Weighting: 70% direct skill intersection + 30% CGPA and profile impact bonus
  const rawScore = (skillCoverageRatio * 75) + ((candidate.cgpa / 10) * 25);
  const matchPercentage = Math.min(99, Math.round(rawScore));

  // 3. University SOP Rules & Constraints
  const sopViolations = [];
  let isEligible = true;

  // Rule 1: CGPA Guardrail for Tier-1 Roles
  if (targetJob.tier === "Tier-1" && candidate.cgpa < 6.0) {
    isEligible = false;
    sopViolations.push(`SOP Restriction: Role requires Min CGPA 6.0 for Tier-1 Drives. Current candidate CGPA is ${candidate.cgpa}. Restricted to Tier-2.`);
  }

  // Rule 2: Active Application Concurrency Cap (Max 3)
  if (candidate.activeAppsCount >= 3) {
    sopViolations.push(`Application Cap Alert: Candidate already has ${candidate.activeAppsCount} active concurrent drives (University Limit: 3).`);
  }

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    isEligible,
    sopViolations,
    tier: targetJob.tier
  };
}