import React from 'react';
import { Lock, UserCheck, LogOut, RotateCcw } from 'lucide-react';

export default function Navbar({
  activePortal,
  setActivePortal,
  setIsAdminAuthModalOpen,
  isAdminLoggedIn,
  onAdminLogout,
  onResetWorkspace,
  isResettingWorkspace,
  traceCount
}) {
  return (
    <header className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-md border-b border-[#E6E6E3] px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePortal('student')}>
          <div className="w-10 h-10 rounded-2xl bg-obsidian flex items-center justify-center text-white font-bold text-lg shadow-sm">
            №
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-obsidian">CareerSync</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-600 border border-terracotta-100">
                Institutional Edition
              </span>
            </div>
            <p className="text-xs text-subtle hidden sm:block">Intelligent Placement & Career Readiness</p>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-subtle">
          <div className="flex items-center space-x-1.5 bg-surface px-3 py-1.5 rounded-full border border-[#E8E8E4] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-obsidian">Privacy Shield</span>
            <span className="text-emerald-700 font-semibold">Active</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-surface px-3 py-1.5 rounded-full border border-[#E8E8E4] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-terracotta-500"></span>
            <span>Live Analysis:</span>
            <span className="font-semibold text-obsidian">{traceCount} actions verified</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Sprint 3: Reset Workspace Action */}
          <button
            onClick={onResetWorkspace}
            disabled={isResettingWorkspace}
            className="px-3 py-2 rounded-full bg-surface hover:bg-[#EAEAEA] border border-[#E2E2DE] text-xs font-semibold text-subtle hover:text-obsidian flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Reset demo candidates and applications to baseline seed states"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingWorkspace ? 'animate-spin text-terracotta-500' : ''}`} />
            <span className="hidden sm:inline">{isResettingWorkspace ? "Resetting..." : "Reset Workspace"}</span>
          </button>

          <button
            onClick={() => setActivePortal('student')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activePortal === 'student'
                ? 'bg-obsidian text-white shadow-sm'
                : 'bg-surface text-obsidian hover:bg-cardMuted border border-[#E2E2DE]'
            }`}
          >
            Student Portal
          </button>

          {isAdminLoggedIn ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActivePortal('admin')}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activePortal === 'admin'
                    ? 'bg-terracotta-500 text-white shadow-sm'
                    : 'bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100 border border-terracotta-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Placement Office</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="p-2 rounded-full bg-surface hover:bg-rose-50 text-subtle hover:text-rose-600 border border-[#E2E2DE] transition-all"
                title="Sign out of Administrative Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdminAuthModalOpen(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 bg-surface text-subtle hover:text-obsidian hover:bg-cardMuted border border-[#E2E2DE] transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-subtle" />
              <span>Officer Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}