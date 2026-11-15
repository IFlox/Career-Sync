import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  ExternalLink, TrendingUp, Eye, Send, Check, User,
  Bookmark, BookmarkCheck, EyeOff, Sliders, Sparkles, Clock, BookOpen,
  Compass, Award, RefreshCw, Search
} from 'lucide-react';
import { DEMO_PROFILES } from '../data/seedData';
import { assessLayoffRisk, MARKET_SKILL_RADAR } from '../data/marketTaxonomy';
import { evaluateJobMatch } from '../utils/semanticMatcher';
import { buildProfileReadiness } from '../utils/readiness';
import {
  applyCompletedMilestonesToRoadmap,
  applyMilestoneToggleResult,
  normalizeCompletedMilestones
} from '../utils/milestones';
import {
  hasAiProvenance,
  normalizeAiRoadmap,
  resolveMaterialLink
} from '../utils/learningPlan';
import {
  LIVE_JOBS_LOAD_ERROR,
  getLiveJobSourceName,
  isSafeLiveJobUrl,
  normalizeLiveJobs
} from '../utils/liveJobs';
import { resolveRoadmapRecommendation } from '../utils/roadmapRecommendation';
import { filterTechnicalJobs, resolveSelectedJobId } from '../utils/jobRelevance';
import {
  applyHideSuccess,
  applyOptimisticHide,
  resolveVisibleJobState,
  rollbackHide
} from '../utils/hiddenJobs';
import {
  addAppliedJob,
  isDuplicateApplicationError,
  resolveApplicationActionState,
  restoreAppliedJobs
} from '../utils/applications';
import {
  beginRequest,
  getProfileState,
  isLatestRequest,
  isResponseForStudent,
  updateProfileState
} from '../utils/profileState';
import {
  addUploadedCandidateId,
  findCandidateProfile,
  loadUploadedCandidateIds,
  mergeCandidateProfiles,
  normalizeCandidateProfile,
  removeUploadedCandidateId
} from '../utils/profileCandidates';
import ConcentricReadinessDial from './ConcentricReadinessDial';
import ProgressTimelineWidget from './ProgressTimelineWidget';
import SkillRadarChart from './SkillRadarChart';
import MockInterview from './MockInterview';
import ATSPreviewModal from './ATSPreviewModal';
import PreferenceModal from './PreferenceModal';
import ReadinessReportModal from './ReadinessReportModal';
import RetryableErrorCard from './RetryableErrorCard';
import InlineFeedback from './InlineFeedback';
import {
  buildApplicationMessage,
  buildBookmarkMessage,
  buildHiddenJobMessage,
  buildMilestoneMessage,
  buildPreferencesMessage,
  buildResumeUploadMessage,
  buildUrlAnalysisMessage,
  createErrorFeedback,
  createInfoFeedback,
  createSuccessFeedback
} from '../utils/feedback';
import { apiClient } from '../api/client';

const buildInitialProfileUi = () => ({
  jobsList: [],
  selectedJobId: null,
  completedMilestones: [],
  interviewScore: 70,
  serverProgress: null,
  preferences: null,
  feedbackRecords: [],
  roadmap: [],
  isLoadingRoadmap: true,
  roadmapError: null,
  isLoadingJobs: true,
  jobsError: null,
  preferencesError: null,
  feedbackError: null,
  applicationFeedback: null,
  milestoneFeedback: null,
  jobFeedback: null,
  preferencesFeedback: null,
  resumeFeedback: null,
  isUploading: false
});

const createInitialProfileState = () =>
  DEMO_PROFILES.reduce((acc, profile) => {
    acc[profile.id] = buildInitialProfileUi();
    return acc;
  }, {});

// Uploaded candidates are only restored from storage when the browser exposes it.
const getCandidateStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

