import React, { useState } from 'react';
import { 
  Users, CheckCircle2, XCircle, AlertTriangle, Download, 
  BarChart3, Clock, Search, ShieldCheck, ArrowUpRight 
} from 'lucide-react';
import { DEMO_PROFILES, TARGET_JOBS } from '../data/seedData';

export default function AdminPortal({ addTrace }) {
  const [students, setStudents] = useState(DEMO_PROFILES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("ALL");

  // Handle Human-in-the-Loop Placement Approval
  const handleToggleStatus = (id, newStatus) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        addTrace(`TPO Admin Action: Profile ${s.name} marked as '${newStatus}'`);
        return { ...s, adminStatus: newStatus };
      }
      return s;
    }));
  };

  // Export Verified Batch Data as CSV
  const handleExportCSV = () => {
    addTrace("TPO Admin Action: Exporting verified student batch CSV...");
    const verifiedOnly = students.filter(s => s.adminStatus === "Approved");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student ID,Name,Branch,CGPA,Quality Score,Top Verified Skills,TPO Status\n";

    verifiedOnly.forEach(s => {
      const skillsStr = `"${s.skills.join(", ")}"`;
      csvContent += `${s.id},"${s.name}","${s.branch}",${s.cgpa},${s.qualityScore},${skillsStr},${s.adminStatus}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CareerSync_Verified_Batch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cohort Analytics
  const avgScore = Math.round(students.reduce((acc, s) => acc + s.qualityScore, 0) / students.length);
  const highRiskCount = students.filter(s => s.cgpa < 6.0 || s.qualityScore < 45).length;
  const approvedCount = students.filter(s => s.adminStatus === "Approved").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-[#E6E6E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-subtle mb-1">
            <span className="font-semibold text-terracotta-500">Training & Placement Office (TPO)</span>
            <span>•</span>
            <span>Batch 2026 Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight">
            Placement Cell Analytics & Verification Matrix
          </h1>
          <p className="text-xs sm:text-sm text-subtle mt-1">
            Review candidate quality scores, enforce university SOP constraints, and publish verified cohorts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 rounded-full bg-obsidian text-white font-bold text-xs flex items-center space-x-2 hover:bg-zinc-800 transition-all shadow-xs"
        >
          <Download className="w-4 h-4 text-terracotta-500" />
          <span>Export Verified Batch (CSV)</span>
        </button>
      </div>

      {/* Cohort Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
          <span className="text-xs font-semibold text-subtle block">Average Cohort Score</span>
          <div className="text-3xl font-black text-obsidian mt-1">{avgScore}%</div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">↑ 12% increase post AI ATS optimization</p>
        </div>

        <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
          <span className="text-xs font-semibold text-subtle block">High-Risk Students</span>
          <div className="text-3xl font-black text-rose-600 mt-1">{highRiskCount}</div>
          <p className="text-[11px] text-rose-700 mt-1 font-medium">Requires mandatory remediation sessions</p>
        </div>

        <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs">
          <span className="text-xs font-semibold text-subtle block">Approved for Recruiter Drives</span>
          <div className="text-3xl font-black text-obsidian mt-1">
            {approvedCount} <span className="text-xs font-normal text-subtle">/ {students.length}</span>
          </div>
          <p className="text-[11px] text-subtle mt-1">Human-in-the-Loop review enforced</p>
        </div>
      </div>

      {/* Cohort Missing Skills Bar Chart */}
      <div className="bg-surface p-6 rounded-3xl border border-[#E6E6E3] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-terracotta-500" />
            <h3 className="font-bold text-obsidian text-base">Recurring Skill Gaps Across Cohort</h3>
          </div>
          <span className="text-xs text-subtle">Aggregated from active target roles</span>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { skill: "Docker & Containerization", pct: 67 },
            { skill: "System Design & Caching", pct: 54 },
            { skill: "RAG & Vector Retrieval", pct: 48 },
            { skill: "Kubernetes Orchestration", pct: 40 }
          ].map((bar, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-obsidian">
                <span>{bar.skill}</span>
                <span className="text-subtle font-mono">{bar.pct}% of cohort missing</span>
              </div>
              <div className="w-full h-3 bg-canvas rounded-full overflow-hidden border border-[#E0E0DC]">
                <div
                  className="h-full bg-terracotta-500 rounded-full transition-all duration-500"
                  style={{ width: `${bar.pct}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Verification Matrix Table */}
      <div className="bg-surface rounded-3xl border border-[#E6E6E3] shadow-xs overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#ECECE9] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-obsidian text-base">Student Verification Matrix</h3>
            <p className="text-xs text-subtle">TPO review gate: only verified candidates can be exported to company portals.</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidate or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-full bg-canvas border border-[#E0E0DC] text-obsidian focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-[#ECECE9] text-subtle font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Candidate</th>
                <th className="px-6 py-3">CGPA / Branch</th>
                <th className="px-6 py-3">CV Impact</th>
                <th className="px-6 py-3">SOP Violations & SLA</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Human-in-the-Loop Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECE9]">
              {students
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.branch.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((student) => {
                  const hasSlaEscalation = student.slaHoursPending > 48;
                  const hasCgpaRestriction = student.cgpa < 6.0;

                  return (
                    <tr key={student.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-obsidian block">{student.name}</span>
                        <span className="text-[10px] text-subtle font-mono">{student.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-obsidian block">{student.cgpa} / 10.0</span>
                        <span className="text-[10px] text-subtle">{student.branch}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-obsidian text-sm">{student.qualityScore}%</span>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        {hasSlaEscalation && (
                          <span className="inline-block text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                            SLA ESCALATION: Pending &gt; 48 Hrs
                          </span>
                        )}
                        {hasCgpaRestriction && (
                          <span className="inline-block text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            Restricted to Tier-2 (CGPA &lt; 6.0)
                          </span>
                        )}
                        {!hasSlaEscalation && !hasCgpaRestriction && (
                          <span className="text-[11px] text-emerald-700">✓ All SOP Rules Cleared</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          student.adminStatus === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : student.adminStatus === 'Revision Required'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {student.adminStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {student.adminStatus !== 'Approved' && (
                          <button
                            onClick={() => handleToggleStatus(student.id, 'Approved')}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {student.adminStatus !== 'Revision Required' && (
                          <button
                            onClick={() => handleToggleStatus(student.id, 'Revision Required')}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-surface text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                          >
                            Request Revision
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}