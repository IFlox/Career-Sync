import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

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
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-600 block">
            Overall Status
          </span>
          <h3 className="font-extrabold text-obsidian text-lg">Placement Readiness</h3>
        </div>
        <span className="text-2xl font-black text-obsidian bg-canvas px-3.5 py-1 rounded-full border border-[#E0E0DC]">
          {overall}%
        </span>
      </div>

      {/* Concentric Circles */}
      <div className="relative w-full h-52 flex items-center justify-center my-1">
        {/* Ring 1: Skills */}
        <div
          className="absolute rounded-full border border-terracotta-200/60 bg-terracotta-50/40 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '210px', height: '210px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-700 tracking-tight">
            Matching Skills: {skill_coverage}%
          </span>
        </div>

        {/* Ring 2: Interview */}
        <div
          className="absolute rounded-full border border-terracotta-300/80 bg-terracotta-100/50 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '160px', height: '160px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-800 tracking-tight">
            Interview Score: {interview_performance}%
          </span>
        </div>

        {/* Ring 3: Tasks */}
        <div
          className="absolute rounded-full border border-terracotta-400 bg-terracotta-200/60 flex items-start justify-center pt-2 transition-all duration-700"
          style={{ width: '115px', height: '115px' }}
        >
          <span className="text-[10px] font-bold text-terracotta-900 tracking-tight">
            Tasks Done: {milestone_completion}%
          </span>
        </div>

        {/* Inner Core: Resume Quality */}
        <div
          className="absolute rounded-full bg-terracotta-500 text-white flex flex-col items-center justify-center shadow-md transition-all duration-700 hover:scale-105"
          style={{ width: '70px', height: '70px' }}
        >
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">Resume</span>
          <span className="text-sm font-black leading-none">{profile_quality}%</span>
        </div>
      </div>

      {/* Simple Breakdown Labels */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-[#ECECE9]">
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-200"></span>
          <span>40% Skills Match</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-300"></span>
          <span>25% Practice Interview</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-400"></span>
          <span>20% Study Tasks</span>
        </div>
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-terracotta-500"></span>
          <span>15% Resume Quality</span>
        </div>
      </div>
    </div>
  );
}