export default function StudentPortal() {
  const [currentStudent, setCurrentStudent] = useState(DEMO_PROFILES[0]);
  // Demo profiles plus any candidate created by a resume upload.
  const [candidateProfiles, setCandidateProfiles] = useState(() =>
    mergeCandidateProfiles(DEMO_PROFILES, [])
  );
  const [profileUiByStudent, setProfileUiByStudent] = useState(createInitialProfileState);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [submittingApplicationStudents, setSubmittingApplicationStudents] = useState([]);
  const [appliedJobsByStudent, setAppliedJobsByStudent] = useState({});
  const [applicationEventsByStudent, setApplicationEventsByStudent] = useState({});
  const [applicationHistoryByStudent, setApplicationHistoryByStudent] = useState({});

  // Inline feedback replaces disruptive alert() calls for each action area.
  const [urlFeedback, setUrlFeedback] = useState(null);

  const profileUi = useMemo(
    () => getProfileState(profileUiByStudent, currentStudent.id) || buildInitialProfileUi(),
    [profileUiByStudent, currentStudent.id]
  );
  const {
    jobsList,
    selectedJobId,
    completedMilestones,
    interviewScore,
    serverProgress,
    preferences,
    feedbackRecords,
    roadmap: dynamicRoadmap,
    isLoadingRoadmap,
    roadmapError,
    isLoadingJobs,
    jobsError,
    preferencesError,
    feedbackError,
    applicationFeedback,
    milestoneFeedback,
    jobFeedback,
    preferencesFeedback,
    resumeFeedback,
    isUploading
  } = profileUi;
  const profileDataError = [preferencesError, feedbackError].filter(Boolean).join(' ') || null;

  const lastResumeFilesRef = useRef({});
  const requestIdsRef = useRef({});
  // Guards against re-entrant clicks per student while a submission is in flight.
  const submittingStudentsRef = useRef(new Set());
  const currentStudentIdRef = useRef(currentStudent.id);

  const updateProfileUiFor = (studentId, patch) => {
    setProfileUiByStudent(prev =>
      updateProfileState(prev, studentId, patch, buildInitialProfileUi)
    );
  };

  // Creates the per-profile UI entry for a candidate once. Re-uploading the
  // same candidate keeps any state the user already built up.
  const ensureProfileUi = (studentId, targetJobId) => {
    if (!studentId) return;
    setProfileUiByStudent(prev => {
      if (getProfileState(prev, studentId)) return prev;

      const base = buildInitialProfileUi();
      return updateProfileState(
        prev,
        studentId,
        { selectedJobId: resolveSelectedJobId(base.jobsList, targetJobId || base.selectedJobId) },
        buildInitialProfileUi
      );
    });
  };

  const registerUploadedCandidate = (profile) => {
    if (!profile?.id) return;
    // A candidate id must never shadow one of the static demo profiles.
    if (findCandidateProfile(DEMO_PROFILES, profile.id)) return;

    setCandidateProfiles(prev => mergeCandidateProfiles(prev, [profile]));
    ensureProfileUi(profile.id, profile.targetRole);
    addUploadedCandidateId(getCandidateStorage(), profile.id);
  };

  const currentApplicationHistory = applicationHistoryByStudent[currentStudent.id] || {
    status: 'idle',
    error: null
  };
  const appliedJobs = useMemo(
    () => restoreAppliedJobs({
      localJobIds: appliedJobsByStudent[currentStudent.id] || [],
      progress: { recent_events: applicationEventsByStudent[currentStudent.id] || [] },
      jobs: jobsList
    }),
    [appliedJobsByStudent, applicationEventsByStudent, jobsList, currentStudent.id]
  );
  const isLoadingApplicationHistory =
    currentApplicationHistory.status === 'idle' || currentApplicationHistory.status === 'loading';
  const applicationHistoryError =
    currentApplicationHistory.status === 'error' ? currentApplicationHistory.error : null;

  const loadStudentProgress = (studentId = currentStudent.id) => {
    const requestKey = `progress:${studentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);

    setApplicationHistoryByStudent(prev => ({
      ...prev,
      [studentId]: { status: 'loading', error: null }
    }));

    return apiClient.getStudentProgress(studentId)
      .then(data => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return data;
        updateProfileUiFor(studentId, current => {
          const completedMilestones = normalizeCompletedMilestones(
            data.completed_milestones,
            current.completedMilestones
          );

          return {
            serverProgress: data,
            completedMilestones,
            roadmap: applyCompletedMilestonesToRoadmap(
              current.roadmap,
              completedMilestones
            )
          };
        });
        setApplicationEventsByStudent(prev => ({
          ...prev,
          [studentId]: Array.isArray(data.recent_events) ? data.recent_events : []
        }));
        setApplicationHistoryByStudent(prev => ({
          ...prev,
          [studentId]: { status: 'ready', error: null }
        }));
        return data;
      })
      .catch(err => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) throw err;
        const message = err?.message || "Failed to load application history.";
        setApplicationHistoryByStudent(prev => ({
          ...prev,
          [studentId]: { status: 'error', error: message }
        }));
        throw err;
      });
  };

  const loadPreferences = (studentId = currentStudent.id) => {
    const requestKey = `preferences:${studentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    updateProfileUiFor(studentId, { preferencesError: null });

    return apiClient.getPreferences(studentId)
      .then(data => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return data;
        updateProfileUiFor(studentId, { preferences: data });
        return data;
      })
      .catch(err => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) throw err;
        updateProfileUiFor(studentId, {
          preferencesError: err?.message || "Failed to load career preferences."
        });
        throw err;
      });
  };

  const loadFeedback = (studentId = currentStudent.id) => {
    const requestKey = `feedback:${studentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    updateProfileUiFor(studentId, { feedbackError: null });

    return apiClient.getFeedback(studentId)
      .then(res => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return res;
        updateProfileUiFor(studentId, current => {
          const feedbackRecords = Array.isArray(res.feedback) ? res.feedback : [];
          return {
            feedbackRecords,
            selectedJobId: resolveVisibleJobState({
              jobs: current.jobsList,
              selectedJobId: current.selectedJobId,
              feedbackRecords
            }).selectedJobId
          };
        });
        return res;
      })
      .catch(err => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) throw err;
        updateProfileUiFor(studentId, {
          feedbackError: err?.message || "Failed to load recommendation feedback."
        });
        throw err;
      });
  };

  const retryApplicationHistory = () => {
    loadStudentProgress(currentStudent.id).catch(() => {});
  };

  const fetchRankedJobs = (studentId = currentStudent.id) => {
    const requestKey = `jobs:${studentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    updateProfileUiFor(studentId, { isLoadingJobs: true, jobsError: null });

    apiClient.getRankedJobs(studentId)
      .then(res => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
        // Only backend-validated LIVE_DATA listings with a real source URL are
        // accepted. A seeded or AI-generated job normalizes to nothing, so the
        // portal shows the explicit empty state instead of local content.
        const liveJobs = normalizeLiveJobs(res?.ranked_jobs);
        const technicalJobs = filterTechnicalJobs(liveJobs);
        updateProfileUiFor(studentId, current => ({
          jobsList: technicalJobs,
          selectedJobId: resolveVisibleJobState({
            jobs: technicalJobs,
            selectedJobId: current.selectedJobId,
            feedbackRecords: current.feedbackRecords
          }).selectedJobId,
          isLoadingJobs: false
        }));
      })
      .catch((err) => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
        // No local fallback: provider failure is an explicit retryable state.
        updateProfileUiFor(studentId, current => ({
          jobsError: err?.message || LIVE_JOBS_LOAD_ERROR,
          jobsList: [],
          selectedJobId: null,
          roadmap: [],
          isLoadingJobs: false,
          isLoadingRoadmap: false
        }));
      });
  };

  useEffect(() => {
    const studentId = currentStudent.id;
    currentStudentIdRef.current = studentId;

    loadPreferences(studentId).catch(() => {});
    loadFeedback(studentId).catch(() => {});
    fetchRankedJobs(studentId);
    loadStudentProgress(studentId).catch(() => {});
  }, [currentStudent.id]);

  // Restore uploaded candidates from the existing persisted student profile
  // endpoint. Only ids this browser created are requested; nothing is invented.
  useEffect(() => {
    const storage = getCandidateStorage();
    const storedIds = loadUploadedCandidateIds(storage);
    if (storedIds.length === 0) return undefined;

    let cancelled = false;

    Promise.allSettled(storedIds.map(id => apiClient.getStudentProfile(id)))
      .then(results => {
        if (cancelled) return;

        const restored = [];
        results.forEach((result, index) => {
          const studentId = storedIds[index];

          if (result.status !== 'fulfilled') {
            // A deleted candidate (for example after a workspace reset) is no
            // longer restorable; transient failures keep the id for next time.
            if (result.reason?.status === 404) {
              removeUploadedCandidateId(storage, studentId);
            }
            return;
          }

          const profile = normalizeCandidateProfile(result.value);
          if (profile) {
            restored.push(profile);
            ensureProfileUi(profile.id, profile.targetRole);
          }
        });

        if (restored.length > 0) {
          setCandidateProfiles(prev => mergeCandidateProfiles(prev, restored));
        }
      });

    return () => { cancelled = true; };
  }, []);

  const fetchRoadmap = (studentId = currentStudent.id) => {
    const studentUi = getProfileState(profileUiByStudent, studentId) || buildInitialProfileUi();
    // A hidden role is never an active roadmap target, even if its feedback
    // arrived after the profile's selection was last written.
    const jobId = resolveVisibleJobState({
      jobs: studentUi.jobsList,
      selectedJobId: studentUi.selectedJobId,
      feedbackRecords: studentUi.feedbackRecords
    }).selectedJobId;
    const requestKey = `roadmap:${studentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);

    if (!jobId) {
      updateProfileUiFor(studentId, {
        roadmap: [],
        roadmapError: null,
        isLoadingRoadmap: false
      });
      return;
    }

    updateProfileUiFor(studentId, { isLoadingRoadmap: true, roadmapError: null });

    apiClient.getRoadmap(studentId, jobId)
      .then(res => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
        updateProfileUiFor(studentId, current => {
          // Only runtime AI-generated weeks are rendered. A legacy seeded
          // payload normalizes to an empty plan and shows the explicit empty
          // state instead of falling back to catalog content.
          const roadmap = normalizeAiRoadmap(res?.roadmap);

          // Once the saved progress snapshot has loaded, its milestone list is
          // authoritative. This prevents a slower, pre-toggle roadmap response
          // from re-marking a reopened week as completed.
          return {
            roadmap: current.serverProgress
              ? applyCompletedMilestonesToRoadmap(roadmap, current.completedMilestones)
              : roadmap
          };
        });
      })
      .catch((err) => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
        updateProfileUiFor(studentId, {
          roadmapError: err?.message || "AI learning roadmap generation is unavailable right now. Please retry.",
          roadmap: []
        });
      })
      .finally(() => {
        if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
        updateProfileUiFor(studentId, { isLoadingRoadmap: false });
      });
  };

  // Hidden feedback, not the raw ranking feed, decides the visible list. This
  // keeps refreshes and asynchronous feedback loads consistent with a hide.
  const jobVisibility = useMemo(
    () => resolveVisibleJobState({ jobs: jobsList, selectedJobId, feedbackRecords }),
    [jobsList, selectedJobId, feedbackRecords]
  );
  const visibleJobs = jobVisibility.visibleJobs;
  const effectiveSelectedJobId = jobVisibility.selectedJobId;

  useEffect(() => {
    fetchRoadmap(currentStudent.id);
  }, [currentStudent.id, effectiveSelectedJobId, preferences]);

  const selectedJob =
    visibleJobs.find(j => j.id === effectiveSelectedJobId) || visibleJobs[0] || null;
  const matchResult = evaluateJobMatch(currentStudent, selectedJob, preferences, feedbackRecords);
  const layoffRisk = assessLayoffRisk(currentStudent.skills);

  const reqSkillsCount = selectedJob
    ? (selectedJob.requiredSkills || selectedJob.required_skills || []).length
    : 0;
  const skillCoveragePct = Math.round((matchResult.matchedSkills.length / Math.max(1, reqSkillsCount)) * 100);

  // Single source of truth for displayed readiness. Milestone completion is
  // derived from the same roadmap and milestone list rendered by the page, so
  // completing or reopening a week updates every readiness display together.
  const readinessPayload = buildProfileReadiness({
    roadmap: dynamicRoadmap,
    completedMilestones,
    skill_coverage: skillCoveragePct,
    interview_performance: interviewScore,
    profile_quality: currentStudent.qualityScore || currentStudent.quality_score || 75
  });

  // Single readiness value shared by every readiness display on the page.
  const overallReadiness = readinessPayload.overall;
  // The plan progress badge reads the same milestone component as readiness.
  const milestoneCompletionPct = readinessPayload.milestone_completion;

  // The recommendation is derived from the exact roadmap and milestone state
  // rendered by the preparation plan below.
  const recommendationView = resolveRoadmapRecommendation({
    roadmap: dynamicRoadmap,
    completedMilestones,
    targetRoleTitle: selectedJob?.title || "No active technical role",
    readiness: readinessPayload,
    isLoading: isLoadingRoadmap,
    error: roadmapError
  });

  const uploadResumeFile = async (file) => {
    if (!file) return;

    const uploadStudentId = currentStudent.id;
    lastResumeFilesRef.current[uploadStudentId] = file;
    updateProfileUiFor(uploadStudentId, { isUploading: true, resumeFeedback: null });

    const formData = new FormData();
    formData.append("file", file);
    if (selectedJobId) formData.append("target_job_id", selectedJobId);

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
        targetRole: selectedJobId || "",
        skills: data.extracted_skills || [],
        rawResume: data.clean_resume || "",
        qualityScore: data.quality_audit?.quality_score || 80,
        weakBullets: data.quality_audit?.weak_bullets || [],
        data_mode: "LIVE_DATA",
        source: 'uploaded'
      };

      updateProfileUiFor(data.student_id, {
        resumeFeedback: createSuccessFeedback(
          "Resume uploaded",
          buildResumeUploadMessage(file.name, data.cgpa)
        )
      });

      // Register the candidate so it stays selectable from the profile list,
      // then activate it only if the student did not switch mid-upload.
      registerUploadedCandidate(newStudentObj);

      const collidesWithDemoProfile = Boolean(
        findCandidateProfile(DEMO_PROFILES, newStudentObj.id)
      );
      if (
        !collidesWithDemoProfile &&
        isResponseForStudent(uploadStudentId, currentStudentIdRef.current)
      ) {
        setCurrentStudent(newStudentObj);
      }
    } catch (err) {
      updateProfileUiFor(uploadStudentId, {
        resumeFeedback: createErrorFeedback(
          "Resume upload failed",
          err,
          { fallback: "The resume could not be processed. Please try again." }
        )
      });
    } finally {
      updateProfileUiFor(uploadStudentId, { isUploading: false });
    }
  };

  const handlePdfDrop = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadResumeFile(file);
    // Allow re-selecting the same file for a retry.
    e.target.value = "";
  };

  const toggleMilestone = async (
    weekNum,
    targetStudentId = currentStudent.id,
    targetReadiness = overallReadiness
  ) => {
    const requestKey = `milestone:${targetStudentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    updateProfileUiFor(targetStudentId, { milestoneFeedback: null });

    try {
      const res = await apiClient.toggleMilestone(targetStudentId, weekNum, targetReadiness);
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;

      // Apply the response to the profile that made the request. The functional
      // patch reads that profile's latest state, so switching profiles can
      // never write the toggle into another profile.
      updateProfileUiFor(targetStudentId, current => {
        const completedMilestones = applyMilestoneToggleResult(
          res,
          weekNum,
          current.completedMilestones
        ).completedMilestones;

        return {
          completedMilestones,
          roadmap: applyCompletedMilestonesToRoadmap(
            current.roadmap,
            completedMilestones
          )
        };
      });

      const requestedProfileState = getProfileState(profileUiByStudent, targetStudentId);
      const { isCompleted } = applyMilestoneToggleResult(
        res,
        weekNum,
        requestedProfileState?.completedMilestones
      );

      // Refresh the saved-progress snapshot and invalidate any older progress
      // response for this student before applying the new one. The toggle's
      // milestone list stays in place if this refresh fails.
      const progressRequestKey = `progress:${targetStudentId}`;
      const progressRequestId = beginRequest(requestIdsRef.current, progressRequestKey);
      let refreshedProgress = null;
      try {
        refreshedProgress = await apiClient.getStudentProgress(targetStudentId);
      } catch {
        // The saved milestone state remains authoritative if this refresh fails.
      }

      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;

      if (
        refreshedProgress
        && isLatestRequest(requestIdsRef.current, progressRequestKey, progressRequestId)
      ) {
        updateProfileUiFor(targetStudentId, current => {
          const completedMilestones = normalizeCompletedMilestones(
            refreshedProgress.completed_milestones,
            current.completedMilestones
          );

          return {
            serverProgress: refreshedProgress,
            completedMilestones,
            roadmap: applyCompletedMilestonesToRoadmap(
              current.roadmap,
              completedMilestones
            )
          };
        });
      }

      // Readiness is never read from the toggle response. The updated milestone
      // list flows back through the shared readiness utility when the page
      // re-renders, keeping header, dial, dossier, recommendation and saved
      // progress on the same value.
      updateProfileUiFor(targetStudentId, {
        milestoneFeedback: createSuccessFeedback(
          "Milestone saved",
          buildMilestoneMessage(weekNum, isCompleted)
        )
      });
    } catch (err) {
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
      updateProfileUiFor(targetStudentId, {
        milestoneFeedback: {
          ...createErrorFeedback("Could not save milestone", err, {
            fallback: "Your milestone change was not saved. Please try again."
          }),
          retry: () => toggleMilestone(weekNum, targetStudentId, targetReadiness)
        }
      });
    }
  };

  const handleIngestUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setIsScrapingUrl(true);
    setUrlFeedback(null);

    try {
      const data = await apiClient.ingestExternalUrl(url);
      const skills = data.ai_parsed?.required_skills || [];
      setUrlFeedback(createSuccessFeedback("Job analyzed", buildUrlAnalysisMessage(skills)));
      setUrlInput("");
    } catch (err) {
      setUrlFeedback(createErrorFeedback("URL analysis failed", err, {
        fallback: "That job link could not be analyzed. Check the URL and try again."
      }));
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handleApplyToJob = async () => {
    if (!selectedJob || appliedJobs.includes(selectedJob.id)) return;

    const studentId = currentStudent.id;
    // A single in-flight submission per student prevents double-click
    // enrollments from sending two requests before applied state updates.
    if (submittingStudentsRef.current.has(studentId)) return;

    const jobId = selectedJob.id;
    const jobTitle = selectedJob.title;
    const company = selectedJob.company;
    const tier = selectedJob.tier || null;

    submittingStudentsRef.current.add(studentId);
    setSubmittingApplicationStudents(prev =>
      prev.includes(studentId) ? prev : [...prev, studentId]
    );
    updateProfileUiFor(studentId, { applicationFeedback: null });

    try {
      const res = await apiClient.submitCampusApplication({
        student_id: studentId,
        job_id: jobId,
        job_title: jobTitle,
        company,
        tier
      });

      setAppliedJobsByStudent(prev => addAppliedJob(prev, studentId, jobId));
      if (isResponseForStudent(studentId, currentStudentIdRef.current)) {
        setCurrentStudent(prev => (
          prev.id === studentId ? { ...prev, activeAppsCount: res.active_applications } : prev
        ));
      }
      updateProfileUiFor(studentId, {
        applicationFeedback: createSuccessFeedback(
          "Application submitted",
          buildApplicationMessage(res.message, jobTitle)
        )
      });
    } catch (err) {
      if (isDuplicateApplicationError(err)) {
        // The backend enforces one application per student/job. Treat its
        // duplicate response as the already-applied state instead of an error.
        setAppliedJobsByStudent(prev => addAppliedJob(prev, studentId, jobId));
        updateProfileUiFor(studentId, {
          applicationFeedback: createInfoFeedback(
            "Already enrolled",
            `You have already applied to ${jobTitle}. Duplicate applications are not created.`
          )
        });
        return;
      }

      updateProfileUiFor(studentId, {
        applicationFeedback: createErrorFeedback("Application rejected", err, {
          fallback: "The application could not be submitted."
        })
      });
    } finally {
      submittingStudentsRef.current.delete(studentId);
      setSubmittingApplicationStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSavePreferences = async (newPrefs) => {
    const studentId = currentStudent.id;
    updateProfileUiFor(studentId, { preferencesFeedback: null });

    // Failures propagate so PreferenceModal can keep itself open and show the
    // real error inline instead of closing silently.
    const res = await apiClient.updatePreferences(studentId, newPrefs);
    updateProfileUiFor(studentId, {
      preferences: res.preferences,
      preferencesFeedback: createSuccessFeedback("Preferences saved", buildPreferencesMessage())
    });
    fetchRankedJobs(studentId);
  };

  const handleToggleSaveJob = async (
    jobId,
    targetStudentId = currentStudent.id,
    jobTitle = selectedJob?.title || "this role",
    isSaved = matchResult.isSaved
  ) => {
    if (!selectedJob) return;

    const action = isSaved ? 'REJECTED' : 'SAVED';
    const requestKey = `feedback-action:${targetStudentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    updateProfileUiFor(targetStudentId, { jobFeedback: null });

    try {
      await apiClient.submitFeedback(targetStudentId, 'JOB', jobId, action);
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
      const res = await apiClient.getFeedback(targetStudentId);
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
      updateProfileUiFor(targetStudentId, {
        feedbackRecords: res.feedback || [],
        jobFeedback: createSuccessFeedback(
          isSaved ? "Bookmark removed" : "Role bookmarked",
          buildBookmarkMessage(isSaved, jobTitle)
        )
      });
    } catch (err) {
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
      updateProfileUiFor(targetStudentId, {
        jobFeedback: {
          ...createErrorFeedback(
            isSaved ? "Could not remove bookmark" : "Could not bookmark role",
            err,
            { fallback: "Your bookmark change was not saved. Please try again." }
          ),
          retry: () => handleToggleSaveJob(jobId, targetStudentId, jobTitle, isSaved)
        }
      });
    }
  };

  const handleHideJob = async (
    jobId,
    targetStudentId = currentStudent.id,
    jobTitle = selectedJob?.title || "this role"
  ) => {
    if (!jobId) return;

    const requestKey = `feedback-action:${targetStudentId}`;
    const requestId = beginRequest(requestIdsRef.current, requestKey);
    const profileState =
      getProfileState(profileUiByStudent, targetStudentId) || buildInitialProfileUi();
    const { snapshot } = applyOptimisticHide(profileState, jobId);

    // Hide immediately so the list, selection, match card, roadmap, radar and
    // interview panel all move to the next visible role in one render.
    updateProfileUiFor(targetStudentId, current => ({
      ...applyOptimisticHide(current, jobId).patch,
      jobFeedback: null
    }));

    try {
      // The feedback request is unchanged: the backend still records HIDDEN.
      await apiClient.submitFeedback(targetStudentId, 'JOB', jobId, 'HIDDEN');
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;

      let feedbackRecords = null;
      try {
        const res = await apiClient.getFeedback(targetStudentId);
        if (Array.isArray(res?.feedback)) feedbackRecords = res.feedback;
      } catch {
        // The hide was accepted; keep the optimistic record and let the next
        // profile/feedback load restore the canonical list.
      }
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;

      updateProfileUiFor(targetStudentId, current => ({
        ...applyHideSuccess(current, feedbackRecords),
        jobFeedback: createSuccessFeedback("Role hidden", buildHiddenJobMessage(jobTitle))
      }));
    } catch (err) {
      if (!isLatestRequest(requestIdsRef.current, requestKey, requestId)) return;
      // Roll back to the exact prior records so a failed hide never removes a
      // bookmark and never leaves the role missing from the visible list.
      updateProfileUiFor(targetStudentId, current => ({
        ...rollbackHide(current, snapshot),
        jobFeedback: {
          ...createErrorFeedback("Could not hide role", err, {
            fallback: "The role could not be hidden. Please try again."
          }),
          retry: () => handleHideJob(jobId, targetStudentId, jobTitle)
        }
      }));
    }
  };

  const handleSelectJob = (jobId) => {
    const studentId = currentStudent.id;
    updateProfileUiFor(studentId, {
      selectedJobId: jobId,
      applicationFeedback: null,
      jobFeedback: null
    });
  };

  const hasApplied = selectedJob ? appliedJobs.includes(selectedJob.id) : false;
  // Live listings carry no university-assigned tier, so the portal does not
  // invent one for a CGPA block. The application cap still applies.
  const isCgpaBlocked = false;
  const isCapBlocked = currentStudent.activeAppsCount >= 3;
  const isSubmittingForCurrentStudent = submittingApplicationStudents.includes(currentStudent.id);
  const applicationAction = resolveApplicationActionState({
    hasJob: Boolean(selectedJob),
    hasApplied,
    isSubmitting: isSubmittingForCurrentStudent,
    isLoadingHistory: isLoadingApplicationHistory,
    historyError: applicationHistoryError,
    isCapBlocked,
    isCgpaBlocked
  });

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
            Targeting: <strong className="text-obsidian">{selectedJob?.title || "No active technical role"}</strong> • Placement Readiness: <strong className="text-terracotta-600 font-mono">{overallReadiness}%</strong>
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
                const found = findCandidateProfile(candidateProfiles, e.target.value);
                if (found) setCurrentStudent(found);
              }}
              className="text-xs font-bold bg-surface px-3 py-1.5 rounded-xl border border-[#E0E0DC] text-obsidian focus:outline-none cursor-pointer"
            >
              {candidateProfiles.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} ({prof.branch.split(" ")[0]})
                  {prof.source === 'uploaded' ? ' • Uploaded' : ''}
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

      {preferencesFeedback && (
        <InlineFeedback
          variant={preferencesFeedback.variant}
          title={preferencesFeedback.title}
          message={preferencesFeedback.message}
          onDismiss={() => updateProfileUiFor(currentStudent.id, { preferencesFeedback: null })}
        />
      )}

      {/* Next Best Action Card */}
      {recommendationView.status === 'error' ? (
        <RetryableErrorCard
          title="Could Not Load Next Best Step"
          message={recommendationView.message}
          onRetry={() => fetchRoadmap()}
          isRetrying={isLoadingRoadmap}
        />
      ) : (
        <div className="bg-gradient-to-r from-terracotta-50 to-amber-50/50 p-5 rounded-3xl border border-terracotta-200/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Compass className={`w-5 h-5 ${recommendationView.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div aria-live="polite">
              <span className="text-[10px] uppercase font-bold text-terracotta-700 tracking-wider block">
                Next Best Step • Agentic Recommendation
              </span>
              {recommendationView.status === 'loading' && (
                <>
                  <h3 className="font-extrabold text-obsidian text-sm mt-0.5">Loading your next best step...</h3>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Matching the recommendation to your visible roadmap and saved milestones.
                  </p>
                </>
              )}
              {recommendationView.status === 'empty' && (
                <>
                  <h3 className="font-extrabold text-obsidian text-sm mt-0.5">No roadmap available</h3>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    A recommendation will appear once your preparation roadmap is available.
                  </p>
                </>
              )}
              {recommendationView.recommendation && (
                <>
                  <h3 className="font-extrabold text-obsidian text-sm mt-0.5">
                    {recommendationView.recommendation.headline}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    {recommendationView.recommendation.description}
                  </p>
                </>
              )}
            </div>
          </div>
          {recommendationView.status === 'ready' && (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-full border border-emerald-200">
                Projected: ~{recommendationView.recommendation.projected_readiness}%
              </span>
            </div>
          )}
          {recommendationView.status === 'complete' && (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-full border border-emerald-200">
                Readiness: {recommendationView.recommendation.projected_readiness}%
              </span>
            </div>
          )}
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

            {resumeFeedback && (
              <InlineFeedback
                variant={resumeFeedback.variant}
                title={resumeFeedback.title}
                message={resumeFeedback.message}
                onRetry={resumeFeedback.variant === 'error' && lastResumeFilesRef.current[currentStudent.id]
                  ? () => uploadResumeFile(lastResumeFilesRef.current[currentStudent.id])
                  : undefined}
                isRetrying={isUploading}
              />
            )}

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
          <ProgressTimelineWidget
            progressData={serverProgress}
            currentReadiness={overallReadiness}
          />

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

            {urlFeedback && (
              <InlineFeedback
                variant={urlFeedback.variant}
                title={urlFeedback.title}
                message={urlFeedback.message}
                onRetry={urlFeedback.variant === 'error' && urlInput.trim() ? handleIngestUrl : undefined}
                isRetrying={isScrapingUrl}
              />
            )}
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
            {jobFeedback && (
              <InlineFeedback
                variant={jobFeedback.variant}
                title={jobFeedback.title}
                message={jobFeedback.message}
                onRetry={jobFeedback.retry}
              />
            )}
            {jobsError ? (
              <RetryableErrorCard
                title="Could Not Load Live Listings"
                message={jobsError}
                onRetry={() => fetchRankedJobs()}
                isRetrying={isLoadingJobs}
              />
            ) : isLoadingJobs ? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 rounded-2.5xl bg-canvas border border-[#E2E2DE] text-center text-xs text-subtle"
              >
                Fetching live job listings...
              </div>
            ) : visibleJobs.length === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="p-6 rounded-2.5xl bg-canvas border border-[#E2E2DE] text-center space-y-3"
              >
                <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-obsidian text-sm">
                    {jobsList.length > 0 ? "All live roles are hidden" : "No Live Listings Available"}
                  </h3>
                  <p className="text-xs text-subtle mt-1 leading-relaxed max-w-md mx-auto">
                    {jobsList.length > 0
                      ? "You have hidden every live technical role in the current feed. Hidden roles stay saved to your profile and remain out of your recommendations."
                      : LIVE_JOBS_EMPTY_MESSAGE}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchRankedJobs}
                  className="px-4 py-2 rounded-full bg-obsidian text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-xs"
                >
                  Refresh Live Listings
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs text-subtle font-semibold">Active Placement Target:</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        🟢 Live listing • {getLiveJobSourceName(selectedJob)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1.5 min-w-0">
                      <select
                        value={effectiveSelectedJobId}
                        onChange={(e) => handleSelectJob(e.target.value)}
                        className="text-sm font-bold bg-canvas px-3.5 py-1.5 rounded-full border border-[#E0E0DC] text-obsidian focus:outline-none cursor-pointer w-full min-w-0 sm:w-auto sm:max-w-md"
                      >
                        {visibleJobs.map((job, idx) => (
                          <option key={`${job.id}-${idx}`} value={job.id}>
                            {job.title} — {job.company} ({job.composite_score ? `${job.composite_score}% Match` : job.location})
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

                <div className="p-4 rounded-2.5xl bg-canvas border border-[#E2E2DE] space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Live listing
                    </span>
                    <span className="text-[10px] text-subtle font-mono">
                      {selectedJob.location}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-700 leading-relaxed line-clamp-4">
                    {selectedJob.description}
                  </p>
                  {isSafeLiveJobUrl(selectedJob.source_url) && (
                    <a
                      href={selectedJob.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-obsidian hover:text-terracotta-500"
                    >
                      <span>View original listing on {getLiveJobSourceName(selectedJob)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

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

                {applicationFeedback && (
                  <InlineFeedback
                    variant={applicationFeedback.variant}
                    title={applicationFeedback.title}
                    message={applicationFeedback.message}
                  />
                )}

                {applicationHistoryError && (
                  <InlineFeedback
                    variant="error"
                    title="Application History Unavailable"
                    message={applicationHistoryError}
                    onRetry={retryApplicationHistory}
                    isRetrying={isLoadingApplicationHistory}
                  />
                )}

                <div className="pt-2 border-t border-[#ECECE9] flex items-center justify-between">
                  <span className="text-xs text-subtle">
                    Active Drives: <strong>{currentStudent.activeAppsCount} / 3</strong> enrolled
                  </span>
                  <button
                    onClick={handleApplyToJob}
                    disabled={applicationAction.disabled}
                    aria-busy={applicationAction.tone === 'loading' || applicationAction.tone === 'submitting'}
                    className={`px-5 py-2 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                      applicationAction.tone === 'applied'
                        ? 'bg-emerald-600 text-white cursor-default'
                        : applicationAction.tone === 'loading' || applicationAction.tone === 'submitting'
                        ? 'bg-zinc-200 text-zinc-500 cursor-wait'
                        : applicationAction.tone === 'error' || applicationAction.tone === 'blocked' || applicationAction.tone === 'disabled'
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                    }`}
                  >
                    {applicationAction.tone === 'applied' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{applicationAction.label}</span>
                      </>
                    ) : applicationAction.tone === 'loading' || applicationAction.tone === 'submitting' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{applicationAction.label}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{applicationAction.label}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {selectedJob && (
            <>
              <SkillRadarChart
                studentSkills={currentStudent.skills}
                qualityScore={currentStudent.qualityScore || currentStudent.quality_score || 75}
                targetRole={selectedJob.title}
              />

              {/* Runtime AI learning plan with retryable unavailable/empty states */}
              <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="w-4 h-4 text-terracotta-500" />
                      <h3 className="font-bold text-obsidian text-base">4-Week AI Learning Plan</h3>
                      {hasAiProvenance(dynamicRoadmap) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Sparkles className="w-3 h-3" />
                          AI-generated plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-subtle">
                      Adapted for <strong className="text-obsidian">{selectedJob.title}</strong> • Style: <strong className="text-obsidian">{preferences?.learning_style?.replace('_', ' ') || 'PROJECT BASED'}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-obsidian bg-canvas px-3 py-1 rounded-full border border-[#E0E0DC]">
                    {milestoneCompletionPct}% Completed
                  </span>
                </div>

                {milestoneFeedback && (
                  <InlineFeedback
                    variant={milestoneFeedback.variant}
                    title={milestoneFeedback.title}
                    message={milestoneFeedback.message}
                    onRetry={milestoneFeedback.retry}
                  />
                )}

                {roadmapError ? (
                  <RetryableErrorCard
                    title="AI Learning Plan Unavailable"
                    message={roadmapError}
                    onRetry={() => fetchRoadmap()}
                    isRetrying={isLoadingRoadmap}
                  />
                ) : isLoadingRoadmap ? (
                  <div className="p-8 text-center text-xs text-subtle" aria-live="polite">
                    Generating your AI learning plan...
                  </div>
                ) : dynamicRoadmap.length === 0 ? (
                  <RetryableErrorCard
                    title="No AI Learning Plan Returned"
                    message="The AI did not return any learning weeks for this role. Retry to generate a fresh plan."
                    onRetry={() => fetchRoadmap()}
                    isRetrying={isLoadingRoadmap}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dynamicRoadmap.map((item) => {
                      const material = resolveMaterialLink(item);
                      const hours = item.estimated_hours ?? item.allocated_hours;
                      const isDone =
                        item.is_completed || completedMilestones.includes(item.week);

                      return (
                        <div
                          key={item.week}
                          onClick={() => toggleMilestone(item.week)}
                          className={`p-4 rounded-2.5xl border transition-all cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                            isDone
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-canvas border-[#E2E2DE] hover:border-terracotta-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-terracotta-600 uppercase tracking-wider">
                                Week {item.week} • {item.skill}
                              </span>
                              <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-600' : 'text-zinc-300'}`} />
                            </div>
                            <h4 className="font-bold text-obsidian text-xs leading-snug">{item.title}</h4>
                            {item.learning_objective && (
                              <p className="text-[11px] text-zinc-600 leading-relaxed">
                                {item.learning_objective}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 pt-1 border-t border-[#E8E8E4]">
                            <div className="flex items-center justify-between text-[10px] text-zinc-600">
                              <span className="bg-surface px-2 py-0.5 rounded-full border border-[#E0E0DC] font-medium">
                                {item.activity_label}
                              </span>
                              {hours ? (
                                <span className="flex items-center space-x-1 font-mono text-terracotta-700">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {hours}h{item.weekly_budget ? ` / ${item.weekly_budget}h budget` : ''}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                            {item.study_note && (
                              <p className="text-[10px] text-zinc-500 leading-relaxed">
                                {item.study_note}
                              </p>
                            )}
                            {material && (
                              <>
                                {material.kind === 'search' && item.search_query && (
                                  <p className="text-[10px] font-mono text-zinc-500 break-words">
                                    Query: {item.search_query}
                                  </p>
                                )}
                                <a
                                  href={material.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center space-x-1 text-xs font-bold text-obsidian hover:text-terracotta-500"
                                >
                                  {material.kind === 'search' ? (
                                    <Search className="w-3.5 h-3.5" />
                                  ) : (
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  )}
                                  <span>{material.label}</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <MockInterview
                studentId={currentStudent.id}
                targetRoleTitle={selectedJob.title}
                missingSkills={
                  matchResult.missingSkills.length > 0
                    ? matchResult.missingSkills
                    : (selectedJob.required_skills || selectedJob.requiredSkills || [])
                }
                onScoreUpdate={(score) => updateProfileUiFor(currentStudent.id, { interviewScore: score })}
              />
            </>
          )}
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