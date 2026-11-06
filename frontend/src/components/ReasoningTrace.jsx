import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Cpu, CheckCircle2, Clock } from 'lucide-react';

export default function ReasoningTrace({ executionSteps = [], totalLatency = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg w-full px-4 sm:px-0">
      <div className="bg-obsidian text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Toggle Bar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-extrabold tracking-wider uppercase text-zinc-200">
              Agent Execution Graph (DAG)
            </span>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-zinc-300">
              {totalLatency ? `${totalLatency} ms` : 'Active'}
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
        </button>

        {/* Trace Flow */}
        {isExpanded && (
          <div className="px-5 pb-5 max-h-80 overflow-y-auto space-y-3 border-t border-white/10 pt-4 text-xs font-mono">
            {executionSteps.length === 0 ? (
              <p className="text-zinc-500 italic text-[11px]">System ready. Upload a resume or run an interview to observe live reasoning loops.</p>
            ) : (
              executionSteps.map((step, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{step.step}</span>
                    </span>
                    <span className="text-zinc-400 text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">
                      {step.duration_ms} ms
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-300 flex items-center space-x-2">
                    <span className="text-terracotta-400">Tool: {step.tool}</span>
                    <span>•</span>
                    <span className="text-zinc-400 truncate">{step.output_summary}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}