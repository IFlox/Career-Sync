import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, 
  ExternalLink, TrendingUp, Eye, Send, Check, User,
  Bookmark, BookmarkCheck, EyeOff, Sliders, Sparkles, Clock, BookOpen,
  Compass, Award
} from 'lucide-react';
import { TARGET_JOBS, DEMO_PROFILES } from '../data/seedData';
import { assessLayoffRisk, MARKET_SKILL_RADAR } from '../data/marketTaxonomy';
import { evaluateJobMatch } from '../utils/semanticMatcher';
import ConcentricReadinessDial from './ConcentricReadinessDial';
import ProgressTimelineWidget from './ProgressTimelineWidget';
import SkillRadarChart from './SkillRadarChart';
import MockInterview from './MockInterview';
import ATSPreviewModal from './ATSPreviewModal';
import PreferenceModal from './PreferenceModal';
import ReadinessReportModal from './ReadinessReportModal';
import RetryableErrorCard from './RetryableErrorCard';
import { apiClient } from '../api/client';

export default function StudentPortal({ addTrace, onExecutionUpdate }) {
  const [currentStudent, setCurrentStudent] = useState(DEMO_PROFILES[0]);
  const [jobsList, setJobsList] = useState(TARGET_JOBS);
  const [selectedJobId, setSelectedJobId] = useState(TARGET_JOBS[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [completedMilestones, setCompletedMilestones] = useState([1]);
  const [interviewScore, setInterviewScore] = useState(70);
  const [serverProgress, setServerProgress] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [feedbackRecords, setFeedbackRecords] = useState([]);
  const [dynamicRoadmap, setDynamicRoadmap] = useState([]);
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState(null);
  const [jobsError, setJobsError] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [profileDataError, setProfileDataError] = useState(null);

  const fetchRankedJobs = () => {
    setJobsError(null);
    apiClient.getRankedJobs(currentStudent.id)
      .then(res => {
        if (res.ranked_jobs && res.ranked_jobs.length > 0) {
          setJobsList(res.ranked_jobs);
          setSelectedJobId(res.ranked_jobs[0].id);
        }
      })
      .catch((err) => {
        setJobsError(err.message || "Failed to load personalized job ranking.");
        setJobsList(TARGET_JOBS);
      });
  };

  useEffect(() => {
    let isMounted = true;

    apiClient.getPreferences(currentStudent.id)
      .then(data => { if (isMounted) setPreferences(data); })
      .catch((err) => setProfileDataError(err.message || "Failed to load career preferences."));

    apiClient.getFeedback(currentStudent.id)
      .then(res => { if (isMounted) setFeedbackRecords(res.feedback || []); })
      .catch((err) => setProfileDataError(err.message || "Failed to load recommendation feedback."));

    fetchRankedJobs();

    apiClient.getStudentProgress(currentStudent.id)
      .then(data => {
        if (isMounted) {
          setServerProgress(data);
          setCompletedMilestones(data.completed_milestones || []);
        }
      })
      .catch((err) => setProfileDataError(err.message || "Failed to load saved progress."));

    return () => { isMounted = false; };
  }, [currentStudent.id]);

  const fetchRoadmap = () => {
    setIsLoadingRoadmap(true);
    setRoadmapError(null);

    apiClient.getRoadmap(currentStudent.id, selectedJobId)
      .then(res => {
        if (res.roadmap) {
          setDynamicRoadmap(res.roadmap);
        }
      })
      .catch((err) => {
        setRoadmapError(err.message || "Unable to generate personalized roadmap.");
        setDynamicRoadmap([]);
      })
      .finally(() => {
        setIsLoadingRoadmap(false);
      });

    apiClient.getNextAction(currentStudent.id, selectedJobId)
      .then(action => setNextAction(action))
      .catch((err) => setProfileDataError(err.message || "Failed to load the next recommended action."));
  };

  useEffect(() => {
    fetchRoadmap();
  }, [currentStudent.id, selectedJobId, preferences]);

  const selectedJob = jobsList.find(j => j.id === selectedJobId) || jobsList[0];
  const matchResult = evaluateJobMatch(currentStudent, selectedJob, preferences, feedbackRecords);
  const layoffRisk = assessLayoffRisk(currentStudent.skills);

  const reqSkillsCount = (selectedJob.requiredSkills || selectedJob.required_skills || []).length;
  const skillCoveragePct = Math.round((matchResult.matchedSkills.length / Math.max(1, reqSkillsCount)) * 100);
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
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Upload processing error");
      }
      const data = await response.json();

      const newStudentObj = {
        id: data.student_id,
        name: data.candidate_name || file.name.replace(".pdf", ""),
        branch: "Engineering Division",
        cgpa: data.cgpa || 7.5,
        activeAppsCount: 0,
        slaHoursPending: 1,
        adminStatus: "Pending",
        skills: data.extracted_skills || [],
        rawResume: data.clean_resume || "",
        qualityScore: data.quality_audit?.quality_score || 80,
        weakBullets: data.quality_audit?.weak_bullets || [],
        data_mode: "LIVE_DATA"
      };

      setCurrentStudent(newStudentObj);
      onExecutionUpdate?.(data.execution_trace, data.total_latency_ms);
      addTrace?.(`Analyzed ${file.name} (CGPA: ${data.cgpa}). Saved to database.`);
    } catch (err) {
      alert(`Resume upload failed: ${err.message}`);
      addTrace?.(`Upload error: ${err.message}`, 'error');
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

      apiClient.getNextAction(currentStudent.id, selectedJobId)
        .then(act => setNextAction(act))
        .catch(() => {});
    } catch (err) {
      alert(`Could not save milestone: ${err.message}`);
    }
  };

  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    setIsScrapingUrl(true);
    addTrace?.(`Analyzing opportunity at ${urlInput}...`);

    try {
      const data = await apiClient.ingestExternalUrl(urlInput);
      addTrace?.(`Extracted skill criteria from job listing.`);
      alert(`Job analyzed! Extracted criteria: ${(data.ai_parsed?.required_skills || []).join(", ")}`);
      setUrlInput("");
    } catch (err) {
      alert(`URL ingestion failed: ${err.message}`);
      addTrace?.(`URL ingest error: ${err.message}`, "error");
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handleApplyToJob = async () => {
    if (appliedJobs.includes(selectedJob.id)) return;

    try {
      addTrace?.(`Submitting application to ${selectedJob.title} (${selectedJob.company})...`);
      const res = await apiClient.submitCampusApplication({
        student_id: currentStudent.id,
        job_id: selectedJob.id,
        job_title: selectedJob.title,
        company: selectedJob.company,
        tier: selectedJob.tier
      });

      setAppliedJobs(prev => [...prev, selectedJob.id]);
      setCurrentStudent(prev => ({ ...prev, activeAppsCount: res.active_applications }));
      addTrace?.(`[ENROLLED]: Registered for ${selectedJob.title}. Drives: ${res.active_applications}/3`);
      alert(res.message);
    } catch (err) {
      alert(`Application Rejected: ${err.message}`);
      addTrace?.(`[SOP REJECTION]: ${err.message}`, "error");
    }
  };

  const handleSavePreferences = async (newPrefs) => {
    try {
      const res = await apiClient.updatePreferences(currentStudent.id, newPrefs);
      setPreferences(res.preferences);
      addTrace?.(`Saved preferences. Re-ranking job opportunities & regenerating roadmap...`);
      fetchRankedJobs();
    } catch (err) {
      alert(`Could not save preferences: ${err.message}`);
    }
  };

  const handleToggleSaveJob = async (jobId) => {
    const isSaved = matchResult.isSaved;
    const action = isSaved ? 'REJECTED' : 'SAVED';

    try {
      await apiClient.submitFeedback(currentStudent.id, 'JOB', jobId, action);
      addTrace?.(`${isSaved ? 'Removed bookmark from' : 'Bookmarked'} ${selectedJob.title}.`);
      const res = await apiClient.getFeedback(currentStudent.id);
      setFeedbackRecords(res.feedback || []);
    } catch (err) {
      alert(`Could not update bookmark: ${err.message}`);
    }
  };

  const handleHideJob = async (jobId) => {
    try {
      await apiClient.submitFeedback(currentStudent.id, 'JOB', jobId, 'HIDDEN');
      addTrace?.(`Moved ${selectedJob.title} to hidden list.`);
      const res = await apiClient.getFeedback(currentStudent.id);
      setFeedbackRecords(res.feedback || []);
    } catch (err) {
      alert(`Could not hide role: ${err.message}`);
    }
  };

  const hasApplied = appliedJobs.includes(selectedJob.id);
  const isCgpaBlocked = selectedJob.tier === "Tier-1" && currentStudent.cgpa < 6.0;
  const isCapBlocked = currentStudent.activeAppsCount >= 3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {profileDataError && (
        <RetryableErrorCard
          title="Some profile data could not be loaded"
          message={profileDataError}
          onRetry={() => window.location.reload()}
        />
      )}
      {/* Header Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-[#E6E6E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-subtle mb-1">
            <span className="font-bold text-terracotta-600 uppercase tracking-wider">Career Portal</span>
            <span>•</span>
            <span>Campus Placements 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight">
            Welcome back, {currentStudent.name.split(" ")[0]}
          </h1>
          <p className="text-xs sm:text-sm text-subtle mt-1 max-w-xl">
            Targeting: <strong className="text-obsidian">{selectedJob.title}</strong> • Placement Readiness: <strong className="text-terracotta-600 font-mono">{overallReadiness}%</strong>
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-canvas p-2 rounded-2.5xl border border-[#E2E2DE] flex items-center space-x-2">
            <User className="w-4 h-4 text-subtle ml-2" />
            <span className="text-xs font-semibold text-subtle">Profile:</span>
            <select
              value={currentStudent.id}
              onChange={(e) => {
                const found = DEMO_PROFILES.find(p => p.id === e.target.value);
                if (found) setCurrentStudent(found);
              }}
              className="text-xs font-bold bg-surface px-3 py-1.5 rounded-xl border border-[#E0E0DC] text-obsidian focus:outline-none cursor-pointer"
            >
              {DEMO_PROFILES.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} ({prof.branch.split(" ")[0]})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsPreferenceModalOpen(true)}
            className="px-3.5 py-2 rounded-2.5xl bg-surface hover:bg-[#EAEAEA] border border-[#E0E0DC] text-xs font-bold text-obsidian flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-terracotta-500" />
            <span>Preferences</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 rounded-2.5xl bg-obsidian text-white hover:bg-zinc-800 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-terracotta-400" />
            <span>Placement Dossier</span>
          </button>
        </div>
      </div>

      {/* Next Best Action Card */}
      {nextAction && (
        <div className="bg-gradient-to-r from-terracotta-50 to-amber-50/50 p-5 rounded-3xl border border-terracotta-200/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-terracotta-700 tracking-wider block">
                Next Best Step • Agentic Recommendation
              </span>
              <h3 className="font-extrabold text-obsidian text-sm mt-0.5">{nextAction.headline}</h3>
              <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{nextAction.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-full border border-emerald-200">
              Projected: ~{nextAction.projected_readiness}%
            </span>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Wing (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-terracotta-500" />
                <h3 className="font-bold text-obsidian text-base">Your Resume</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Data Protected
              </span>
            </div>

            <label className="border-2 border-dashed border-[#DCDCD8] hover:border-terracotta-500 rounded-2.5xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-canvas/60 transition-colors">
              <Upload className="w-8 h-8 text-terracotta-500 mb-2" />
              <span className="text-xs font-bold text-obsidian">
                {isUploading ? "Reading resume with AI..." : "Upload your resume (PDF)"}
              </span>
              <span className="text-[11px] text-subtle mt-0.5">Automated formatting and gap extraction</span>
              <input type="file" accept=".pdf" onChange={handlePdfDrop} disabled={isUploading} className="hidden" />
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-subtle font-medium">Loaded: <strong className="text-obsidian">{currentStudent.name}</strong></span>
              <button
                onClick={() => setIsATSModalOpen(true)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-canvas text-obsidian hover:bg-[#EAEAEA] border border-[#E0E0DC] flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Formatted Preview</span>
              </button>
            </div>
          </div>

          {currentStudent.weakBullets && currentStudent.weakBullets.length > 0 && (
            <div className="bg-surface rounded-3xl p-5 border border-[#E6E6E3] shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Resume Improvement Recommendation</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Current Entry:</span>
                <p className="text-amber-950 font-mono text-[11px]">
                  "{currentStudent.weakBullets[0].original}"
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">✦ Recommended Rewrite:</span>
                <p className="text-emerald-950 font-medium text-[11px]">
                  "{currentStudent.weakBullets[0].improved || currentStudent.weakBullets[0].suggested}"
                </p>
              </div>
            </div>
          )}

          <ConcentricReadinessDial readiness={readinessPayload} />
          <ProgressTimelineWidget progressData={serverProgress} />

          {/* External Job Parser */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-3">
            <h4 className="font-bold text-obsidian text-sm">Analyze External Opportunity</h4>
            <p className="text-xs text-subtle">Paste an off-campus job link to match your current profile.</p>
            <div className="flex space-x-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://company.com/careers/role"
                className="w-full text-xs px-3.5 py-2 rounded-xl bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
              />
              <button
                onClick={handleIngestUrl}
                disabled={isScrapingUrl || !urlInput.trim()}
                className="px-4 py-2 rounded-xl bg-obsidian text-white text-xs font-bold shrink-0 hover:bg-zinc-800 disabled:opacity-50"
              >
                {isScrapingUrl ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-terracotta-500" />
                <h3 className="font-bold text-obsidian text-base">Hiring Market Trends</h3>
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
                  🔥 High Demand Skills
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
                  ⚠️ Declining Focus
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

        {/* Right Wing (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Role Selector with Provenance Badges */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            {jobsError ? (
              <RetryableErrorCard
                title="Could Not Load Opportunities"
                message={jobsError}
                onRetry={fetchRankedJobs}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-subtle font-semibold">Active Placement Target:</span>
                      {/* Sprint 3: Provenance Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedJob.data_mode === "LIVE_DATA"
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        {selectedJob.data_mode === "LIVE_DATA"
                          ? `🟢 Live Public Opportunity (${selectedJob.source_label || "Arbeitnow"})`
                          : `📋 Curated Institutional Sample`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="text-sm font-bold bg-canvas px-3.5 py-1.5 rounded-full border border-[#E0E0DC] text-obsidian focus:outline-none cursor-pointer max-w-md"
                      >
                        {jobsList.map((job, idx) => (
                          <option key={`${job.id}-${idx}`} value={job.id}>
                            {job.title} — {job.company} ({job.composite_score ? `${job.composite_score}% Match` : job.tier})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleToggleSaveJob(selectedJob.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          matchResult.isSaved
                            ? 'bg-amber-50 text-amber-600 border-amber-300'
                            : 'bg-canvas text-subtle hover:text-obsidian border-[#E0E0DC]'
                        }`}
                        title={matchResult.isSaved ? "Saved Role (Click to Unsave)" : "Bookmark Role"}
                      >
                        {matchResult.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleHideJob(selectedJob.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          matchResult.isHidden
                            ? 'bg-rose-50 text-rose-600 border-rose-300'
                            : 'bg-canvas text-subtle hover:text-rose-600 border-[#E0E0DC]'
                        }`}
                        title="Not Interested / Hide"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-3 bg-canvas px-4 py-2 rounded-2.5xl border border-[#E2E2DE]">
                      <div className="w-11 h-11 rounded-full border-4 border-terracotta-500 flex items-center justify-center font-black text-obsidian text-xs">
                        {matchResult.matchPercentage}%
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-subtle uppercase block">Role Fit</span>
                        <span className="text-xs font-semibold text-obsidian">
                          {matchResult.matchedSkills.length} of {reqSkillsCount} skills
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {matchResult.sopViolations.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>University Placement Policy Notice</span>
                    </div>
                    {matchResult.sopViolations.map((v, i) => (
                      <p key={i} className="text-[11px] text-rose-800">• {v}</p>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-2.5xl bg-canvas border border-[#E2E2DE] space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-obsidian">
                    <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
                    <span>Why This Role Fits Your Profile:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-zinc-700">
                    {matchResult.fitReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                    {matchResult.cautionNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5 text-amber-800">
                        <span className="text-amber-500 font-bold">△</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {matchResult.matchedSkills.map((sk, idx) => (
                    <span key={idx} className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-3 py-1 rounded-full border border-emerald-200">
                      ✓ {sk}
                    </span>
                  ))}
                  {matchResult.missingSkills.map((sk, idx) => (
                    <span key={idx} className="text-xs bg-terracotta-50 text-terracotta-600 font-semibold px-3 py-1 rounded-full border border-terracotta-100">
                      △ Recommended: {sk}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#ECECE9] flex items-center justify-between">
                  <span className="text-xs text-subtle">
                    Active Drives: <strong>{currentStudent.activeAppsCount} / 3</strong> enrolled
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
                        <span>Application Submitted</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isCapBlocked ? "Application Limit (3) Reached" : isCgpaBlocked ? "Restricted by CGPA" : "Enroll for Campus Drive"}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          <SkillRadarChart
            studentSkills={currentStudent.skills}
            qualityScore={currentStudent.qualityScore || currentStudent.quality_score || 75}
            targetRole={selectedJob.title}
          />

          {/* Dynamic 4-Week Roadmap with Retryable Error Card */}
          <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-terracotta-500" />
                  <h3 className="font-bold text-obsidian text-base">4-Week Career Preparation Plan</h3>
                </div>
                <p className="text-xs text-subtle">
                  Adapted for <strong className="text-obsidian">{selectedJob.title}</strong> • Style: <strong className="text-obsidian">{preferences?.learning_style?.replace('_', ' ') || 'PROJECT BASED'}</strong>
                </p>
              </div>
              <span className="text-xs font-bold text-obsidian bg-canvas px-3 py-1 rounded-full border border-[#E0E0DC]">
                {planCompletionPct}% Completed
              </span>
            </div>

            {roadmapError ? (
              <RetryableErrorCard
                title="Could Not Generate Roadmap"
                message={roadmapError}
                onRetry={fetchRoadmap}
                isRetrying={isLoadingRoadmap}
              />
            ) : isLoadingRoadmap ? (
              <div className="p-8 text-center text-xs text-subtle">Personalizing roadmap modules...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dynamicRoadmap.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleMilestone(item.week)}
                    className={`p-4 rounded-2.5xl border transition-all cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                      item.is_completed || completedMilestones.includes(item.week)
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-canvas border-[#E2E2DE] hover:border-terracotta-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-terracotta-600 uppercase tracking-wider">
                          Week {item.week} • {item.skill}
                        </span>
                        <CheckCircle2 className={`w-4 h-4 ${item.is_completed || completedMilestones.includes(item.week) ? 'text-emerald-600' : 'text-zinc-300'}`} />
                      </div>
                      <h4 className="font-bold text-obsidian text-xs mt-1 leading-snug">{item.title}</h4>
                      <p className="text-[11px] text-subtle mt-0.5">{item.provider}</p>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-[#E8E8E4]">
                      <div className="flex items-center justify-between text-[10px] text-zinc-600">
                        <span className="bg-surface px-2 py-0.5 rounded-full border border-[#E0E0DC] font-medium">
                          {item.format_badge}
                        </span>
                        <span className="flex items-center space-x-1 font-mono text-terracotta-700">
                          <Clock className="w-3 h-3" />
                          <span>{item.allocated_hours}h / {item.weekly_budget}h budget</span>
                        </span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-obsidian hover:text-terracotta-500"
                      >
                        <span>Access Material</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <MockInterview
            studentId={currentStudent.id}
            targetRoleTitle={selectedJob.title}
            missingSkills={matchResult.missingSkills.length > 0 ? matchResult.missingSkills : (selectedJob.requiredSkills || ["System Design", "Docker"])}
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

      {isPreferenceModalOpen && (
        <PreferenceModal
          preferences={preferences}
          onSave={handleSavePreferences}
          onClose={() => setIsPreferenceModalOpen(false)}
        />
      )}

      {isReportModalOpen && (
        <ReadinessReportModal
          student={currentStudent}
          targetJob={selectedJob}
          readiness={readinessPayload}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
}