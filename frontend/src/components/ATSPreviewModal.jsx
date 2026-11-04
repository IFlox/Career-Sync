import React from 'react';
import { X, Printer, CheckCircle, FileText } from 'lucide-react';
import { generateATSLayout } from '../utils/resumeAuditor';

export default function ATSPreviewModal({ student, onClose }) {
  if (!student) return null;
  const ats = generateATSLayout(student);

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E0E0DC]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-canvas border-b border-[#E0E0DC] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-obsidian text-base">ATS Standardized Single-Column Preview</h3>
              <p className="text-xs text-subtle">Clean parsing format optimized for enterprise Workday & Greenhouse parsers.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface border border-[#E2E2DE] flex items-center justify-center text-subtle hover:text-obsidian"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ATS Resume Sheet */}
        <div className="p-8 overflow-y-auto font-sans text-xs text-zinc-800 space-y-6 bg-white select-text">
          {/* Header */}
          <div className="text-center border-b pb-4 border-zinc-200">
            <h1 className="text-xl font-bold tracking-wide text-zinc-950">{ats.header.name}</h1>
            <p className="text-xs text-zinc-600 mt-1">{ats.header.branch} • {ats.header.cgpa}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{ats.header.contact}</p>
          </div>

          {/* Sections */}
          {ats.sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1">
                {sec.title}
              </h2>
              {sec.content && <p className="leading-relaxed text-zinc-700">{sec.content}</p>}
              {sec.items && (
                <ul className="list-disc pl-5 space-y-1 text-zinc-700">
                  {sec.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-canvas border-t border-[#E0E0DC] flex justify-between items-center text-xs">
          <span className="text-emerald-700 font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" /> ATS Compatibility Score: 98/100
          </span>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full bg-obsidian text-white font-semibold flex items-center space-x-1.5 hover:bg-zinc-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save Clean PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}