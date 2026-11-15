import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import RetryableErrorCard from './RetryableErrorCard';

const TONES = {
  success: {
    role: 'status',
    wrapper: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600'
  },
  info: {
    role: 'status',
    wrapper: 'bg-canvas border-[#E0E0DC] text-obsidian',
    icon: Info,
    iconClass: 'text-terracotta-500'
  }
};

export default function InlineFeedback({
  variant = 'success',
  title,
  message,
  onRetry,
  isRetrying = false,
  onDismiss,
  className = ''
}) {
  if (!title && !message) return null;

  if (variant === 'error') {
    return (
      <div role="alert" className={className}>
        <RetryableErrorCard
          title={title}
          message={message}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  const tone = TONES[variant] || TONES.info;
  const Icon = tone.icon;

  return (
    <div
      role={tone.role}
      aria-live="polite"
      className={`flex items-start justify-between gap-3 rounded-2.5xl border px-4 py-3 ${tone.wrapper} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`} />
        <div className="min-w-0">
          {title && <p className="text-xs font-bold">{title}</p>}
          {message && <p className="break-words text-[11px] font-medium leading-relaxed">{message}</p>}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded-full p-1 hover:bg-black/5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
