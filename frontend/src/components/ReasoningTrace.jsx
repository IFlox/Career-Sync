import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';

export default function ReasoningTrace({ traces = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <div className="bg-obsidian text-white rounded-2.5xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Toggle Bar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wide uppercase text-zinc-300">
              Agent Reasoning Trace
            </span>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-300">
              {traces.length} steps
            </span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
        </button>

        {/* Content Box */}
        {isExpanded && (
          <div className="px-4 pb-4 max-h-72 overflow-y-auto space-y-2 text-xs font-mono border-t border-white/10 pt-3">
            {traces.length === 0 ? (
              <p className="text-zinc-500 italic text-[11px]">System initialized. Waiting for student actions...</p>
            ) : (
              traces.map((trace, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                  <span className="text-zinc-500 shrink-0 font-mono">[{trace.timestamp}]</span>
                  <span className={`${
                    trace.type === 'error' ? 'text-rose-400' :
                    trace.type === 'sop' ? 'text-amber-400 font-semibold' :
                    trace.type === 'pii' ? 'text-emerald-400' :
                    'text-zinc-300'
                  }`}>
                    {trace.message}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}