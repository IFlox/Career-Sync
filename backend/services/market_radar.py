from typing import Dict, Any, List

class MarketRadarService:
    """
    Classifies skills into live demand quadrants and evaluates automation / layoff risks.
    """
    TAXONOMY = {
        "high_demand": ["AI Agents", "RAG Pipelines", "Vector Embeddings", "Cloud Security", "Infrastructure-as-Code", "System Design"],
        "recommended": ["Docker", "Kubernetes", "FastAPI", "Go", "Rust", "Observability"],
        "declining_demand": ["Manual QA", "Syntax-Only Coding", "Manual Network Config"],
        "obsolete_high_risk": ["Boilerplate Copy-Pasting", "Legacy Monolith Maintenance"]
    }

    @classmethod
    def assess_risk(cls, candidate_skills: List[str]) -> Dict[str, Any]:
        cand_lower = [s.lower() for s in candidate_skills]

        high_matches = [s for s in cls.TAXONOMY["high_demand"] if s.lower() in cand_lower]
        declining_matches = [s for s in cls.TAXONOMY["declining_demand"] if s.lower() in cand_lower]

        if len(high_matches) >= 2:
            return {
                "status": "LOW RISK / HIGH MARKET VALUE",
                "badge": "emerald",
                "analysis": "Your skill profile matches strategic industry priorities (AI Systems & Scalability). Highly resilient to automation."
            }
        elif len(declining_matches) > 0 and len(high_matches) == 0:
            return {
                "status": "HIGH AUTOMATION RISK / VULNERABLE",
                "badge": "rose",
                "analysis": "Detected manual skills actively being automated by modern enterprise AI agents. Immediate upskilling required."
            }

        return {
            "status": "MODERATE MARKET VALUE",
            "badge": "amber",
            "analysis": "Solid fundamentals. Bridging 2 key gaps (Docker, System Design) will place you in Tier-1 hiring percentiles."
        }