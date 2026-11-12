import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, ChevronRight, RefreshCw, Briefcase, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import RetryableErrorCard from './RetryableErrorCard';

export default function MockInterview({
  studentId = "stud-01",
  targetRoleTitle = "AI Systems & RAG Engineer",
  missingSkills = ["RAG Pipelines", "System Design"],
  addTrace,
  onScoreUpdate
}) {
  const [currentSkill, setCurrentSkill] = useState(missingSkills[0] || "RAG Pipelines");
  const [difficulty, setDifficulty] = useState(6);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: "Loading adaptive question...",
    level: "Intermediate",
    keywords: []
  });
  const [questionCount, setQuestionCount] = useState(1);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [evaluationError, setEvaluationError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionScores, setSessionScores] = useState([]);
  const [audioWaves, setAudioWaves] = useState([20, 25, 20, 30, 20, 25, 20, 30, 20, 25]);

  useEffect(() => {
    if (missingSkills && missingSkills.length > 0) {
      if (!missingSkills.includes(currentSkill)) {
        setCurrentSkill(missingSkills[0]);
        setFeedback(null);
        setEvaluationError(null);
      }
    }
  }, [missingSkills]);

  const loadQuestion = () => {
    setIsLoadingQuestion(true);
    setQuestionError(null);
    apiClient.getInterviewQuestion(currentSkill, difficulty)
      .then(q => {
        if (q) setCurrentQuestion(q);
      })
      .catch((err) => {
        setQuestionError(err.message || "Failed to load question for this topic.");
      })
      .finally(() => {
        setIsLoadingQuestion(false);
      });
  };

  useEffect(() => {
    loadQuestion();
  }, [currentSkill, difficulty]);

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
      alert("Browser speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    if (!isRecording) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setAnswer(prev => prev ? `${prev} ${transcript}` : transcript);
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
      } catch {
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
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
    if (!answer.trim()) return;
    setIsEvaluating(true);
    setEvaluationError(null);
    addTrace?.(`Evaluating answer for ${currentSkill} (${targetRoleTitle}, Diff: ${difficulty}/10)...`);

    try {
      const res = await apiClient.submitInterviewAnswer(
        studentId,
        currentSkill,
        answer,
        difficulty,
        currentQuestion.question
      );

      setFeedback(res);
      const nextDiff = Math.max(1, Math.min(10, res.next_difficulty || difficulty));
      setDifficulty(nextDiff);

      const newScores = [...sessionScores, res.score];
      setSessionScores(newScores);
      const avg = Math.round((newScores.reduce((a, b) => a + b, 0) / newScores.length) * 10);
      onScoreUpdate?.(avg);

      addTrace?.(`Interview evaluated: ${res.score}/10 [${res.evaluated_by}]. Next difficulty: ${nextDiff}/10.`);
    } catch (err) {
      // Sprint 3: Display honest, actionable error state without faking scores
      setEvaluationError(err.message || "We could not evaluate this response. No score was recorded.");
      addTrace?.(`Evaluation service error: ${err.message}`, "error");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setEvaluationError(null);
    setAnswer("");
    setQuestionCount(prev => prev + 1);
  };

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
                setCurrentSkill(e.target.value);
                setFeedback(null);
                setEvaluationError(null);
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

      {/* Dynamic Question Card or Error State */}
      {questionError ? (
        <RetryableErrorCard
          title="Could Not Load Adaptive Question"
          message={questionError}
          onRetry={loadQuestion}
          isRetrying={isLoadingQuestion}
        />
      ) : (
        <div className="bg-canvas p-5 rounded-2.5xl border border-[#E2E2DE] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2.5 py-0.5 rounded-full border border-terracotta-100">
              Question #{questionCount} • {currentQuestion.level || "Adaptive"}
            </span>
            <button
              onClick={handleSpeakQuestion}
              className="flex items-center space-x-1.5 text-xs text-subtle hover:text-obsidian transition-colors font-medium"
            >
              <Volume2 className="w-4 h-4 text-terracotta-500" />
              <span>Read Aloud</span>
            </button>
          </div>
          <p className="text-sm sm:text-base font-bold text-obsidian leading-relaxed">
            {isLoadingQuestion ? "Loading next adaptive question..." : `"${currentQuestion.question}"`}
          </p>
        </div>
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

        <textarea
          rows={4}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
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