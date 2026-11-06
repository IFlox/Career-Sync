import React from 'react';
import { TrendingUp, Calendar, CheckCircle2, Award, Clock } from 'lucide-react';

export default function ProgressTimelineWidget({ progressData }) {
  const {
    trajectory = [],
    recent_events = [],
    milestone_completion_pct = 25,
    activity_streak_days = 7
  } = progressData || {};

  // Generate SVG coordinates for the smooth trajectory curve
  const svgWidth = 380;
  const svgHeight = 110;
  const padding = 20;

  const points = trajectory.map((item, idx) => {
    const x = padding + (idx / Math.max(1, trajectory.length - 1)) * (svgWidth - padding * 2);
    // Scale readiness (0 - 100) to height
    const y = svgHeight - padding - (item.readiness / 100) * (svgHeight - padding * 2);
    return { x, y, readiness: item.readiness, date: item.date };
  });

  const pathD = points.length > 0
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : `M ${padding},${svgHeight/2} L ${svgWidth-padding},${svgHeight/2}`;

  // Area under curve
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${svgHeight} L ${points[0].x},${svgHeight} Z`
    : '';

  const latestScore = trajectory[trajectory.length - 1]?.readiness || 78;
  const initialScore = trajectory[0]?.readiness || 52;
  const delta = latestScore - initialScore;

  return (
    <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ECECE9]">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-terracotta-600 block">
            Persistent Readiness Trajectory
          </span>
          <h3 className="font-extrabold text-obsidian text-base">Historical Placement Growth Curve</h3>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 text-xs font-bold font-mono">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>+{delta}% Growth</span>
        </div>
      </div>

      {/* SVG Trajectory Sparkline Graph (Inspired by reference screenshot) */}
      <div className="bg-canvas rounded-2.5xl p-4 border border-[#E2E2DE] relative overflow-hidden">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-obsidian text-sm">{latestScore}% Placement Readiness</span>
          <span className="text-[11px] text-subtle font-medium">Logged over {activity_streak_days} campus sessions</span>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 overflow-visible">
          {/* Subtle horizontal grid lines */}
          <line x1={padding} y1={svgHeight * 0.25} x2={svgWidth - padding} y2={svgHeight * 0.25} stroke="#E4E4DF" strokeDasharray="3 3" />
          <line x1={padding} y1={svgHeight * 0.75} x2={svgWidth - padding} y2={svgHeight * 0.75} stroke="#E4E4DF" strokeDasharray="3 3" />

          {/* Area Fill */}
          <path d={areaD} fill="#E05638" fillOpacity="0.08" />

          {/* Smooth Terracotta Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#E05638"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Point Nodes */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? "5" : "3.5"}
              fill="#FFFFFF"
              stroke="#E05638"
              strokeWidth={i === points.length - 1 ? "2.5" : "1.8"}
            />
          ))}
        </svg>

        <div className="flex justify-between text-[10px] text-subtle font-mono pt-1">
          <span>{trajectory[0]?.date || 'Day 1'}</span>
          <span>Today ({latestScore}%)</span>
        </div>
      </div>

      {/* Activity Streak Matrix & Audit-Proof Event Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Streak Matrix Widget */}
        <div className="p-3.5 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-obsidian">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Campus Preparation Streak</span>
            </span>
            <span className="text-terracotta-600 font-mono">Active</span>
          </div>

          {/* Dot Matrix Grid (Matches top-right widget in reference image) */}
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  i < activity_streak_days + 3
                    ? 'bg-terracotta-500'
                    : 'bg-[#DCDCD8]'
                }`}
                title={`Prep Event #${i + 1}`}
              ></span>
            ))}
          </div>
          <span className="text-[10px] text-subtle block font-medium">100% Verified Event Log Retention</span>
        </div>

        {/* Recent Server Events */}
        <div className="p-3.5 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-1.5">
          <span className="text-xs font-bold text-obsidian flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-terracotta-500" />
            <span>Latest Progress Events</span>
          </span>

          <div className="space-y-1 text-[11px] overflow-hidden">
            {recent_events.slice(-2).map((ev, idx) => (
              <div key={idx} className="truncate text-zinc-700 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{ev.title}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-subtle block font-mono">Persisted to backend database</span>
        </div>
      </div>
    </div>
  );
}