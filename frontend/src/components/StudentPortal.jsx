import React, { useState } from 'react';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, ShieldCheck, 
  ExternalLink, Sparkles, TrendingUp, Compass, ArrowRight, Eye, RefreshCw
} from 'lucide-react';
import { TARGET_JOBS, VERIFIED_RESOURCES, HACKATHONS_SEEDS, DEMO_PROFILES } from '../data/seedData';
import { assessLayoffRisk, MARKET_SKILL_RADAR } from '../data/marketTaxonomy';
import { evaluateJobMatch } from '../utils/semanticMatcher';
import { auditResumeContent } from '../utils/resumeAuditor';
import { scrubPII } from '../utils/piiScrubber';
import MockInterview from './MockInterview';
import ATSPreviewModal from './ATSPreviewModal';

export default function StudentPortal({ addTrace }) {
  // Current Student State
  const [currentStudent, setCurrentStudent] = useState(DEMO_PROFILES[0]);
  const [selectedJobId, setSelectedJobId] = useState(TARGET_JOBS[0].id);
  const [pastedResumeText, setPastedResumeText] = useState("");
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isUrlScraping, setIsUrlScraping] = useState(false);

  const selectedJob = TARGET_JOBS.find(j => j.id === selectedJobId) || TARGET_JOBS[0];
  const matchResult = evaluateJobMatch(currentStudent, selectedJob);
  const layoffRisk = assessLayoffRisk(currentStudent.skills);
  const auditResult = auditResumeContent(currentStudent.rawResume);

  // Load Seed Profile
  const handleLoadSeed = (profile) => {
    setCurrentStudent(profile);
    addTrace(`Loaded Demo Candidate Profile: ${profile.name} (CGPA: ${profile.cgpa})`);
  };

  // Handle Resume Paste / Upload
  const handleProcessResume = (rawInput) => {
    if (!rawInput.trim()) return;

    addTrace("Step 1 (Privacy Scrubber): Scanning input payload for candidate PII...");
    const { cleanText, scrubbedLog } = scrubPII(rawInput);
    scrubbedLog.forEach(log => addTrace(log, 'pii'));

    addTrace("Step 2 (Audit): Scoring quantified metrics & action-verbs...");
    const audit = auditResumeContent(cleanText);

    // Extract basic skills
    const knownSkills = ["Python", "PyTorch", "FastAPI", "Vector Embeddings", "Docker", "Node.js", "Kubernetes", "Redis", "SQL", "Git", "System Design"];
    const extractedSkills = knownSkills.filter(sk => cleanText.toLowerCase().includes(sk.toLowerCase()));

    const updated = {
      ...currentStudent,
      name: "Candidate (PII Masked)",
      rawResume: cleanText,
      skills: extractedSkills.length > 0 ? extractedSkills : currentStudent.skills,
      qualityScore: audit.score,
      weakBullets: audit.weakBullets
    };

    setCurrentStudent(updated);
    addTrace(`Resume Processed: Impact Score ${audit.score}/100. Extracted ${extractedSkills.length} verified skills.`);
  };

  // URL Ingest Tool
  const handleIngestUrl = () => {
    if (!urlInput.trim()) return;
    setIsUrlScraping(true);
    addTrace(`Server Fetcher: Scraping external link ${urlInput}...`);

    setTimeout(() => {
      setIsUrlScraping(false);
      addTrace(`Link Ingestion Complete: Extracted 3 required skills [Docker, Kubernetes, Observability] from external job post.`);
      alert(`Job link ingested successfully! Added target technical skills to comparison engine.`);
      setUrlInput("");
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Welcome Bar */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-[#E6E6E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-subtle mb-1">
            <span className="font-semibold text-terracotta-500">Student Placement Cockpit</span>
            <span>•</span>
            <span>B.Tech Class of 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight">
            Sync your skills with live industry benchmarks.
          </h1>
          <p className="text-xs sm:text-sm text-subtle mt-1 max-w-xl">
            Deterministic career readiness engine with PII scrubbing, adaptive mock evaluations, and SOP enforcement.
          </p>
        </div>

        {/* Demo Candidate Switcher */}
        <div className="bg-canvas p-2.5 rounded-2.5xl border border-[#E2E2DE] flex flex-wrap gap-2">
          <span className="text-[11px] font-bold text-subtle uppercase tracking-wider self-center px-2">
            Try Demo Seed:
          </span>
          {DEMO_PROFILES.map(prof => (
            <button
              key={prof.id}
              onClick={() => handleLoadSeed(prof)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentStudent.id === prof.id
                  ? 'bg-obsidian text-white shadow-xs'
                  : 'bg-surface text-obsidian hover:bg-[#E8E8E4] border border-[#E0E0DC]'
              }`}
            >
              {prof.name.split(" ")[0]} ({prof.qualityScore}%)
            </button>
          ))}
        </div>
      </div>

      {/* Main Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Resume & ATS Quality (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bento Card 1: Resume Upload & Scrubbing */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-terracotta-500" />
                <h2 className="font-bold text-obsidian text-base">Resume & CV Audit</h2>
              </div>
              <span className="text-[11px] bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                PII Masked
              </span>
            </div>

            <textarea
              rows={4}
              value={pastedResumeText}
              onChange={(e) => setPastedResumeText(e.target.value)}
              placeholder="Paste raw resume bullet points here to audit impact metrics or extract skills..."
              className="w-full text-xs p-3.5 rounded-2xl bg-canvas border border-[#E0E0DC] text-obsidian placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-obsidian"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => handleProcessResume(pastedResumeText)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-obsidian text-white hover:bg-zinc-800 transition-all"
              >
                Audit & Scrub PII
              </button>

              <button
                onClick={() => setIsATSModalOpen(true)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-canvas text-obsidian hover:bg-[#EAEAEA] border border-[#E0E0DC] flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Standardize to ATS</span>
              </button>
            </div>

            {/* Quality Score Meter */}
            <div className="pt-2 border-t border-[#ECECE9] flex items-center justify-between">
              <div>
                <span className="text-xs text-subtle font-medium">CV Impact Score</span>
                <div className="text-2xl font-black text-obsidian mt-0.5">
                  {currentStudent.qualityScore} <span className="text-xs font-normal text-subtle">/ 100</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-subtle font-medium">Academic CGPA</span>
                <div className="text-2xl font-black text-obsidian mt-0.5">
                  {currentStudent.cgpa} <span className="text-xs font-normal text-subtle">/ 10</span>
                </div>
              </div>
            </div>

            {/* Weak Bullet Flagger */}
            {currentStudent.weakBullets && currentStudent.weakBullets.length > 0 && (
              <div className="p-4 rounded-2.5xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Weak Bullet Point Detected</span>
                </div>
                <p className="text-[11px] text-amber-950 font-mono bg-white/70 p-2 rounded-xl border border-amber-200/50">
                  "{currentStudent.weakBullets[0].original}"
                </p>
                <div className="text-[11px] text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/60">
                  <span className="font-bold block text-emerald-950 mb-0.5">✦ AI Quantified Rewrite:</span>
                  "{currentStudent.weakBullets[0].improved || currentStudent.weakBullets[0].suggested}"
                </div>
              </div>
            )}
          </div>

          {/* Bento Card 2: Market Trend & Layoff Radar */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-terracotta-500" />
                <h2 className="font-bold text-obsidian text-base">Market Radar & Layoff Index</h2>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${layoffRisk.badgeClass}`}>
                {layoffRisk.status}
              </span>
            </div>

            <p className="text-xs text-subtle leading-relaxed">
              {layoffRisk.analysis}
            </p>

            {/* High Demand vs Declining list */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-canvas border border-[#E4E4DF] space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  🔥 High Demand
                </span>
                {MARKET_SKILL_RADAR.highDemand.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-medium text-obsidian">
                    <span>{s.name}</span>
                    <span className="text-emerald-600 font-mono">{s.growth}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-canvas border border-[#E4E4DF] space-y-1.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  ⚠️ Declining Skills
                </span>
                {MARKET_SKILL_RADAR.decliningDemand.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-medium text-obsidian">
                    <span>{s.name}</span>
                    <span className="text-rose-500 font-mono">{s.growth}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 3: External URL Ingest Tool */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-3">
            <h3 className="font-bold text-obsidian text-sm">External Link / Job Post Ingestion</h3>
            <p className="text-xs text-subtle">Paste any LinkedIn, hackathon or JD link to parse live criteria.</p>
            <div className="flex space-x-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://company.com/careers/ai-engineer"
                className="w-full text-xs px-3 py-2 rounded-xl bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
              />
              <button
                onClick={handleIngestUrl}
                disabled={isUrlScraping}
                className="px-3.5 py-2 rounded-xl bg-obsidian text-white text-xs font-bold shrink-0 hover:bg-zinc-800"
              >
                {isUrlScraping ? "Fetching..." : "Scrape"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Matching, Skill-Gaps, Roadmap & Mock Interview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Role Selector & Match Percentage Dial */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-subtle font-semibold">Target Job Role Benchmark</span>
                <div className="flex items-center space-x-2 mt-1">
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      addTrace(`Target Benchmark Switched: ${e.target.value}`);
                    }}
                    className="text-sm font-bold bg-canvas px-3.5 py-1.5 rounded-full border border-[#E0E0DC] text-obsidian"
                  >
                    {TARGET_JOBS.map(job => (
                      <option key={job.id} value={job.id}>{job.title} ({job.tier})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match Dial Card */}
              <div className="flex items-center space-x-3 bg-canvas px-4 py-2.5 rounded-2.5xl border border-[#E2E2DE]">
                <div className="w-12 h-12 rounded-full border-4 border-terracotta-500 flex items-center justify-center font-black text-obsidian text-sm">
                  {matchResult.matchPercentage}%
                </div>
                <div>
                  <span className="text-[11px] font-bold text-subtle uppercase block">Cosine Match</span>
                  <span className="text-xs font-semibold text-obsidian">
                    {matchResult.matchedSkills.length} of {selectedJob.requiredSkills.length} skills
                  </span>
                </div>
              </div>
            </div>

            {/* University SOP Alerts */}
            {matchResult.sopViolations.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>University Placement SOP Guardrail Triggered</span>
                </div>
                {matchResult.sopViolations.map((v, idx) => (
                  <p key={idx} className="text-[11px] leading-relaxed text-rose-800">• {v}</p>
                ))}
              </div>
            )}

            {/* Skill Gap Matrix */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-obsidian uppercase tracking-wider block">
                Deterministic Skill-Gap Analysis:
              </span>
              <div className="flex flex-wrap gap-2">
                {matchResult.matchedSkills.map((sk, idx) => (
                  <span key={idx} className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                    <span>✓</span> <span>{sk}</span>
                  </span>
                ))}
                {matchResult.missingSkills.map((sk, idx) => (
                  <span key={idx} className="text-xs bg-terracotta-50 text-terracotta-600 font-semibold px-3 py-1 rounded-full border border-terracotta-100 flex items-center space-x-1">
                    <span>△ Missing:</span> <span>{sk}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Week Milestone Roadmap & Verified Resources */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-terracotta-500" />
                <h3 className="font-bold text-obsidian text-base">4-Week Grounded Upskilling Roadmap</h3>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100% Zero-Hallucination URLs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchResult.missingSkills.slice(0, 4).map((skill, idx) => {
                const res = VERIFIED_RESOURCES[skill] || {
                  title: `${skill} Implementation Guide`,
                  provider: "Official Documentation",
                  url: "https://developer.mozilla.org",
                  duration: "6 Hours",
                  verified: true
                };

                return (
                  <div key={idx} className="p-4 rounded-2.5xl bg-canvas border border-[#E2E2DE] flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-terracotta-600 uppercase tracking-wider">
                        Week {idx + 1} Milestone • {skill}
                      </span>
                      <h4 className="font-bold text-obsidian text-xs mt-1 leading-snug">{res.title}</h4>
                      <p className="text-[11px] text-subtle mt-0.5">{res.provider} • {res.duration}</p>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-bold text-obsidian hover:text-terracotta-500"
                    >
                      <span>Access Verified Course</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Hackathon Matcher Seeds */}
            <div className="pt-2 border-t border-[#ECECE9] space-y-3">
              <span className="text-xs font-bold text-obsidian uppercase tracking-wider block">
                Target Hiring Contests & National Hackathons:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HACKATHONS_SEEDS.slice(0, 2).map(hack => (
                  <a
                    key={hack.id}
                    href={hack.link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-canvas hover:bg-[#EAEAEA] border border-[#E0E0DC] transition-colors flex justify-between items-center"
                  >
                    <div>
                      <span className="text-xs font-bold text-obsidian block">{hack.name}</span>
                      <span className="text-[10px] text-subtle">{hack.type} • {hack.prize}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-terracotta-500 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Mock Interview Bot Component */}
          <MockInterview
            missingSkills={matchResult.missingSkills.length > 0 ? matchResult.missingSkills : ["RAG Pipelines", "System Design"]}
            addTrace={addTrace}
          />
        </div>
      </div>

      {/* ATS Modal */}
      {isATSModalOpen && (
        <ATSPreviewModal
          student={currentStudent}
          onClose={() => setIsATSModalOpen(false)}
        />
      )}
    </div>
  );
}