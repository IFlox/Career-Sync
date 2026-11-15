import React, { useState, useEffect, useReducer, useRef } from 'react';
import { 
  Users, CheckCircle2, XCircle, AlertTriangle, Download, 
  BarChart3, Clock, Search, Sparkles, Filter, Briefcase, MapPin,
  RotateCcw, ShieldAlert, RefreshCw
} from 'lucide-react';
import { DEMO_PROFILES } from '../data/seedData';
import { apiClient } from '../api/client';
import RemediationWorkshopModal from './RemediationWorkshopModal';
import InlineFeedback from './InlineFeedback';
import { createErrorFeedback, createSuccessFeedback } from '../utils/feedback';
import {
  RESET_STATUS,
  canResetWorkspace,
  createResetState,
  resetWorkspaceReducer
} from '../utils/workspaceReset';

export default function AdminPortal({ isAdminLoggedIn = false }) {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [intentAnalytics, setIntentAnalytics] = useState(null);
  const [overviewAnalytics, setOverviewAnalytics] = useState(null);
  const [overviewStatus, setOverviewStatus] = useState("loading");
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [generatedSyllabus, setGeneratedSyllabus] = useState(null);
  const [isGeneratingSyllabus, setIsGeneratingSyllabus] = useState(false);
  const [resetState, dispatchReset] = useReducer(resetWorkspaceReducer, undefined, createResetState);
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  // Reset is destructive and requires an authenticated administrator session.
  const resetAvailable = canResetWorkspace({
    isAdminLoggedIn,
    hasAdminToken: Boolean(apiClient.getAdminToken())
  });

  const fetchAdminData = async ({ reportErrors = false } = {}) => {
    // A second request while one is already running is ignored.
    if (refreshInFlight.current) return false;
    refreshInFlight.current = true;
    setIsRefreshing(true);

    const hadOverview = Boolean(overviewAnalytics);

    const matrixTask = apiClient.getVerificationMatrix()
      .then(data => setStudents(data.students || []));

    const intentTask = apiClient.getIntentAnalytics()
      .then(data => setIntentAnalytics(data));

    const overviewTask = apiClient.getAnalyticsOverview()
      .then(data => {
        setOverviewAnalytics(data);
        setOverviewStatus("ready");
      });

    let results;
    try {
      results = await Promise.allSettled([matrixTask, intentTask, overviewTask]);
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }

    const [matrixResult, intentResult, overviewResult] = results;

    // Failure keeps the last valid data; the demo matrix fallback only applies
    // when the portal has no student rows to preserve.
    if (matrixResult.status === "rejected") {
      setStudents(prev => (prev.length > 0 ? prev : DEMO_PROFILES));
    }
    // Intent analytics intentionally keeps its previous value on failure.

    if (overviewResult.status === "rejected" && !hadOverview) {
      setOverviewStatus("error");
    }

    const failures = results.filter(result => result.status === "rejected");
    if (reportErrors && failures.length > 0) {
      setAdminFeedback({
        ...createErrorFeedback("Analytics refresh failed", failures[0].reason, {
          fallback: "Live analytics could not be refreshed. Showing the last loaded values."
        }),
        retry: () => fetchAdminData({ reportErrors: true })
      });
    }

    return failures.length === 0;
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (id, newStatus) => {
    const previous = [...students];
    setAdminFeedback(null);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, adminStatus: newStatus, admin_status: newStatus } : s));

    try {
      await apiClient.updateStudentStatus(id, newStatus);
    } catch (err) {
      setStudents(previous);
      setAdminFeedback({
        ...createErrorFeedback("Status update rejected", err, {
          fallback: "The server rejected this status change."
        }),
        retry: () => handleToggleStatus(id, newStatus)
      });
      return;
    }

    setAdminFeedback(createSuccessFeedback(
      "Candidate status updated",
      `Candidate ${id} is now ${newStatus}.`
    ));
    // Only refresh after the status change was accepted by the server.
    await fetchAdminData({ reportErrors: true });
  };

  const handleExportCSV = async () => {
    setAdminFeedback(null);

    try {
      const res = await fetch(apiClient.getExportCSVUrl(), {
        headers: apiClient.getAdminHeaders()
      });
      if (!res.ok) throw new Error("Unauthorized or session expired.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CareerSync_Verified_Batch_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setAdminFeedback(createSuccessFeedback(
        "Verified batch exported",
        "The verified cohort CSV has been downloaded."
      ));
    } catch (err) {
      setAdminFeedback({
        ...createErrorFeedback("Could not export CSV", err, {
          fallback: "The verified batch could not be exported."
        }),
        retry: () => handleExportCSV()
      });
    }
  };

  // Phase 4: 1-Click Remediation Generator
  const handleGenerateWorkshop = async () => {
    setIsGeneratingSyllabus(true);
    setAdminFeedback(null);

    try {
      const data = await apiClient.generateRemediationSyllabus([
        "Docker & Containerization",
        "System Design",
        "RAG Pipelines"
      ]);
      setGeneratedSyllabus(data);
      setIsSyllabusModalOpen(true);
    } catch (err) {
      setAdminFeedback({
        ...createErrorFeedback("Syllabus generation failed", err, {
          fallback: "The remediation syllabus could not be generated."
        }),
        retry: () => handleGenerateWorkshop()
      });
    } finally {
      setIsGeneratingSyllabus(false);
    }
  };

  // Sprint 3: Reset Workspace (administrator only)
  const handleRequestReset = () => {
    dispatchReset({ type: 'REQUEST_CONFIRMATION' });
  };

  const handleCancelReset = () => {
    dispatchReset({ type: 'CANCEL' });
  };

  const handleConfirmReset = async () => {
    dispatchReset({ type: 'CONFIRM' });

    try {
      await apiClient.resetWorkspace();
      dispatchReset({ type: 'SUCCESS' });
      window.location.reload();
    } catch (err) {
      dispatchReset({ type: 'FAILURE', error: err });
    }
  };

  // Filtered Student List
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.branch?.toLowerCase().includes(searchQuery.toLowerCase());
    const status = s.adminStatus || s.admin_status || "Pending";
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;

    const prefRoles = s.preferences?.preferred_roles || [];
    const matchesRole = roleFilter === "ALL" || prefRoles.some(r => r.includes(roleFilter));

    return matchesSearch && matchesStatus && matchesRole;
  });

  const overviewReady = overviewStatus === "ready" && Boolean(overviewAnalytics);
  const hasAverageScore = overviewReady
    && overviewAnalytics.average_quality_score !== null
    && overviewAnalytics.average_quality_score !== undefined;
  const missingSkills = overviewAnalytics?.batch_missing_skills || [];
  const skillDataCoverage = (
    overviewReady
    && overviewAnalytics.skill_data_coverage_percentage !== null
    && overviewAnalytics.skill_data_coverage_percentage !== undefined
  )
    ? overviewAnalytics.skill_data_coverage_percentage
    : null;
  const hasSkillDataCoverage = skillDataCoverage !== null;
  const hasInsufficientSkillData = overviewReady
    && hasSkillDataCoverage
    && skillDataCoverage === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-[#E6E6E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-subtle mb-1">
            <span className="font-semibold text-terracotta-500">Placement Office Administration</span>
            <span>•</span>
            <span>Batch 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight">
            Placement Cell Analytics & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-subtle mt-1">
            Review candidate career intent, enforce placement rules, and export verified rosters for recruiters.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchAdminData({ reportErrors: true })}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-full bg-surface hover:bg-canvas text-obsidian border border-[#E0E0DC] font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-terracotta-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Analytics"}</span>
          </button>

          {/* Phase 4: 1-Click Bootcamp Generator Button */}
          <button
            onClick={handleGenerateWorkshop}
            disabled={isGeneratingSyllabus}
            className="px-4 py-2.5 rounded-full bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-600 border border-terracotta-200 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingSyllabus ? "Generating Bootcamp..." : "⚡ Generate 3-Day Bootcamp"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 rounded-full bg-obsidian text-white font-bold text-xs flex items-center space-x-2 hover:bg-zinc-800 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-terracotta-500" />
            <span>Export Verified Batch (CSV)</span>
          </button>
        </div>
      </div>

      {adminFeedback && (
        <InlineFeedback
          variant={adminFeedback.variant}
          title={adminFeedback.title}
          message={adminFeedback.message}
          onRetry={adminFeedback.retry}
          onDismiss={adminFeedback.variant === 'error' ? undefined : () => setAdminFeedback(null)}
        />
      )}

      {/* Cohort Summary Cards */}
      {overviewStatus === "error" ? (
        <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs flex items-start space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-obsidian">Live analytics unavailable</p>
            <p className="text-xs text-subtle mt-1 leading-relaxed">
              The live cohort summary could not be loaded, so no estimated figures are shown.
              The student matrix below is unaffected.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
            <span className="text-xs font-semibold text-subtle block">Average Student Score</span>
            <div className="text-3xl font-black text-obsidian mt-1">
              {!overviewReady ? (
                <span className="text-sm font-bold text-subtle">Loading live analytics...</span>
              ) : hasAverageScore ? (
                `${overviewAnalytics.average_quality_score}%`
              ) : (
                <span className="text-sm font-bold text-subtle">Unavailable</span>
              )}
            </div>
            <p className="text-[11px] text-subtle mt-1 font-medium">
              {!overviewReady
                ? "Fetching the live cohort summary"
                : hasAverageScore
                  ? `Live average across ${overviewAnalytics.cohort_size} candidates`
                  : "No candidate has a recorded quality score yet"}
            </p>
          </div>

          <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
            <span className="text-xs font-semibold text-subtle block">Students Needing Help</span>
            <div className="text-3xl font-black text-rose-600 mt-1">
              {overviewReady
                ? overviewAnalytics.high_risk_count
                : <span className="text-sm font-bold text-subtle">Loading live analytics...</span>}
            </div>
            <p className="text-[11px] text-rose-700 mt-1 font-medium">CGPA &lt; 6.0 or low skill match</p>
          </div>

          <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
            <span className="text-xs font-semibold text-subtle block">Approved for Companies</span>
            <div className="text-3xl font-black text-obsidian mt-1">
              {overviewReady
                ? (
                  <>
                    {overviewAnalytics.approved_count}{" "}
                    <span className="text-xs font-normal text-subtle">/ {overviewAnalytics.cohort_size}</span>
                  </>
                )
                : <span className="text-sm font-bold text-subtle">Loading live analytics...</span>}
            </div>
            <p className="text-[11px] text-subtle mt-1">Ready for recruiter distribution</p>
          </div>
        </div>
      )}

      {/* Phase 4: Student Intent Analytics & Demand Mismatch */}
      {intentAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs space-y-3">
            <h3 className="font-bold text-obsidian text-base flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-terracotta-500" />
              <span>Top Desired Roles in Cohort</span>
            </h3>
            <div className="space-y-2">
              {(intentAnalytics.top_desired_roles || []).map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-obsidian">{r.role}</span>
                  <span className="text-terracotta-600 font-mono font-bold">{r.percentage}% of students</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs space-y-3">
            <h3 className="font-bold text-obsidian text-base flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-terracotta-500" />
              <span>Location Preferences</span>
            </h3>
            <div className="space-y-2">
              {(intentAnalytics.top_desired_locations || []).map((l, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-obsidian">{l.location}</span>
                  <span className="text-emerald-700 font-mono font-bold">{l.percentage}% open</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cohort Missing Skills Chart */}
      <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start space-x-2">
            <BarChart3 className="w-5 h-5 text-terracotta-500 mt-0.5" />
            <div>
              <h3 className="font-bold text-obsidian text-base">Skills Missing Across Live Job Listings</h3>
              <p className="text-[11px] text-subtle mt-0.5 leading-relaxed">
                Based on skills detected in current live job titles, descriptions, and tags
              </p>
            </div>
          </div>
          {overviewReady && hasSkillDataCoverage && !hasInsufficientSkillData && (
            <span className="text-xs font-semibold text-obsidian bg-canvas border border-[#E0E0DC] rounded-full px-3 py-1 whitespace-nowrap">
              {skillDataCoverage}% skill data coverage
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-2xl bg-canvas border border-[#ECECE9] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Live jobs analysed</p>
            <p className="text-sm font-bold text-obsidian font-mono">
              {overviewReady ? overviewAnalytics.live_job_count : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-canvas border border-[#ECECE9] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Jobs with skill data</p>
            <p className="text-sm font-bold text-obsidian font-mono">
              {overviewReady ? overviewAnalytics.jobs_with_skill_data : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-canvas border border-[#ECECE9] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Skill data coverage</p>
            <p className="text-sm font-bold text-obsidian font-mono">
              {hasSkillDataCoverage ? `${skillDataCoverage}%` : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {hasInsufficientSkillData ? (
            <div className="rounded-2xl border border-dashed border-[#E0E0DC] bg-canvas px-4 py-6 text-center">
              <AlertTriangle className="w-5 h-5 text-subtle mx-auto mb-2" />
              <p className="text-xs font-bold text-obsidian">Insufficient live skill data</p>
              <p className="text-[11px] text-subtle mt-1 leading-relaxed">
                Skills were detected in {overviewAnalytics.jobs_with_skill_data} of {overviewAnalytics.live_job_count} live listings, which is not enough to report reliable missing-skill percentages.
              </p>
            </div>
          ) : missingSkills.length > 0 ? (
            missingSkills.map((bar) => (
              <div key={bar.skill} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-obsidian">
                  <span>{bar.skill}</span>
                  <span className="text-subtle font-mono">{bar.missing_percentage}% of batch missing</span>
                </div>
                <div className="w-full h-3 bg-canvas rounded-full overflow-hidden border border-[#E0E0DC]">
                  <div
                    className="h-full bg-terracotta-500 rounded-full transition-all duration-500"
                    style={{ width: `${bar.missing_percentage}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E0E0DC] bg-canvas px-4 py-6 text-center">
              <AlertTriangle className="w-5 h-5 text-subtle mx-auto mb-2" />
              <p className="text-xs font-bold text-obsidian">
                {overviewStatus === "error"
                  ? "Live analytics unavailable"
                  : overviewStatus === "ready"
                    ? "No skill gaps to report"
                    : "Loading live skill-gap data..."}
              </p>
              <p className="text-[11px] text-subtle mt-1 leading-relaxed">
                {overviewStatus === "error"
                  ? "We could not reach the live analytics service, so no skill-gap percentages are shown."
                  : overviewStatus === "ready"
                    ? "No missing skills were found in the current live listings for this cohort."
                    : "Skill gaps are calculated from current live job listings."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Verification Matrix Table with Intent & Multi-Filter Controls */}
      <div className="bg-surface rounded-3xl border border-[#E6E6E3] shadow-xs overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#ECECE9] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-obsidian text-base">Student Verification Matrix</h3>
            <p className="text-xs text-subtle">Admin review gate: candidate preferences and eligibility verified before export.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-full bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="AI">AI Systems</option>
              <option value="Backend">Backend Dev</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-full bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Revision Required">Held</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-full bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-[#ECECE9] text-subtle font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">Academic CGPA</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Target Career Intent</th>
                <th className="px-6 py-3">Rules & Alerts</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECE9]">
              {filteredStudents.map((student) => {
                const status = student.adminStatus || student.admin_status || "Pending";
                const rawScore = student.qualityScore ?? student.quality_score;
                const hasScore = rawScore !== null && rawScore !== undefined && rawScore !== "";
                const cgpaValue = student.cgpa;
                const hasCgpa = cgpaValue !== null && cgpaValue !== undefined && cgpaValue !== "";
                const isSlaEscalated = (student.slaHoursPending || student.sla_hours_pending || 0) > 48;
                const isRestricted = hasCgpa && Number(cgpaValue) < 6.0;
                const pref = student.preferences || {};
                const topRole = (pref.preferred_roles || [])[0] || "General Engineering";
                const topLoc = (pref.preferred_locations || [])[0] || "Flexible";

                return (
                  <tr key={student.id} className="hover:bg-canvas/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-obsidian block">{student.name}</span>
                      <span className="text-[10px] text-subtle font-mono">{student.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-obsidian block">{student.cgpa} / 10.0</span>
                      <span className="text-[10px] text-subtle">{student.branch}</span>
                    </td>
                    <td className="px-6 py-4">
                      {hasScore ? (
                        <span className="font-bold text-obsidian text-sm">{rawScore}%</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-subtle">Unavailable</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <span className="font-bold text-obsidian block text-[11px] truncate max-w-[180px]">
                        🎯 {topRole}
                      </span>
                      <span className="text-[10px] text-subtle flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-terracotta-500 shrink-0" />
                        <span>{topLoc}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {isSlaEscalated && (
                        <span className="inline-block text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                          Review Pending &gt; 48 Hrs
                        </span>
                      )}
                      {isRestricted && (
                        <span className="inline-block text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          Tier-2 Only (CGPA &lt; 6.0)
                        </span>
                      )}
                      {!isSlaEscalated && !isRestricted && (
                        <span className="text-[11px] text-emerald-700">✓ All Rules Cleared</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : status === 'Revision Required'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {status !== 'Approved' && (
                        <button
                          onClick={() => handleToggleStatus(student.id, 'Approved')}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {status !== 'Revision Required' && (
                        <button
                          onClick={() => handleToggleStatus(student.id, 'Revision Required')}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-surface text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        >
                          Hold
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo Workspace Maintenance — authenticated administrators only */}
      {resetAvailable && (
        <div className="bg-surface rounded-3xl border border-[#E6E6E3] shadow-xs p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-obsidian text-base">Reset Demo Workspace</h3>
                <p className="text-xs text-subtle mt-1 max-w-xl leading-relaxed">
                  Restores Priya, Rahul, and Amit to their baseline seed states, and clears uploaded
                  resumes, applications, and milestone progress. Requires an authenticated
                  placement-officer session.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <button
                onClick={handleRequestReset}
                disabled={resetState.status === RESET_STATUS.RESETTING}
                className="px-4 py-2 rounded-full bg-surface hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetState.status === RESET_STATUS.RESETTING ? 'animate-spin' : ''}`} />
                <span>{resetState.status === RESET_STATUS.RESETTING ? "Resetting workspace..." : "Reset Workspace"}</span>
              </button>
              {resetState.status === RESET_STATUS.SUCCESS && (
                <span role="status" className="text-[11px] font-semibold text-emerald-700 text-center sm:text-right">
                  Workspace restored. Reloading...
                </span>
              )}
            </div>
          </div>

          {resetState.status === RESET_STATUS.ERROR && (
            <div role="alert" className="mt-4 rounded-2xl bg-rose-50/80 border border-rose-200 p-3.5 text-rose-900">
              <p className="text-xs font-bold">Workspace reset failed</p>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium mt-0.5">{resetState.error}</p>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium mt-1">
                The reset did not complete. You can safely try again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset confirmation modal */}
      {resetState.status === RESET_STATUS.CONFIRMING && (
        <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-workspace-title"
            aria-describedby="reset-workspace-description"
            className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E0E0DC] space-y-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reset-workspace-title" className="font-bold text-obsidian text-base">
                Reset demo workspace?
              </h3>
              <p id="reset-workspace-description" className="text-xs text-subtle mt-1 leading-relaxed">
                This purges uploaded resumes and applications, and restores Priya, Rahul, and Amit to
                their baseline seed states. Milestone progress and readiness are recalculated from
                scratch. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelReset}
                autoFocus
                className="px-4 py-2 rounded-full bg-surface hover:bg-cardMuted border border-[#E2E2DE] text-xs font-semibold text-obsidian transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Yes, reset workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remediation Syllabus Modal */}
      {isSyllabusModalOpen && (
        <RemediationWorkshopModal
          syllabus={generatedSyllabus}
          onClose={() => setIsSyllabusModalOpen(false)}
        />
      )}
    </div>
  );
}