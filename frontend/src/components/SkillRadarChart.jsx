import React, { useMemo } from 'react';
import { Radar, AlertCircle } from 'lucide-react';

const AXES = [
  { key: 'dsa', label: 'Problem Solving' },
  { key: 'sys_design', label: 'System Design' },
  { key: 'cloud_devops', label: 'Cloud & Docker' },
  { key: 'ai_ml', label: 'AI & Data' },
  { key: 'database', label: 'Databases' },
  { key: 'communication', label: 'Resume & Answers' },
];

export default function SkillRadarChart({ studentSkills = [], qualityScore = 75, targetRole = "AI Systems Engineer" }) {
  const skillsLower = useMemo(() => studentSkills.map(s => s.toLowerCase()), [studentSkills]);

  const candidateScores = useMemo(() => {
    const dsaKeywords = ["python", "sql", "algorithms", "dsa", "c++", "java"];
    const dsaScore = Math.min(95, Math.max(30, dsaKeywords.filter(k => skillsLower.includes(k)).length * 30 + 20));

    const sysKeywords = ["system design", "microservices", "redis", "fastapi", "rest apis"];
    const sysScore = Math.min(95, Math.max(25, sysKeywords.filter(k => skillsLower.includes(k)).length * 35));

    const cloudKeywords = ["docker", "kubernetes", "terraform", "ci/cd", "aws", "linux"];
    const cloudScore = Math.min(95, Math.max(20, cloudKeywords.filter(k => skillsLower.includes(k)).length * 32));

    const aiKeywords = ["vector embeddings", "rag pipelines", "pytorch", "rag", "scikit-learn"];
    const aiScore = Math.min(95, Math.max(20, aiKeywords.filter(k => skillsLower.includes(k)).length * 38));

    const dbKeywords = ["postgresql", "sql", "redis", "mongodb", "database"];
    const dbScore = Math.min(95, Math.max(25, dbKeywords.filter(k => skillsLower.includes(k)).length * 32));

    const commScore = Math.min(95, Math.max(30, qualityScore));

    return [dsaScore, sysScore, cloudScore, aiScore, dbScore, commScore];
  }, [skillsLower, qualityScore]);

  const targetBenchmark = [90, 85, 80, 90, 75, 85];
  const size = 300;
  const center = size / 2;
  const radius = 95;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value, index) => {
    const angle = (Math.PI * 2 / AXES.length) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const candidatePoints = candidateScores.map((val, idx) => `${getCoordinates(val, idx).x},${getCoordinates(val, idx).y}`).join(' ');
  const benchmarkPoints = targetBenchmark.map((val, idx) => `${getCoordinates(val, idx).x},${getCoordinates(val, idx).y}`).join(' ');

  const gaps = AXES.map((axis, i) => ({
    label: axis.label,
    gap: Math.max(0, targetBenchmark[i] - candidateScores[i]),
  })).sort((a, b) => b.gap - a.gap);

  const topGap = gaps[0];

  return (
    <div className="bg-surface rounded-3xl p-6 border border-[#E6E6E3] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ECECE9]">
        <div className="flex items-center space-x-2">
          <Radar className="w-5 h-5 text-terracotta-500" />
          <div>
            <h3 className="font-extrabold text-obsidian text-base">Your Skills vs. Job Target</h3>
            <p className="text-[11px] text-subtle">How your profile compares to {targetRole}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500"></span>
            <span className="text-obsidian">Your Score</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300"></span>
            <span className="text-subtle">Job Target</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex flex-col items-center justify-center relative">
        <svg width={size} height={size} className="overflow-visible select-none">
          {levels.map((lvl, lIdx) => (
            <polygon
              key={lIdx}
              points={AXES.map((_, aIdx) => `${getCoordinates(lvl * 100, aIdx).x},${getCoordinates(lvl * 100, aIdx).y}`).join(' ')}
              fill="none"
              stroke="#E5E5E0"
              strokeWidth="1"
              strokeDasharray={lIdx < levels.length - 1 ? "3 3" : undefined}
            />
          ))}

          {AXES.map((_, idx) => (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={getCoordinates(100, idx).x}
              y2={getCoordinates(100, idx).y}
              stroke="#E5E5E0"
              strokeWidth="1"
            />
          ))}

          <polygon points={benchmarkPoints} fill="#71717A" fillOpacity="0.06" stroke="#A1A1AA" strokeWidth="1.5" strokeDasharray="4 4" />
          <polygon points={candidatePoints} fill="#E05638" fillOpacity="0.3" stroke="#E05638" strokeWidth="2.5" className="transition-all duration-700 ease-out" />

          {candidateScores.map((val, idx) => (
            <circle
              key={idx}
              cx={getCoordinates(val, idx).x}
              cy={getCoordinates(val, idx).y}
              r="4"
              fill="#FFFFFF"
              stroke="#E05638"
              strokeWidth="2.5"
            />
          ))}

          {AXES.map((axis, idx) => {
            const angle = (Math.PI * 2 / AXES.length) * idx - Math.PI / 2;
            const x = center + (radius + 20) * Math.cos(angle);
            const y = center + (radius + 20) * Math.sin(angle);
            let textAnchor = "middle";
            if (Math.cos(angle) > 0.3) textAnchor = "start";
            if (Math.cos(angle) < -0.3) textAnchor = "end";

            return (
              <text key={idx} x={x} y={y} textAnchor={textAnchor} fontSize="9" fontWeight="700" fill="#4B5563">
                {axis.label} ({candidateScores[idx]}%)
              </text>
            );
          })}
        </svg>

        {topGap.gap > 0 && (
          <div className="w-full mt-2 p-2.5 rounded-2xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-between text-xs text-terracotta-900">
            <div className="flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-terracotta-500 shrink-0" />
              <span className="text-[11px] font-semibold">
                Biggest gap: Focus on <strong>{topGap.label}</strong> ({topGap.gap}% behind job target).
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}