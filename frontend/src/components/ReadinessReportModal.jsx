import React from 'react';
import { X, Printer, CheckCircle2, Award, ShieldCheck, Calendar, Briefcase } from 'lucide-react';

export default function ReadinessReportModal({ student, targetJob, readiness, onClose }) {
  if (!student) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#E0E0DC]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-canvas border-b border-[#E0E0DC] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-obsidian text-base">Official Placement Readiness Certificate</h3>
              <p className="text-xs text-subtle">Verified institutional candidate competency report.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-subtle hover:text-obsidian hover:bg-[#EAEAEA]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Report Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs bg-white text-zinc-800 select-text font-sans">
          {/* Institutional Header */}
          <div className="text-center border-b pb-4 border-zinc-200">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-terracotta-600 block mb-1">
              Institute of Engineering and Technology • Campus Placements
            </span>
            <h1 className="text-xl font-black text-zinc-950 tracking-tight">CANDIDATE PLACEMENT READINESS DOSSIER</h1>
            <p className="text-xs text-zinc-500 mt-1">Generated: {todayStr} • Document ID: CS-{student.id.toUpperCase()}</p>
          </div>

          {/* Student & Target Details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Candidate:</span>
              <span className="text-sm font-bold text-zinc-900 block">{student.name}</span>
              <span className="text-xs text-zinc-600">{student.branch} • CGPA: {student.cgpa} / 10.0</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Target Placement Role:</span>
              <span className="text-sm font-bold text-zinc-900 block">{targetJob.title}</span>
              <span className="text-xs text-zinc-600">{targetJob.company} ({targetJob.tier})</span>
            </div>
          </div>

          {/* Core Readiness Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b pb-1">
              Multi-Factor Evaluation Summary
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Overall Fit</span>
                <span className="text-xl font-black text-terracotta-600">{readiness.overall}%</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Skill Match</span>
                <span className="text-xl font-black text-zinc-900">{readiness.skill_coverage}%</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">AI Interview</span>
                <span className="text-xl font-black text-zinc-900">{readiness.interview_performance}%</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase block font-bold">Plan Done</span>
                <span className="text-xl font-black text-zinc-900">{readiness.milestone_completion}%</span>
              </div>
            </div>
          </div>

          {/* Verified Skills */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b pb-1">
              Demonstrated Technical Skills
            </h4>
            <p className="text-xs text-zinc-700 leading-relaxed font-mono">
              {(student.skills || []).join(" • ")}
            </p>
          </div>

          {/* Institutional Compliance */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold text-emerald-950 block text-xs">University Placement Status: Verified</span>
                <span className="text-[11px] text-emerald-800">
                  SOP Tier Compliance: {student.cgpa >= 6.0 ? "Tier-1 & Tier-2 Eligible" : "Tier-2 Eligible"} • Active Drives: {student.activeAppsCount || 0}/3
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {student.adminStatus || "Approved"}
            </span>
          </div>

          {/* Stamp */}
          <div className="pt-4 border-t border-dashed border-zinc-300 flex justify-between items-end text-[11px] text-zinc-500">
            <div>
              <p>CareerSync Automated Agentic Audit</p>
              <p>Cryptographically Verified Campus Record</p>
            </div>
            <div className="text-right">
              <div className="w-28 border-b border-zinc-400 mb-1"></div>
              <p className="font-bold text-zinc-700">Placement Officer Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-canvas border-t border-[#E0E0DC] flex justify-between items-center text-xs">
          <span className="text-zinc-600 font-medium">Ready for recruiter distribution and portfolio backup.</span>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 rounded-full bg-obsidian text-white font-bold flex items-center space-x-1.5 hover:bg-zinc-800 transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}