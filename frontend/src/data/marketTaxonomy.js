export const MARKET_SKILL_RADAR = {
  highDemand: [
    { name: "AI Agents", growth: "+148%", risk: "Zero Automation Risk" },
    { name: "RAG Pipelines", growth: "+112%", risk: "Defensible" },
    { name: "Vector Embeddings", growth: "+96%", risk: "High Strategic Value" },
    { name: "Cloud Security", growth: "+68%", risk: "Critical Need" },
    { name: "Infrastructure-as-Code", growth: "+54%", risk: "Essential" },
    { name: "System Design", growth: "+45%", risk: "Resilient to AI Copilots" }
  ],
  recommended: [
    { name: "Docker", growth: "+38%", reason: "De-facto container standard" },
    { name: "Kubernetes", growth: "+42%", reason: "Orchestration core" },
    { name: "FastAPI", growth: "+35%", reason: "Python async backend standard" },
    { name: "Go / Rust", growth: "+49%", reason: "High throughput services" },
    { name: "Observability", growth: "+29%", reason: "Telemetry & SRE" }
  ],
  decliningDemand: [
    { name: "Manual QA", growth: "-58%", note: "Automated by Playwright & AI agent suites" },
    { name: "Syntax-Only Coding", growth: "-46%", note: "Replaced by Claude & GitHub Copilot" },
    { name: "Manual Network Config", growth: "-39%", note: "Replaced by SDN & Terraform" }
  ],
  obsoleteHighRisk: [
    { name: "Boilerplate Copy-Pasting", risk: "100% Automated by LLMs" },
    { name: "Legacy Monolith Maintenance", risk: "Phased out in high-growth companies" }
  ]
};

export function assessLayoffRisk(skills = []) {
  const decliningMatches = skills.filter(s => 
    MARKET_SKILL_RADAR.decliningDemand.some(d => d.name.toLowerCase() === s.toLowerCase()) ||
    MARKET_SKILL_RADAR.obsoleteHighRisk.some(o => o.name.toLowerCase() === s.toLowerCase())
  );
  
  const highDemandMatches = skills.filter(s =>
    MARKET_SKILL_RADAR.highDemand.some(h => h.name.toLowerCase() === s.toLowerCase())
  );

  if (highDemandMatches.length >= 2) {
    return {
      status: "LOW RISK / HIGH MARKET VALUE",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      analysis: "Your skill stack matches cutting-edge industry investment (AI & System Engineering). Very high hiring demand."
    };
  } else if (decliningMatches.length > 0 && highDemandMatches.length === 0) {
    return {
      status: "HIGH AUTOMATION RISK / VULNERABLE",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      analysis: "Detected legacy or manual skills that are actively being automated by modern enterprise AI agents. Immediate upskilling required."
    };
  }

  return {
    status: "MODERATE MARKET VALUE",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    analysis: "Solid baseline fundamentals. Bridging 2 core gaps (Docker, System Design) will place you in Tier-1 shortlist percentiles."
  };
}