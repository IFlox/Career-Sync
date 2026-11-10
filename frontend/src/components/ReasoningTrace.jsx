import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, CheckCircle2 } from 'lucide-react';

export default function ReasoningTrace({ executionSteps = [], totalLatency = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full px-4 sm:px-0">
      <div className="bg-obsidian text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Toggle Bar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-300">
              System Activity Log
            </span>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-zinc-400">
              Operational
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
        </button>

        {/* Event List */}
        {isExpanded && (
          <div className="px-5 pb-4 max-h-72 overflow-y-auto space-y-2 border-t border-white/10 pt-3 text-xs font-mono">
            {executionSteps.length === 0 ? (
              <p className="text-zinc-500 italic text-[11px]">System ready. Actions will appear here as you interact with the portal.</p>
            ) : (
              executionSteps.map((step, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{step.step}</span>
                    </span>
                    <span className="text-zinc-500 text-[10px] font-mono">
                      Completed
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {step.output_summary}
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