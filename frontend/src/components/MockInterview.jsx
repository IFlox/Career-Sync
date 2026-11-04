import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Award, Sparkles, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import { MOCK_INTERVIEW_QUESTIONS } from '../data/seedData';

export default function MockInterview({ missingSkills = ["RAG Pipelines", "System Design"], addTrace }) {
  const [currentSkill, setCurrentSkill] = useState("RAG Pipelines");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(6); // 1-10 scale
  const [answer, setAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Initialize Questions from Gap
  const questionPool = MOCK_INTERVIEW_QUESTIONS[currentSkill] || MOCK_INTERVIEW_QUESTIONS["RAG Pipelines"];
  const currentQuestion = questionPool[questionIndex % questionPool.length];

  // Speech Recognition Setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      alert("Browser Speech-to-Text API is not supported in this browser. Please type your answer.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (!isListening) {
      recognition.start();
      setIsListening(true);
      addTrace?.(`Microphone Activated: Listening for technical response on ${currentSkill}...`);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAnswer(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleSpeakQuestion = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) return;

    setIsEvaluating(true);
    addTrace?.(`Evaluating Answer for Skill: ${currentSkill} (Difficulty: ${difficulty}/10)`);

    setTimeout(() => {
      // Deterministic Rubric Evaluation based on Keywords
      const textLower = answer.toLowerCase();
      let matchedCount = 0;
      currentQuestion.idealKeywords.forEach(kw => {
        if (textLower.includes(kw.toLowerCase())) matchedCount++;
      });

      let score = Math.round((matchedCount / currentQuestion.idealKeywords.length) * 10);
      if (answer.split(" ").length > 25 && score < 7) score += 2;
      score = Math.min(10, Math.max(3, score));

      // Adaptive Difficulty adjustment
      let nextDifficulty = difficulty;
      let adaptationNote = "";
      if (score > 8) {
        nextDifficulty = Math.min(10, difficulty + 1);
        adaptationNote = "Excellent precision! Adaptive Agent increased question difficulty level to " + nextDifficulty + "/10.";
      } else if (score < 5) {
        nextDifficulty = Math.max(3, difficulty - 1);
        adaptationNote = "Fundamentals need consolidation. Adaptive Agent reduced next difficulty to " + nextDifficulty + "/10.";
      } else {
        adaptationNote = "Solid response. Maintained target question difficulty at " + difficulty + "/10.";
      }

      setDifficulty(nextDifficulty);

      const review = {
        score,
        adaptationNote,
        matchedKeywords: currentQuestion.idealKeywords.filter(k => textLower.includes(k.toLowerCase())),
        missingKeywords: currentQuestion.idealKeywords.filter(k => !textLower.includes(k.toLowerCase())),
        critique: score >= 7
          ? "Great technical articulation! You accurately referenced core architecture terms and trade-offs."
          : "Good attempt, but your response lacked concrete architecture terms like " + currentQuestion.idealKeywords.slice(0, 2).join(" & ") + "."
      };

      setFeedback(review);
      setIsEvaluating(false);
      addTrace?.(`Interview Evaluation: Score ${score}/10 -> ${adaptationNote}`);
    }, 700);
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setAnswer("");
    setQuestionIndex(prev => prev + 1);
  };

  return (
    <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#ECECE9]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500"></span>
            <h3 className="font-bold text-obsidian text-base">Adaptive 1-on-1 Mock Interview Bot</h3>
          </div>
          <p className="text-xs text-subtle mt-0.5">Targeting your detected skill gaps with live adaptive difficulty.</p>
        </div>

        {/* Skill Gap Select */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-subtle font-medium">Focus Gap:</label>
          <select
            value={currentSkill}
            onChange={(e) => {
              setCurrentSkill(e.target.value);
              setQuestionIndex(0);
              setFeedback(null);
            }}
            className="text-xs bg-canvas font-semibold px-3 py-1.5 rounded-full border border-[#E0E0DC] text-obsidian"
          >
            {missingSkills.map((sk, idx) => (
              <option key={idx} value={sk}>{sk}</option>
            ))}
          </select>
          <span className="text-xs px-2.5 py-1 rounded-full bg-obsidian text-white font-mono">
            Diff: {difficulty}/10
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-canvas p-5 rounded-2.5xl border border-[#E4E4DF] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2.5 py-0.5 rounded-full border border-terracotta-100">
            {currentQuestion.level} Assessment
          </span>
          <button
            onClick={handleSpeakQuestion}
            className="flex items-center space-x-1 text-xs text-subtle hover:text-obsidian"
            title="Read question aloud"
          >
            <Volume2 className="w-4 h-4 text-terracotta-500" />
            <span>Listen</span>
          </button>
        </div>
        <p className="text-sm font-semibold text-obsidian leading-relaxed">
          "{currentQuestion.question}"
        </p>
      </div>

      {/* Answer Form */}
      <div className="space-y-3">
        <textarea
          rows={4}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Speak or type your technical answer here (include engineering trade-offs, architecture components, and specific metrics)..."
          className="w-full text-xs p-4 rounded-2xl bg-canvas border border-[#E0E0DC] focus:outline-none focus:ring-2 focus:ring-obsidian/20 text-obsidian resize-none"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-2 transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-canvas text-obsidian hover:bg-[#E8E8E4] border border-[#E0E0DC]'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-terracotta-500" />}
            <span>{isListening ? "Listening (Click to Stop)..." : "Answer with Voice"}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || isEvaluating}
            className="px-5 py-2 rounded-full text-xs font-bold bg-obsidian text-white flex items-center space-x-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {isEvaluating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Evaluate Answer</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Drawer */}
      {feedback && (
        <div className="p-5 rounded-2.5xl bg-surface border border-terracotta-200/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-terracotta-500" />
              <span className="font-bold text-obsidian text-sm">Evaluation: {feedback.score} / 10</span>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {feedback.adaptationNote}
            </span>
          </div>

          <p className="text-xs text-zinc-700 leading-relaxed">{feedback.critique}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
              <span className="font-semibold text-emerald-900 block mb-1">✓ Keywords Articulated:</span>
              <p className="text-emerald-700">{feedback.matchedKeywords.join(", ") || "None identified"}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50">
              <span className="font-semibold text-amber-900 block mb-1">△ Missing Target Concepts:</span>
              <p className="text-amber-700">{feedback.missingKeywords.join(", ") || "All concepts covered!"}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 rounded-full text-xs font-bold bg-terracotta-500 text-white hover:bg-terracotta-600 transition-colors"
            >
              Next Adaptive Question →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}