import React from 'react';
import { Lock, UserCheck, LogOut } from 'lucide-react';

export default function Navbar({
  activePortal,
  setActivePortal,
  setIsAdminAuthModalOpen,
  isAdminLoggedIn,
  onAdminLogout
}) {
  return (
    <header className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-md border-b border-[#E6E6E3] px-4 sm:px-6 py-3 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        {/* Brand */}
        <div
          className="flex min-w-0 items-center space-x-2.5 sm:space-x-3 cursor-pointer"
          onClick={() => setActivePortal('student')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-2xl bg-obsidian flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm">
            №
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-obsidian truncate">CareerSync</span>
              <span className="hidden sm:inline-flex shrink-0 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-600 border border-terracotta-100 whitespace-nowrap">
                Institutional Edition
              </span>
            </div>
            <p className="text-xs text-subtle hidden sm:block truncate">Intelligent Placement & Career Readiness</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
          <button
            onClick={() => setActivePortal('student')}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activePortal === 'student'
                ? 'bg-obsidian text-white shadow-sm'
                : 'bg-surface text-obsidian hover:bg-cardMuted border border-[#E2E2DE]'
            }`}
          >
            Student Portal
          </button>

          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActivePortal('admin')}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                  activePortal === 'admin'
                    ? 'bg-terracotta-500 text-white shadow-sm'
                    : 'bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100 border border-terracotta-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Placement Office</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="p-2 rounded-full bg-surface hover:bg-rose-50 text-subtle hover:text-rose-600 border border-[#E2E2DE] transition-all"
                title="Sign out of Administrative Portal"
                aria-label="Sign out of Administrative Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdminAuthModalOpen(true)}
              className="px-3 sm:px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 bg-surface text-subtle hover:text-obsidian hover:bg-cardMuted border border-[#E2E2DE] whitespace-nowrap transition-all"
            >
              <Lock className="w-3.5 h-3.5 shrink-0 text-subtle" />
              <span>Officer Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}