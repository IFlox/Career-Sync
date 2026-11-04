/**
 * Evaluates impact, action verbs, and quantifiable metrics in resumes.
 */
export function auditResumeContent(text = "") {
  const actionVerbs = [
    "architected", "engineered", "optimized", "spearheaded", "deployed",
    "implemented", "reduced", "scaled", "automated", "designed", "accelerated"
  ];

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 15);
  let verbCount = 0;
  let metricCount = 0;
  const weakBullets = [];

  const metricRegex = /(\d+[%kKxX+]|\d+\s*(?:ms|seconds|users|requests|percent|orders))/i;

  lines.forEach(line => {
    const hasVerb = actionVerbs.some(verb => line.toLowerCase().includes(verb));
    const hasMetric = metricRegex.test(line);

    if (hasVerb) verbCount++;
    if (hasMetric) metricCount++;

    // Flag bullet points that lack metrics or start passively
    if (!hasMetric && (line.toLowerCase().startsWith("helped") || line.toLowerCase().startsWith("built a") || line.toLowerCase().startsWith("worked on"))) {
      weakBullets.push({
        original: line,
        suggested: `Spearheaded delivery of ${line.replace(/^(helped|built a|worked on)\s*/i, "")}, boosting team throughput by 25% with zero regressions.`
      });
    }
  });

  let score = 40;
  score += Math.min(30, verbCount * 7);
  score += Math.min(30, metricCount * 10);
  score = Math.min(100, Math.max(25, score));

  return {
    score,
    verbCount,
    metricCount,
    weakBullets
  };
}

/**
 * Transforms raw resume text into ATS single-column standardized layout.
 */
export function generateATSLayout(student) {
  return {
    header: {
      name: student.name.toUpperCase(),
      branch: student.branch,
      cgpa: `Cumulative GPA: ${student.cgpa} / 10.0`,
      contact: `[VERIFIED CANDIDATE - ID: ${student.id}] | Contact Details Masked for Privacy`
    },
    sections: [
      {
        title: "CORE COMPETENCIES & TECHNICAL SKILLS",
        content: student.skills.join(" • ")
      },
      {
        title: "ACADEMIC & PROFESSIONAL PROJECTS",
        items: [
          `Production Systems Architecture: Integrated ${student.skills.slice(0, 3).join(", ")} delivering resilient, production-ready microservice layers.`,
          `High-Concurrency Engineering: Designed event-driven workflows with automated schema validation and strict error budgets.`,
          `Continuous Delivery & Testing: Automated integration pipelines with containerized Docker runtimes.`
        ]
      },
      {
        title: "INSTITUTIONAL SOP VERIFICATION",
        content: `TPO Verification: ${student.adminStatus.toUpperCase()} | Application Limit Concurrency: ${student.activeAppsCount}/3 | SOP Tier: ${student.cgpa >= 6.0 ? "Tier-1 / Tier-2 Eligible" : "Restricted to Tier-2 Drives"}`
      }
    ]
  };
}