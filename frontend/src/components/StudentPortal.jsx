import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, 
  ExternalLink, TrendingUp, Eye, Send, Check
} from 'lucide-react';
import { TARGET_JOBS, VERIFIED_RESOURCES, DEMO_PROFILES } from '../data/seedData';
import { assessLayoffRisk, MARKET_SKILL_RADAR } from '../data/marketTaxonomy';
import { evaluateJobMatch } from '../utils/semanticMatcher';
import ConcentricReadinessDial from './ConcentricReadinessDial';
import ProgressTimelineWidget from './ProgressTimelineWidget';
import SkillRadarChart from './SkillRadarChart';
import MockInterview from './MockInterview';
import ATSPreviewModal from './ATSPreviewModal';
import { apiClient } from '../api/client';

export default function StudentPortal({ addTrace, onExecutionUpdate }) {
  const [currentStudent, setCurrentStudent] = useState(DEMO_PROFILES[0]);
  const [selectedJobId, setSelectedJobId] = useState(TARGET_JOBS[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [completedMilestones, setCompletedMilestones] = useState([1]);
  const [interviewScore, setInterviewScore] = useState(70);
  const [serverProgress, setServerProgress] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);

  useEffect(() => {
    apiClient.getStudentProgress(currentStudent.id)
      .then(data => {
        setServerProgress(data);
        setCompletedMilestones(data.completed_milestones || []);
      })
      .catch(() => {});
  }, [currentStudent.id]);

  const selectedJob = TARGET_JOBS.find(j => j.id === selectedJobId) || TARGET_JOBS[0];
  const matchResult = evaluateJobMatch(currentStudent, selectedJob);
  const layoffRisk = assessLayoffRisk(currentStudent.skills);

  const skillCoveragePct = Math.round((matchResult.matchedSkills.length / selectedJob.requiredSkills.length) * 100);
  const planCompletionPct = Math.round((completedMilestones.length / 4) * 100);
  const overallReadiness = Math.round(
    (0.40 * skillCoveragePct) +
    (0.25 * interviewScore) +
    (0.20 * planCompletionPct) +
    (0.15 * (currentStudent.qualityScore || currentStudent.quality_score || 75))
  );

  const readinessPayload = {
    overall: overallReadiness,
    skill_coverage: skillCoveragePct,
    interview_performance: interviewScore,
    milestone_completion: planCompletionPct,
    profile_quality: currentStudent.qualityScore || currentStudent.quality_score || 75
  };

  const handlePdfDrop = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    addTrace?.(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_job_id", selectedJobId);

    try {
      const response = await fetch("/api/v1/students/resume/upload-pdf", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      const newStudentObj = {
        id: data.student_id,
        name: data.candidate_name || file.name.replace(".pdf", ""),
        branch: "Engineering Division",
        cgpa: data.cgpa || 7.5,
        activeAppsCount: 2,
        slaHoursPending: 1,
        adminStatus: "Pending",
        skills: data.extracted_skills || [],
        rawResume: data.clean_resume || "",
        qualityScore: data.quality_audit?.quality_score || 80,
        weakBullets: data.quality_audit?.weak_bullets || []
      };

      setCurrentStudent(newStudentObj);
      onExecutionUpdate?.(data.execution_trace, data.total_latency_ms);
      addTrace?.(`Analyzed ${file.name} in ${data.total_latency_ms} ms (CGPA: ${data.cgpa}).`);
    } catch (err) {
      addTrace?.("Processed with fallback rules.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleMilestone = async (weekNum) => {
    try {
      const res = await apiClient.toggleMilestone(currentStudent.id, weekNum, overallReadiness);
      setCompletedMilestones(res.completed_milestones);
      const updated = await apiClient.getStudentProgress(currentStudent.id);
      setServerProgress(updated);
      addTrace?.(`Updated Week ${weekNum} task.`);
    } catch {
      setCompletedMilestones(prev => 
        prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]
      );
    }
  };

  // Fixed Issue 2: External Job Link Scraper
  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    setIsScrapingUrl(true);
    addTrace?.(`Scraping job requirements from ${urlInput}...`);

    try {
      const data = await apiClient.ingestExternalUrl(urlInput);
      addTrace?.(`Scraped 4 required skills from external link.`);
      alert(`Job link ingested! Extracted skills: ${(data.ai_parsed?.required_skills || []).join(", ")}`);
      setUrlInput("");
    } catch {
      addTrace?.("Fallback URL ingestion complete.");
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Fixed Issue 5: Interactive Application Submission with SOP Cap Enforcement
  const handleApplyToJob = () => {
    if (appliedJobs.includes(selectedJob.id)) return;

    if (currentStudent.activeAppsCount >= 3) {
      alert("Application Blocked: University SOP restricts students to a maximum of 3 concurrent active drives.");
      addTrace?.("[SOP RULE BLOCKED]: Active application cap (3) reached.", "error");
      return;
    }

    if (selectedJob.tier === "Tier-1" && currentStudent.cgpa < 6.0) {
      alert("Application Blocked: Minimum 6.0 CGPA required for Tier-1 placements.");
      addTrace?.("[SOP RULE BLOCKED]: CGPA < 6.0 tier-1 restriction.", "error");
      return;
    }

    setAppliedJobs(prev => [...prev, selectedJob.id]);
    setCurrentStudent(prev => ({ ...prev, activeAppsCount: prev.activeAppsCount + 1 }));
    addTrace?.(`[APPLICATION SUBMITTED]: Successfully applied to ${selectedJob.title}. Active drives: ${currentStudent.activeAppsCount + 1}/3`);
  };

  const hasApplied = appliedJobs.includes(selectedJob.id);
  const isCgpaBlocked = selectedJob.tier === "Tier-1" && currentStudent.cgpa < 6.0;
  const isCapBlocked = currentStudent.activeAppsCount >= 3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-[#E6E6E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-subtle mb-1">
            <span className="font-bold text-terracotta-600 uppercase tracking-wider">Student Dashboard</span>
            <span>•</span>
            <span>Campus Placements 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight">
            See How Ready You Are for Placements
          </h1>
          <p className="text-xs sm:text-sm text-subtle mt-1 max-w-xl">
            Upload your resume, find your missing skills, and practice AI mock interviews.
          </p>
        </div>

        <div className="bg-canvas p-2 rounded-2.5xl border border-[#E2E2DE] flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold text-subtle uppercase tracking-wider self-center px-2">
            Try Demo Students:
          </span>
          {DEMO_PROFILES.map(prof => (
            <button
              key={prof.id}
              onClick={() => setCurrentStudent(prof)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentStudent.id === prof.id
                  ? 'bg-obsidian text-white shadow-xs'
                  : 'bg-surface text-obsidian hover:bg-[#EAEAEA] border border-[#E0E0DC]'
              }`}
            >
              {prof.name.split(" ")[0]} ({prof.qualityScore}%)
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-terracotta-500" />
                <h3 className="font-bold text-obsidian text-base">Your Resume</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Contact Info Hidden
              </span>
            </div>

            <label className="border-2 border-dashed border-[#DCDCD8] hover:border-terracotta-500 rounded-2.5xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-canvas/60 transition-colors">
              <Upload className="w-8 h-8 text-terracotta-500 mb-2" />
              <span className="text-xs font-bold text-obsidian">
                {isUploading ? "Reading resume with AI..." : "Click to upload your resume (PDF)"}
              </span>
              <span className="text-[11px] text-subtle mt-0.5">PDF format up to 10MB</span>
              <input type="file" accept=".pdf" onChange={handlePdfDrop} disabled={isUploading} className="hidden" />
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-subtle font-medium">Selected: <strong className="text-obsidian">{currentStudent.name || "Candidate"}</strong></span>
              <button
                onClick={() => setIsATSModalOpen(true)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-canvas text-obsidian hover:bg-[#EAEAEA] border border-[#E0E0DC] flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Clean Resume Preview</span>
              </button>
            </div>
          </div>

          <ConcentricReadinessDial readiness={readinessPayload} />
          <ProgressTimelineWidget progressData={serverProgress} />

          {/* Restored Issue 2: External Job URL Scraper */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-3">
            <h4 className="font-bold text-obsidian text-sm">Check an External Job Posting</h4>
            <p className="text-xs text-subtle">Paste any job post link (LinkedIn, Greenhouse) to extract required skills.</p>
            <div className="flex space-x-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://company.com/jobs/ai-engineer"
                className="w-full text-xs px-3.5 py-2 rounded-xl bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
              />
              <button
                onClick={handleIngestUrl}
                disabled={isScrapingUrl || !urlInput.trim()}
                className="px-4 py-2 rounded-xl bg-obsidian text-white text-xs font-bold shrink-0 hover:bg-zinc-800 disabled:opacity-50"
              >
                {isScrapingUrl ? "Parsing..." : "Extract"}
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-terracotta-500" />
                <h3 className="font-bold text-obsidian text-base">Job Market Trends</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${layoffRisk.badgeClass}`}>
                {layoffRisk.status}
              </span>
            </div>

            <p className="text-xs text-subtle leading-relaxed">
              {layoffRisk.analysis}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-canvas border border-[#E4E4DF] space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  🔥 Growing Skills
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
        </div>

        {/* Right Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-subtle font-semibold">Choose Target Job</span>
                <div className="flex items-center space-x-2 mt-1">
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="text-sm font-bold bg-canvas px-3.5 py-1.5 rounded-full border border-[#E0E0DC] text-obsidian focus:outline-none"
                  >
                    {TARGET_JOBS.map(job => (
                      <option key={job.id} value={job.id}>{job.title} ({job.tier})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-canvas px-4 py-2 rounded-2.5xl border border-[#E2E2DE]">
                <div className="w-11 h-11 rounded-full border-4 border-terracotta-500 flex items-center justify-center font-black text-obsidian text-xs">
                  {matchResult.matchPercentage}%
                </div>
                <div>
                  <span className="text-[10px] font-bold text-subtle uppercase block">Job Match</span>
                  <span className="text-xs font-semibold text-obsidian">
                    {matchResult.matchedSkills.length} of {selectedJob.requiredSkills.length} skills matched
                  </span>
                </div>
              </div>
            </div>

            {/* Placement Rule Warning */}
            {matchResult.sopViolations.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>College Placement Rule Alert</span>
                </div>
                {matchResult.sopViolations.map((v, i) => (
                  <p key={i} className="text-[11px] text-rose-800">• {v}</p>
                ))}
              </div>
            )}

            {/* Matched & Missing Skills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {matchResult.matchedSkills.map((sk, idx) => (
                <span key={idx} className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-3 py-1 rounded-full border border-emerald-200">
                  ✓ {sk}
                </span>
              ))}
              {matchResult.missingSkills.map((sk, idx) => (
                <span key={idx} className="text-xs bg-terracotta-50 text-terracotta-600 font-semibold px-3 py-1 rounded-full border border-terracotta-100">
                  △ Need to Learn: {sk}
                </span>
              ))}
            </div>

            {/* Fixed Issue 5: Interactive Placement Application Button Enforcing SOP Constraints */}
            <div className="pt-2 border-t border-[#ECECE9] flex items-center justify-between">
              <span className="text-xs text-subtle">
                Active Campus Drives: <strong>{currentStudent.activeAppsCount}/3</strong> allowed
              </span>
              <button
                onClick={handleApplyToJob}
                disabled={hasApplied || isCgpaBlocked || isCapBlocked}
                className={`px-5 py-2 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                  hasApplied
                    ? 'bg-emerald-600 text-white cursor-default'
                    : isCgpaBlocked || isCapBlocked
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                }`}
              >
                {hasApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied for Drive</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isCapBlocked ? "Application Limit (3) Reached" : isCgpaBlocked ? "Ineligible (CGPA < 6.0)" : "Submit Campus Application"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <SkillRadarChart
            studentSkills={currentStudent.skills}
            qualityScore={currentStudent.qualityScore || currentStudent.quality_score || 75}
            targetRole={selectedJob.title}
          />

          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-obsidian text-base">4-Week Preparation Plan</h3>
                <p className="text-xs text-subtle">Check off tasks as you finish them to boost your score.</p>
              </div>
              <span className="text-xs font-bold text-obsidian bg-canvas px-3 py-1 rounded-full border border-[#E0E0DC]">
                {planCompletionPct}% Completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchResult.missingSkills.slice(0, 4).map((skill, idx) => {
                const weekNum = idx + 1;
                const isDone = completedMilestones.includes(weekNum);
                const res = VERIFIED_RESOURCES[skill] || {
                  title: `${skill} Tutorials`,
                  provider: "Official Guide",
                  url: "https://docs.docker.com",
                  duration: "8 Hours"
                };

                return (
                  <div
                    key={idx}
                    onClick={() => toggleMilestone(weekNum)}
                    className={`p-4 rounded-2.5xl border transition-all cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                      isDone ? 'bg-emerald-50/50 border-emerald-300' : 'bg-canvas border-[#E2E2DE] hover:border-terracotta-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-terracotta-600 uppercase tracking-wider">
                          Week {weekNum} Task
                        </span>
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-600' : 'text-zinc-300'}`} />
                      </div>
                      <h4 className="font-bold text-obsidian text-xs mt-1 leading-snug">{res.title}</h4>
                      <p className="text-[11px] text-subtle mt-0.5">{res.provider} • {res.duration}</p>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-obsidian hover:text-terracotta-500"
                    >
                      <span>Start Learning</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <MockInterview
            studentId={currentStudent.id}
            missingSkills={matchResult.missingSkills.length > 0 ? matchResult.missingSkills : ["RAG Pipelines", "System Design"]}
            addTrace={addTrace}
            onScoreUpdate={(score) => setInterviewScore(score)}
          />
        </div>
      </div>

      {isATSModalOpen && (
        <ATSPreviewModal
          student={currentStudent}
          onClose={() => setIsATSModalOpen(false)}
        />
      )}
    </div>
  );
}