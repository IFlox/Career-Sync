import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, ChevronRight, RefreshCw, Briefcase, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import RetryableErrorCard from './RetryableErrorCard';
import InlineFeedback from './InlineFeedback';
import {
  QUESTION_LOAD_ERROR,
  beginNextQuestion,
  failNextQuestion,
  finishNextQuestion,
  loadNextAdaptiveQuestion,
  normalizeQuestion
} from '../utils/adaptiveInterview';
import {
  createInterviewSession,
  getInterviewSession,
  hasRealInterviewQuestion,
  saveInterviewSession
} from '../utils/interviewSession';
import { isResponseForStudent } from '../utils/profileState';

export default function MockInterview({
  studentId = "stud-01",
  targetRoleTitle = "AI Systems & RAG Engineer",
  missingSkills = ["RAG Pipelines", "System Design"],
  onScoreUpdate
}) {
  const initialSkill = missingSkills[0] || "RAG Pipelines";
  const [session, setSession] = useState(() => createInterviewSession(initialSkill));
  const {
    currentSkill,
    difficulty,
    currentQuestion,
    questionCount,
    answer,
    isRecording,
    isEvaluating,
    isLoadingQuestion,
    questionError,
    questionErrorSource,
    questionNotice,
    evaluationError,
    feedback,
    sessionScores,
    speechNotice
  } = session;
  const [audioWaves, setAudioWaves] = useState([20, 25, 20, 30, 20, 25, 20, 30, 20, 25]);
  const questionRequestIdRef = useRef(0);
  const evaluationRequestIdRef = useRef(0);
  const sessionCacheRef = useRef({});
  const activeStudentIdRef = useRef(studentId);
  const loadedSkillRef = useRef(null);
  const recognitionRef = useRef(null);

  const updateSession = (patch) => {
    setSession(prev => ({ ...prev, ...patch }));
  };

  useLayoutEffect(() => {
    const previousStudentId = activeStudentIdRef.current;
    if (previousStudentId === studentId) return;

    sessionCacheRef.current = saveInterviewSession(
      sessionCacheRef.current,
      previousStudentId,
      session
    );

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    // Any response from the previous profile is now stale.
    questionRequestIdRef.current += 1;
    evaluationRequestIdRef.current += 1;

    const nextSession = getInterviewSession(sessionCacheRef.current, studentId, initialSkill);
    activeStudentIdRef.current = studentId;
    loadedSkillRef.current = nextSession.currentSkill;
    setSession(nextSession);

    if (!hasRealInterviewQuestion(nextSession.currentQuestion)) {
      loadQuestion({
        skill: nextSession.currentSkill,
        requestedDifficulty: nextSession.difficulty,
        targetStudentId: studentId
      });
    }
  }, [studentId]);

  useEffect(() => {
    if (missingSkills && missingSkills.length > 0) {
      if (!missingSkills.includes(currentSkill)) {
        updateSession({
          currentSkill: missingSkills[0],
          feedback: null,
          evaluationError: null
        });
      }
    }
  }, [missingSkills]);

  const loadQuestion = async ({
    skill = currentSkill,
    requestedDifficulty = difficulty,
    targetStudentId = studentId
  } = {}) => {
    const requestId = ++questionRequestIdRef.current;
    const isCurrentRequest = () =>
      requestId === questionRequestIdRef.current &&
      isResponseForStudent(targetStudentId, activeStudentIdRef.current);

    updateSession({
      isLoadingQuestion: true,
      questionError: null,
      questionErrorSource: 'initial',
      questionNotice: null
    });

    try {
      const question = normalizeQuestion(
        await apiClient.getInterviewQuestion(skill, requestedDifficulty)
      );
      if (!isCurrentRequest()) return;
      if (question) updateSession({ currentQuestion: question });
    } catch (err) {
      if (!isCurrentRequest()) return;
      updateSession({
        questionError: err?.message || "Failed to load question for this topic.",
        questionErrorSource: 'initial'
      });
    } finally {
      if (isCurrentRequest()) updateSession({ isLoadingQuestion: false });
    }
  };

  useEffect(() => {
    if (loadedSkillRef.current === currentSkill) return;
    loadedSkillRef.current = currentSkill;
    loadQuestion();
  }, [currentSkill]);

  useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setAudioWaves(prev => prev.map(() => Math.floor(Math.random() * 65) + 15));
      }, 100);
    } else {
      setAudioWaves([20, 25, 20, 30, 20, 25, 20, 30, 20, 25]);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateSession({
        speechNotice: "Browser speech recognition is not supported in this browser. Please type your answer."
      });
      return;
    }

    updateSession({ speechNotice: null });

    if (!isRecording) {
      const recognitionStudentId = studentId;
      const isActive = () =>
        isResponseForStudent(recognitionStudentId, activeStudentIdRef.current);

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          if (isActive()) updateSession({ isRecording: true });
        };
        recognition.onresult = (event) => {
          if (!isActive()) return;
          const transcript = event.results[0][0].transcript;
          setSession(prev => ({
            ...prev,
            answer: prev.answer ? `${prev.answer} ${transcript}` : transcript,
            isRecording: false
          }));
        };
        recognition.onerror = () => {
          if (isActive()) updateSession({ isRecording: false });
        };
        recognition.onend = () => {
          recognitionRef.current = null;
          if (isActive()) updateSession({ isRecording: false });
        };

        recognition.start();
      } catch {
        updateSession({ isRecording: false });
      }
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      updateSession({ isRecording: false });
    }
  };

  const handleSpeakQuestion = () => {
    if ('speechSynthesis' in window && currentQuestion?.question) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(currentQuestion.question);
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || isEvaluating) return;

    const requestStudentId = studentId;
    const requestId = ++evaluationRequestIdRef.current;
    const submittedSkill = currentSkill;
    const submittedDifficulty = difficulty;
    const submittedQuestion = currentQuestion.question;
    const submittedAnswer = answer;

    updateSession({ isEvaluating: true, evaluationError: null });

    const isCurrentRequest = () =>
      requestId === evaluationRequestIdRef.current &&
      isResponseForStudent(requestStudentId, activeStudentIdRef.current);

    try {
      const res = await apiClient.submitInterviewAnswer(
        requestStudentId,
        submittedSkill,
        submittedAnswer,
        submittedDifficulty,
        submittedQuestion
      );

      if (!isCurrentRequest()) return;

      const nextDiff = Math.max(1, Math.min(10, res.next_difficulty || submittedDifficulty));
      const newScores = [...sessionScores, res.score];

      updateSession({
        feedback: res,
        difficulty: nextDiff,
        sessionScores: newScores,
        isEvaluating: false
      });

      const avg = Math.round((newScores.reduce((a, b) => a + b, 0) / newScores.length) * 10);
      onScoreUpdate?.(avg);
    } catch (err) {
      if (!isCurrentRequest()) return;
      // Sprint 3: Display honest, actionable error state without faking scores
      updateSession({
        evaluationError: err?.message || "We could not evaluate this response. No score was recorded.",
        isEvaluating: false
      });
    }
  };

  const handleNext = async () => {
    if (isLoadingQuestion || isEvaluating) return;

    const requestStudentId = studentId;
    const requestId = ++questionRequestIdRef.current;
    const nextSkill = currentSkill;
    const nextDifficulty = difficulty;
    const nextQuestion = currentQuestion;
    const nextQuestionCount = questionCount;
    const isCurrentRequest = () =>
      requestId === questionRequestIdRef.current &&
      isResponseForStudent(requestStudentId, activeStudentIdRef.current);

    const started = beginNextQuestion({ questionCount, answer, feedback, evaluationError });
    updateSession({
      ...started,
      questionErrorSource: 'next',
      questionNotice: null
    });

    try {
      const result = await loadNextAdaptiveQuestion({
        skill: nextSkill,
        difficulty: nextDifficulty,
        currentQuestion: nextQuestion,
        fetchQuestion: (skill, requestedDifficulty) =>
          apiClient.getInterviewQuestion(skill, requestedDifficulty)
      });

      if (!isCurrentRequest()) return;

      const finished = finishNextQuestion({ questionCount: nextQuestionCount }, result.question);
      updateSession({
        ...finished,
        questionNotice: result.sameQuestion
          ? "No alternative question is available for this topic yet, so the same prompt was kept."
          : null
      });
    } catch (err) {
      if (!isCurrentRequest()) return;

      const message = err?.message || QUESTION_LOAD_ERROR;
      const failed = failNextQuestion({ questionCount: nextQuestionCount }, message);
      updateSession({
        ...failed,
        questionErrorSource: 'next'
      });
    }
  };

  const hasRealQuestion = hasRealInterviewQuestion(currentQuestion);

  return (
    <div className="bg-surface rounded-3xl p-6 sm:p-7 border border-[#E6E6E3] shadow-xs space-y-6">
      {/* Session Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#ECECE9]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-extrabold text-obsidian text-base sm:text-lg">AI Practice Interview</h3>
          </div>
          <p className="text-xs text-subtle mt-0.5 flex items-center space-x-1">
            <Briefcase className="w-3.5 h-3.5 text-terracotta-500" />
            <span>Targeting: <strong className="text-obsidian">{targetRoleTitle}</strong></span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-canvas px-3 py-1.5 rounded-full border border-[#E0E0DC]">
            <span className="text-[11px] font-semibold text-subtle">Topic:</span>
            <select
              value={currentSkill}
              onChange={(e) => {
                updateSession({
                  currentSkill: e.target.value,
                  answer: "",
                  feedback: null,
                  evaluationError: null,
                  questionNotice: null
                });
              }}
              className="bg-transparent text-xs font-bold text-obsidian focus:outline-none cursor-pointer"
            >
              {missingSkills.map((sk, i) => (
                <option key={i} value={sk}>{sk}</option>
              ))}
            </select>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-obsidian text-white font-mono font-bold">
            Diff: {difficulty}/10
          </span>
        </div>
      </div>

      {/* Dynamic Question Card */}
      {(hasRealQuestion || isLoadingQuestion) && (
        <div className="bg-canvas p-5 rounded-2.5xl border border-[#E2E2DE] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2.5 py-0.5 rounded-full border border-terracotta-100">
              Question #{questionCount} • {currentQuestion.level || "Adaptive"}
            </span>
            <button
              onClick={handleSpeakQuestion}
              disabled={isLoadingQuestion}
              className="flex items-center space-x-1.5 text-xs text-subtle hover:text-obsidian transition-colors font-medium disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4 text-terracotta-500" />
              <span>Read Aloud</span>
            </button>
          </div>
          <p className="text-sm sm:text-base font-bold text-obsidian leading-relaxed">
            {hasRealQuestion ? `"${currentQuestion.question}"` : "Loading adaptive question..."}
          </p>
          {isLoadingQuestion && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center space-x-2 text-[11px] font-semibold text-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-terracotta-500" />
              <span>{hasRealQuestion ? "Loading next adaptive question..." : "Loading adaptive question..."}</span>
            </div>
          )}
        </div>
      )}

      {questionNotice && (
        <InlineFeedback
          variant="info"
          title="Question unchanged"
          message={questionNotice}
          onDismiss={() => updateSession({ questionNotice: null })}
        />
      )}

      {questionError && (
        <RetryableErrorCard
          title="Could Not Load Adaptive Question"
          message={questionError}
          onRetry={questionErrorSource === 'next' ? handleNext : loadQuestion}
          isRetrying={isLoadingQuestion}
        />
      )}

      {/* Speech Input & Waveform Area */}
      <div className="space-y-4">
        <div className="h-12 bg-canvas rounded-2xl border border-[#E0E0DC] flex items-center justify-center space-x-1.5 px-4">
          {audioWaves.map((h, i) => (
            <span
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isRecording ? 'bg-terracotta-500' : 'bg-zinc-300'
              }`}
              style={{ height: `${h}%` }}
            ></span>
          ))}
          <span className="text-[11px] font-semibold text-subtle pl-3 font-mono">
            {isRecording ? "Listening to mic stream..." : "Microphone ready. Speak or type your answer below."}
          </span>
        </div>

        {speechNotice && (
          <InlineFeedback
            variant="info"
            title="Voice input unavailable"
            message={speechNotice}
            onDismiss={() => updateSession({ speechNotice: null })}
          />
        )}

        <textarea
          rows={4}
          value={answer}
          onChange={(e) => updateSession({ answer: e.target.value })}
          placeholder="Explain your technical design, architectural components, and performance trade-offs..."
          className="w-full text-xs p-4 rounded-2xl bg-canvas border border-[#E0E0DC] text-obsidian placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-obsidian resize-none"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center space-x-2 transition-all shadow-xs ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-canvas text-obsidian hover:bg-[#EAEAEA] border border-[#E0E0DC]'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-terracotta-500" />}
            <span>{isRecording ? "Stop Recording" : "Speak Answer (Voice)"}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answer.trim() || isEvaluating}
            className="px-6 py-2.5 rounded-full text-xs font-extrabold bg-obsidian text-white flex items-center space-x-2 hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs"
          >
            {isEvaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Submit for Evaluation</span>
          </button>
        </div>
      </div>

      {/* Honest Error State on Evaluation Failure */}
      {evaluationError && (
        <RetryableErrorCard
          title="Evaluation Service Notice"
          message={evaluationError}
          onRetry={handleSubmit}
          isRetrying={isEvaluating}
        />
      )}

      {/* Verified Grounded Feedback */}
      {feedback && (
        <div className="p-5 rounded-2.5xl bg-surface border border-terracotta-200 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600 font-black text-sm">
                {feedback.score}
              </div>
              <div>
                <span className="font-extrabold text-obsidian text-sm block">Score: {feedback.score} / 10</span>
                <span className="text-[10px] text-subtle font-mono">
                  Engine: {feedback.evaluated_by === "ai_provider" ? "AI Evaluation Provider" : "Deterministic Lexical Rubric"}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {feedback.adaptation_note}
            </span>
          </div>

          <p className="text-xs text-zinc-800 leading-relaxed font-medium bg-canvas p-3 rounded-xl border border-[#E0E0DC]">
            "{feedback.critique}"
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
              <span className="font-bold text-emerald-950 block mb-1">✓ Concepts Articulated:</span>
              <p className="text-emerald-800">
                {feedback.matched_keywords && feedback.matched_keywords.length > 0
                  ? feedback.matched_keywords.join(", ")
                  : "None detected in submission"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
              <span className="font-bold text-amber-950 block mb-1">△ Concepts Missed:</span>
              <p className="text-amber-800">
                {feedback.missing_keywords && feedback.missing_keywords.length > 0
                  ? feedback.missing_keywords.join(", ")
                  : "All target concepts addressed"}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-full text-xs font-bold bg-terracotta-500 text-white hover:bg-terracotta-600 flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>Next Adaptive Question</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}