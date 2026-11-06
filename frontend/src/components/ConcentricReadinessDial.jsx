import React from 'react';
import { Target, Award, CheckCircle2, TrendingUp } from 'lucide-react';

export default function ConcentricReadinessDial({ readiness }) {
  const {
    overall = 78,
    skill_coverage = 75,
    interview_performance = 70,
    milestone_completion = 40,
    profile_quality = 85
  } = readiness || {};

  return (
    <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-600 block">
            Holistic Readiness Index
          </span>
          <h3 className="font-extrabold text-obsidian text-lg">Multi-Factor Placement Score</h3>
        </div>
        <span className="text-2xl font-black text-obsidian bg-canvas px-3.5 py-1 rounded-full border border-[#E0E0DC]">
          {overall}%
        </span>
      </div>

      {/* Layered Concentric Visualization */}
      <div className="relative w-full h-56 flex items-center justify-center my-2">
        {/* Outer Ring: Skill Coverage (40% Weight) */}
        <div
          className="absolute rounded-full border border-terracotta-200/60 bg-terracotta-50/40 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '220px', height: '220px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-700/80 tracking-tight">
            Skill Fit: {skill_coverage}%
          </span>
        </div>

        {/* Ring 2: Interview Mastery (25% Weight) */}
        <div
          className="absolute rounded-full border border-terracotta-300/80 bg-terracotta-100/50 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '170px', height: '170px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-800 tracking-tight">
            Interview: {interview_performance}%
          </span>
        </div>

        {/* Ring 3: Milestone Progress (20% Weight) */}
        <div
          className="absolute rounded-full border border-terracotta-400 bg-terracotta-200/60 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '120px', height: '120px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-900 tracking-tight">
            Tasks: {milestone_completion}%
          </span>
        </div>

        {/* Inner Core: Profile & ATS Quality (15% Weight) */}
        <div
          className="absolute rounded-full bg-terracotta-500 text-white flex flex-col items-center justify-center shadow-lg transition-all duration-700 hover:scale-105"
          style={{ width: '75px', height: '75px' }}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">CV Score</span>
          <span className="text-base font-black leading-none">{profile_quality}%</span>
        </div>
      </div>

      {/* Formula Breakdown Breakdown Footer */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-[#ECECE9]">
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-200"></span>
          <span>40% Skill Coverage</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-300"></span>
          <span>25% Adaptive Interview</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-400"></span>
          <span>20% Plan Completion</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-500"></span>
          <span>15% Profile Quality</span>
        </div>
      </div>
    </div>
  );
}