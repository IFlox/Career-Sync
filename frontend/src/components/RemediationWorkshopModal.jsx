import React from 'react';
import { X, Printer, Sparkles, BookOpen, Clock, Users, Award, CheckCircle2 } from 'lucide-react';

export default function RemediationWorkshopModal({ syllabus, onClose }) {
  if (!syllabus) return null;

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E0E0DC]">
        {/* Header */}
        <div className="px-6 py-4 bg-canvas border-b border-[#E0E0DC] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-obsidian text-base">{syllabus.bootcamp_title || "Campus Technical Bootcamp"}</h3>
              <p className="text-xs text-subtle">{syllabus.target_cohort || "Targeting Recurring Placement Gaps"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-subtle hover:text-obsidian hover:bg-[#EAEAEA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Syllabus Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs bg-white">
          {/* Day Cards */}
          <div className="space-y-4">
            {(syllabus.days || []).map((day, idx) => (
              <div key={idx} className="p-4 rounded-2.5xl bg-canvas border border-[#E2E2DE] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-2.5 py-0.5 rounded-full border border-terracotta-100">
                    Day {day.day_number} • {day.estimated_hours} Hours Intensive
                  </span>
                  <span className="text-xs font-semibold text-subtle flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-terracotta-500" />
                    <span>Lab Included</span>
                  </span>
                </div>

                <h4 className="font-bold text-obsidian text-sm">{day.theme}</h4>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-700 block">Core Architecture Topics:</span>
                  <ul className="list-disc pl-5 text-zinc-600 space-y-0.5">
                    {(day.topics || []).map((top, i) => (
                      <li key={i}>{top}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-surface border border-[#E0E0DC] text-zinc-800">
                  <span className="font-bold text-terracotta-700 block text-[11px] mb-0.5">🛠️ Hands-on Lab Exercise:</span>
                  <p className="text-[11px]">{day.hands_on_lab}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mentors & Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-1">
              <span className="font-bold text-obsidian flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-terracotta-500" />
                <span>Recommended Mentors:</span>
              </span>
              <p className="text-zinc-600">{(syllabus.recommended_mentors || []).join(", ") || "Technical Faculty & Alumni"}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-canvas border border-[#E2E2DE] space-y-1">
              <span className="font-bold text-obsidian flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-terracotta-500" />
                <span>Assessment Benchmark:</span>
              </span>
              <p className="text-zinc-600">{syllabus.exit_assessment_criteria || "80%+ score on practical system viva."}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-canvas border-t border-[#E0E0DC] flex justify-between items-center text-xs">
          <span className="text-emerald-700 font-medium flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Verified Institutional Training Curriculum
          </span>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full bg-obsidian text-white font-semibold flex items-center space-x-1.5 hover:bg-zinc-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bootcamp Syllabus</span>
          </button>
        </div>
      </div>
    </div>
  );
}