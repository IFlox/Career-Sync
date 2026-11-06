import React, { useMemo } from 'react';
import { Radar, Target, AlertCircle } from 'lucide-react';

const AXES = [
  { key: 'dsa', label: 'Algorithms & Core CS', weight: 'High' },
  { key: 'sys_design', label: 'System Design & Concurrency', weight: 'Critical' },
  { key: 'cloud_devops', label: 'Cloud & Containers (Docker/K8s)', weight: 'High' },
  { key: 'ai_ml', label: 'AI Systems & RAG Pipelines', weight: 'Critical' },
  { key: 'database', label: 'Databases & Distributed Caching', weight: 'Medium' },
  { key: 'communication', label: 'Technical Articulation & Quality', weight: 'High' },
];

export default function SkillRadarChart({ studentSkills = [], qualityScore = 75, targetRole = "AI Systems & RAG Engineer" }) {
  // Dynamically compute competency scores (0-100) per axis from verified candidate skills
  const skillsLower = useMemo(() => studentSkills.map(s => s.toLowerCase()), [studentSkills]);

  const candidateScores = useMemo(() => {
    // 1. Algorithms & DSA
    const dsaKeywords = ["python", "sql", "algorithms", "dsa", "c++", "java"];
    const dsaMatches = dsaKeywords.filter(k => skillsLower.includes(k)).length;
    const dsaScore = Math.min(95, Math.max(30, dsaMatches * 30 + 20));

    // 2. System Design
    const sysKeywords = ["system design", "microservices", "redis", "fastapi", "rest apis"];
    const sysMatches = sysKeywords.filter(k => skillsLower.includes(k)).length;
    const sysScore = Math.min(95, Math.max(25, sysMatches * 35));

    // 3. Cloud & DevOps
    const cloudKeywords = ["docker", "kubernetes", "terraform", "ci/cd", "aws", "linux"];
    const cloudMatches = cloudKeywords.filter(k => skillsLower.includes(k)).length;
    const cloudScore = Math.min(95, Math.max(20, cloudMatches * 32));

    // 4. AI & RAG
    const aiKeywords = ["vector embeddings", "rag pipelines", "pytorch", "rag", "scikit-learn"];
    const aiMatches = aiKeywords.filter(k => skillsLower.includes(k)).length;
    const aiScore = Math.min(95, Math.max(20, aiMatches * 38));

    // 5. Databases
    const dbKeywords = ["postgresql", "sql", "redis", "mongodb", "database"];
    const dbMatches = dbKeywords.filter(k => skillsLower.includes(k)).length;
    const dbScore = Math.min(95, Math.max(25, dbMatches * 32));

    // 6. Articulation / Profile Quality
    const commScore = Math.min(95, Math.max(30, qualityScore));

    return [dsaScore, sysScore, cloudScore, aiScore, dbScore, commScore];
  }, [skillsLower, qualityScore]);

  // Target role benchmark scores (The ideal standard polygon)
  const targetBenchmark = [90, 85, 80, 90, 75, 85];

  // SVG Geometry Constants
  const size = 320;
  const center = size / 2;
  const radius = 105;
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Helper: Convert Polar (angle + distance) to Cartesian (x, y)
  const getCoordinates = (value, index) => {
    const angle = (Math.PI * 2 / AXES.length) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build SVG polygon points string
  const candidatePoints = candidateScores
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx);
      return `${x},${y}`;
    })
    .join(' ');

  const benchmarkPoints = targetBenchmark
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx);
      return `${x},${y}`;
    })
    .join(' ');

  // Compute largest skill gap for targeted alert
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
            <h3 className="font-extrabold text-obsidian text-base leading-tight">6-Axis Competency Radar</h3>
            <p className="text-[11px] text-subtle">Candidate Profile vs. {targetRole} Benchmark</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500"></span>
            <span className="text-obsidian">Candidate</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300"></span>
            <span className="text-subtle">Target Benchmark</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex flex-col items-center justify-center relative">
        <svg width={size} height={size} className="overflow-visible select-none">
          {/* Concentric Web Rings (25%, 50%, 75%, 100%) */}
          {levels.map((lvl, lIdx) => {
            const levelPoints = AXES.map((_, aIdx) => {
              const { x, y } = getCoordinates(lvl * 100, aIdx);
              return `${x},${y}`;
            }).join(' ');

            return (
              <polygon
                key={lIdx}
                points={levelPoints}
                fill="none"
                stroke="#E5E5E0"
                strokeWidth={lIdx === levels.length - 1 ? "1.5" : "1"}
                strokeDasharray={lIdx < levels.length - 1 ? "3 3" : undefined}
              />
            );
          })}

          {/* Radial Axis Spokes */}
          {AXES.map((_, idx) => {
            const { x, y } = getCoordinates(100, idx);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#E5E5E0"
                strokeWidth="1"
              />
            );
          })}

          {/* Benchmark Polygon (Dashed Gray Reference) */}
          <polygon
            points={benchmarkPoints}
            fill="#71717A"
            fillOpacity="0.07"
            stroke="#A1A1AA"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Candidate Competency Polygon (Terracotta Primary) */}
          <polygon
            points={candidatePoints}
            fill="#E05638"
            fillOpacity="0.32"
            stroke="#E05638"
            strokeWidth="2.5"
            className="transition-all duration-700 ease-out"
          />

          {/* Vertex Nodes with pulsing effect */}
          {candidateScores.map((val, idx) => {
            const { x, y } = getCoordinates(val, idx);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="4.5"
                fill="#FFFFFF"
                stroke="#E05638"
                strokeWidth="2.5"
                className="transition-all duration-700 ease-out hover:scale-125"
              />
            );
          })}

          {/* Labels positioned at polygon vertices */}
          {AXES.map((axis, idx) => {
            const angle = (Math.PI * 2 / AXES.length) * idx - Math.PI / 2;
            const labelRadius = radius + 24;
            const x = center + labelRadius * Math.cos(angle);
            const y = center + labelRadius * Math.sin(angle);

            let textAnchor = "middle";
            if (Math.cos(angle) > 0.3) textAnchor = "start";
            if (Math.cos(angle) < -0.3) textAnchor = "end";

            return (
              <text
                key={idx}
                x={x}
                y={y}
                textAnchor={textAnchor}
                fontSize="9"
                fontWeight="700"
                fill="#4B5563"
                className="font-sans"
              >
                {axis.label.split(' ')[0]} ({candidateScores[idx]}%)
              </text>
            );
          })}
        </svg>

        {/* Actionable Gap Callout Badge */}
        {topGap.gap > 0 && (
          <div className="w-full mt-2 p-2.5 rounded-2xl bg-terracotta-50/70 border border-terracotta-100 flex items-center justify-between text-xs text-terracotta-900">
            <div className="flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-terracotta-500 shrink-0" />
              <span className="text-[11px] font-semibold">
                Critical Variance: <strong className="text-terracotta-700">{topGap.label}</strong> is lagging by {topGap.gap}%.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-surface px-2 py-0.5 rounded-full border border-terracotta-200">
              Priority #1
            </span>
          </div>
        )}
      </div>
    </div>
  );
}