import React from 'react';
import { TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

export default function ProgressTimelineWidget({ progressData }) {
  const {
    trajectory = [],
    recent_events = [],
    activity_streak_days = 7
  } = progressData || {};

  const svgWidth = 360;
  const svgHeight = 90;
  const padding = 15;

  const points = trajectory.map((item, idx) => {
    const x = padding + (idx / Math.max(1, trajectory.length - 1)) * (svgWidth - padding * 2);
    const y = svgHeight - padding - (item.readiness / 100) * (svgHeight - padding * 2);
    return { x, y, readiness: item.readiness, date: item.date };
  });

  const pathD = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x},${svgHeight} L ${points[0].x},${svgHeight} Z` : '';
  const latestScore = trajectory[trajectory.length - 1]?.readiness || 78;
  const initialScore = trajectory[0]?.readiness || 52;
  const delta = latestScore - initialScore;

  return (
    <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#ECECE9]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-600 block">
            Saved Progress
          </span>
          <h3 className="font-extrabold text-obsidian text-base">Your Growth Over Time</h3>
        </div>

        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 text-xs font-bold font-mono">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>+{delta}% Improvement</span>
        </div>
      </div>

      {/* Trajectory Sparkline Graph */}
      <div className="bg-canvas rounded-2.5xl p-4 border border-[#E2E2DE]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-obsidian text-sm">{latestScore}% Current Readiness</span>
          <span className="text-[11px] text-subtle font-medium">{activity_streak_days} days of prep logged</span>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-20 overflow-visible">
          <path d={areaD} fill="#E05638" fillOpacity="0.08" />
          <path d={pathD} fill="none" stroke="#E05638" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? "4.5" : "3"}
              fill="#FFFFFF"
              stroke="#E05638"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="flex justify-between text-[10px] text-subtle font-mono pt-1">
          <span>{trajectory[0]?.date || 'Day 1'}</span>
          <span>Today ({latestScore}%)</span>
        </div>
      </div>

      {/* Activity Dots & Saved Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-obsidian">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Practice Activity</span>
            </span>
            <span className="text-emerald-700 text-[10px]">Active</span>
          </div>

          <div className="grid grid-cols-7 gap-1 pt-0.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full ${i < activity_streak_days + 3 ? 'bg-terracotta-500' : 'bg-[#DCDCD8]'}`}
              ></span>
            ))}
          </div>
          <span className="text-[10px] text-subtle block font-medium">Activity saved automatically</span>
        </div>

        <div className="p-3 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-1">
          <span className="text-xs font-bold text-obsidian block">Latest Activity</span>
          <div className="space-y-1 text-[11px] pt-1">
            {recent_events.slice(-2).map((ev, idx) => (
              <div key={idx} className="truncate text-zinc-700 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{ev.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}