import React, { useState } from 'react';
import Navbar from './components/Navbar';
import StudentPortal from './components/StudentPortal';
import AdminPortal from './components/AdminPortal';
import ReasoningTrace from './components/ReasoningTrace';
import { Lock, X } from 'lucide-react';

export default function App() {
  const [activePortal, setActivePortal] = useState('student'); // 'student' | 'admin'
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [authError, setAuthError] = useState("");

  // Live Real-Time Agent Reasoning Log
  const [traces, setTraces] = useState([
    { timestamp: "10:14:02", type: "info", message: "CareerSync Agent initialized with deterministic taxonomy seeds." },
    { timestamp: "10:14:03", type: "pii", message: "PII Scrubber loaded: Email, Phone & Address regex masks armed." },
    { timestamp: "10:14:04", type: "sop", message: "University SOP Rules loaded: CGPA Guardrail (6.0) & Max Apps (3)." }
  ]);

  const addTrace = (message, type = 'info') => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setTraces(prev => [{ timestamp: timeStr, type, message }, ...prev]);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === "tpo_secure_2026") {
      setIsAdminLoggedIn(true);
      setIsAdminAuthModalOpen(false);
      setActivePortal('admin');
      setAuthError("");
      setAdminPin("");
      addTrace("TPO Authentication Successful. Switched to Administrative Matrix.", "sop");
    } else {
      setAuthError("Invalid Placement Cell PIN. Access Restricted.");
      addTrace("Unauthorized TPO Admin access attempt blocked.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-obsidian flex flex-col font-sans selection:bg-terracotta-100 selection:text-terracotta-700">
      {/* Top Navbar */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        setIsAdminAuthModalOpen={setIsAdminAuthModalOpen}
        isAdminLoggedIn={isAdminLoggedIn}
        traceCount={traces.length}
      />

      {/* Main Body */}
      <main className="flex-1 pb-16">
        {activePortal === 'student' ? (
          <StudentPortal addTrace={addTrace} />
        ) : (
          <AdminPortal addTrace={addTrace} />
        )}
      </main>

      {/* Collapsible Real-Time Agent Reasoning Trace Box */}
      <ReasoningTrace traces={traces} />

      {/* Secure TPO Admin Gateway Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E0E0DC] space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600">
                <Lock className="w-5 h-5" />
              </div>
              <button
                onClick={() => {
                  setIsAdminAuthModalOpen(false);
                  setAuthError("");
                }}
                className="text-subtle hover:text-obsidian"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-obsidian text-base">Placement Cell Admin Gateway</h3>
              <p className="text-xs text-subtle mt-0.5">Restricted to Training & Placement Officers (TPO).</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1">
                  Enter Security PIN / Password:
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Demo PIN: tpo_secure_2026"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none focus:ring-1 focus:ring-obsidian"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-[11px] font-semibold text-rose-600">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-obsidian text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
              >
                Unlock TPO Dashboard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}