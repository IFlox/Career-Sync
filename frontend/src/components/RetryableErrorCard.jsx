import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function RetryableErrorCard({
  title = "Service Temporarily Unavailable",
  message = "Could not complete this request. Your saved progress has not been affected.",
  onRetry,
  isRetrying = false
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2.5xl bg-rose-50/80 border border-rose-200 text-rose-900 space-y-2.5">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <h4 className="font-bold text-xs">{title}</h4>
      </div>
      <p className="text-[11px] text-rose-800 leading-relaxed font-medium">{message}</p>
      {onRetry && (
        <div className="pt-1">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? "Retrying..." : "Try Again"}</span>
          </button>
        </div>
      )}
    </div>
  );
}