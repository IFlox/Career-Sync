import React, { useState } from 'react';
import Navbar from './components/Navbar';
import StudentPortal from './components/StudentPortal';
import AdminPortal from './components/AdminPortal';
import ReasoningTrace from './components/ReasoningTrace';
import { Lock, X } from 'lucide-react';

export default function App() {
  const [activePortal, setActivePortal] = useState('student');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [authError, setAuthError] = useState("");

  const [executionSteps, setExecutionSteps] = useState([
    { step: "System Initialized", tool: "FastAPI Engine", duration_ms: 12.4, status: "success", output_summary: "Ready for student sessions" },
    { step: "Privacy Protection Active", tool: "Regex Engine", duration_ms: 2.1, status: "success", output_summary: "Personal details hidden" },
    { step: "College Rules Loaded", tool: "Policy Engine", duration_ms: 1.8, status: "success", output_summary: "Eligibility rules ready" }
  ]);
  const [totalLatency, setTotalLatency] = useState(16.3);

  const handleExecutionUpdate = (steps, latency) => {
    setExecutionSteps(steps);
    setTotalLatency(latency);
  };

  const addTrace = (message, type = 'info') => {
    // Basic log hook
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === "tpo_secure_2026") {
      setIsAdminLoggedIn(true);
      setIsAdminAuthModalOpen(false);
      setActivePortal('admin');
      setAuthError("");
      setAdminPin("");
    } else {
      setAuthError("Incorrect password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-obsidian flex flex-col font-sans selection:bg-terracotta-100 selection:text-terracotta-700">
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        setIsAdminAuthModalOpen={setIsAdminAuthModalOpen}
        isAdminLoggedIn={isAdminLoggedIn}
        traceCount={executionSteps.length}
      />

      <main className="flex-1 pb-16">
        {activePortal === 'student' ? (
          <StudentPortal
            addTrace={addTrace}
            onExecutionUpdate={handleExecutionUpdate}
          />
        ) : (
          <AdminPortal addTrace={addTrace} />
        )}
      </main>

      <ReasoningTrace
        executionSteps={executionSteps}
        totalLatency={totalLatency}
      />

      {/* Admin Login Popup */}
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
              <h3 className="font-bold text-obsidian text-base">Admin Login</h3>
              <p className="text-xs text-subtle mt-0.5">Enter password to access admin dashboard.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Demo Password: tpo_secure_2026"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none focus:ring-1 focus:ring-obsidian"
                autoFocus
              />

              {authError && (
                <p className="text-[11px] font-semibold text-rose-600">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-obsidian text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
              >
                Sign In to Admin
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}