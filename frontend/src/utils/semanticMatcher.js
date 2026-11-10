/**
 * Frontend Composite Matching & Explainability Engine (Phase 2)
 * Computes:
 * 1. Skill Fit (45%)
 * 2. Preference Alignment (30%)
 * 3. Academic SOP Eligibility (15%)
 * 4. User Bookmark / Hide Feedback (10%)
 */

export function evaluateJobMatch(candidate, targetJob, preferences = null, feedbackList = []) {
  if (!candidate || !targetJob) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
      isEligible: true,
      sopViolations: [],
      fitReasons: [],
      cautionNotes: [],
      isSaved: false,
      isHidden: false
    };
  }

  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const requiredSkills = targetJob.requiredSkills || targetJob.required_skills || [];
  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach(req => {
    if (candidateSkills.includes(req.toLowerCase())) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  // 1. Skill Fit
  const skillCoverageRatio = matchedSkills.length / Math.max(1, requiredSkills.length);
  const rawSkillScore = Math.min(100, Math.max(20, skillCoverageRatio * 100));

  // 2. Preference Alignment
  const fitReasons = [];
  const cautionNotes = [];
  const pref = preferences || {};
  const prefRoles = (pref.preferred_roles || []).map(r => r.toLowerCase());
  const prefLocs = (pref.preferred_locations || []).map(l => l.toLowerCase());
  const targetTechs = (pref.target_technologies || []).map(t => t.toLowerCase());

  const jobTitle = (targetJob.title || "").toLowerCase();
  const jobLoc = (targetJob.location || "Remote").toLowerCase();

  const roleMatched = prefRoles.length === 0 || prefRoles.some(r => jobTitle.includes(r) || r.includes(jobTitle));
  const locMatched = prefLocs.length === 0 || jobLoc.includes("remote") || prefLocs.some(l => jobLoc.includes(l));

  const matchingTech = targetTechs.filter(t => requiredSkills.some(req => req.toLowerCase().includes(t)));
  const techRatio = targetTechs.length > 0 ? matchingTech.length / targetTechs.length : 0.7;

  if (roleMatched && prefRoles.length > 0) {
    fitReasons.push("Directly matches your target role preferences");
  }
  if (locMatched) {
    fitReasons.push(`Location (${targetJob.location || 'Remote / Flexible'}) matches your preferred choices`);
  } else {
    cautionNotes.push(`Location (${targetJob.location || 'On-site'}) may require relocation`);
  }

  if (matchingTech.length > 0) {
    fitReasons.push(`Uses ${matchingTech.length} of your target technologies: ${matchingTech.slice(0, 3).map(t => t.toUpperCase()).join(", ")}`);
  }

  const prefScore = (roleMatched ? 35 : 15) + (locMatched ? 30 : 10) + Math.min(35, techRatio * 35);

  // 3. Academic SOP Eligibility
  const sopViolations = [];
  let isEligible = true;
  let eligibilityScore = 100;
  const candCgpa = candidate.cgpa || 7.5;
  const activeApps = candidate.activeAppsCount || 0;

  if (targetJob.tier === "Tier-1" && candCgpa < 6.0) {
    isEligible = false;
    eligibilityScore = 30;
    sopViolations.push(`University SOP: Minimum 6.0 CGPA required for Tier-1 Drives. Current CGPA is ${candCgpa}.`);
  }

  if (activeApps >= 3) {
    sopViolations.push(`Application Cap: Student already holds ${activeApps}/3 active concurrent drives.`);
    eligibilityScore = Math.min(eligibilityScore, 40);
  }

  // 4. Feedback (Saved / Hidden)
  let feedbackBoost = 0;
  let isSaved = false;
  let isHidden = false;

  const jobFeedback = feedbackList.find(f => f.entity_id === targetJob.id && f.entity_type === 'JOB');
  if (jobFeedback) {
    if (jobFeedback.action === 'SAVED') {
      feedbackBoost = 10;
      isSaved = true;
      fitReasons.unshift("Saved in your prioritized bookmarks");
    } else if (jobFeedback.action === 'HIDDEN') {
      feedbackBoost = -50;
      isHidden = true;
      cautionNotes.unshift("Marked as hidden in your preferences");
    }
  }

  const compositeScore = Math.min(
    99,
    Math.max(5, Math.round((0.45 * rawSkillScore) + (0.30 * prefScore) + (0.15 * eligibilityScore) + feedbackBoost))
  );

  if (fitReasons.length === 0) {
    fitReasons.push("Standard technical competency match for this role family");
  }

  return {
    matchPercentage: compositeScore,
    skillFitScore: Math.round(rawSkillScore),
    preferenceScore: Math.round(prefScore),
    matchedSkills,
    missingSkills,
    isEligible,
    sopViolations,
    tier: targetJob.tier || "Tier-2",
    fitReasons,
    cautionNotes,
    isSaved,
    isHidden
  };
}