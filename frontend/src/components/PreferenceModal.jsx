import React, { useState } from 'react';
import { X, Sliders, Check, Clock, Briefcase, MapPin, Code2 } from 'lucide-react';

const ROLES_OPTIONS = [
  "AI Systems & RAG Engineer",
  "Distributed Backend Developer",
  "Cloud Infrastructure & DevOps Architect",
  "Applied Data Scientist & ML Engineer"
];

const LOCATIONS_OPTIONS = ["Bangalore", "Pune", "Hyderabad", "Delhi NCR", "Remote"];
const INDUSTRIES_OPTIONS = ["Enterprise AI", "FinTech", "SaaS", "E-Commerce", "HealthTech"];

export default function PreferenceModal({ preferences, onSave, onClose }) {
  const [form, setForm] = useState({
    preferred_roles: preferences?.preferred_roles || ["AI Systems & RAG Engineer"],
    preferred_locations: preferences?.preferred_locations || ["Bangalore", "Remote"],
    preferred_industries: preferences?.preferred_industries || ["Enterprise AI", "FinTech"],
    target_technologies: preferences?.target_technologies || ["Python", "FastAPI", "Docker"],
    min_expected_ctc_lpa: preferences?.min_expected_ctc_lpa || 6.5,
    learning_style: preferences?.learning_style || "PROJECT_BASED",
    available_hours_per_week: preferences?.available_hours_per_week || 10
  });
  const [isSaving, setIsSaving] = useState(false);

  const toggleArrayItem = (key, item) => {
    setForm(prev => {
      const arr = prev[key] || [];
      const updated = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
      return { ...prev, [key]: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E0E0DC]">
        {/* Header */}
        <div className="px-6 py-4 bg-canvas border-b border-[#E0E0DC] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-terracotta-50 flex items-center justify-center text-terracotta-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-obsidian text-base">Career & Learning Preferences</h3>
              <p className="text-xs text-subtle">Personalizes matching, roadmap pace, and practice interviews.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-subtle hover:text-obsidian hover:bg-[#EAEAEA]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Target Roles */}
          <div className="space-y-2">
            <label className="font-bold text-obsidian flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Target Role Focus:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES_OPTIONS.map((role, idx) => {
                const isSelected = form.preferred_roles.includes(role);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleArrayItem("preferred_roles", role)}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      isSelected
                        ? 'bg-obsidian text-white'
                        : 'bg-canvas text-obsidian border border-[#E0E0DC] hover:border-terracotta-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <label className="font-bold text-obsidian flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Preferred Locations:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LOCATIONS_OPTIONS.map((loc, idx) => {
                const isSelected = form.preferred_locations.includes(loc);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleArrayItem("preferred_locations", loc)}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      isSelected
                        ? 'bg-terracotta-500 text-white'
                        : 'bg-canvas text-obsidian border border-[#E0E0DC] hover:border-terracotta-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Learning Style */}
          <div className="space-y-2">
            <label className="font-bold text-obsidian flex items-center space-x-1.5">
              <Code2 className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Learning & Preparation Style:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "PROJECT_BASED", label: "Project-Based", desc: "Build mini-systems" },
                { id: "VIDEO_LECTURES", label: "Video Modules", desc: "NPTEL / Coursera" },
                { id: "DOCS_READING", label: "Documentation", desc: "Official dev guides" }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, learning_style: style.id }))}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    form.learning_style === style.id
                      ? 'bg-terracotta-50 border-terracotta-400 text-obsidian'
                      : 'bg-canvas border-[#E0E0DC] text-subtle hover:text-obsidian'
                  }`}
                >
                  <span className="font-bold block text-obsidian">{style.label}</span>
                  <span className="text-[10px] text-subtle">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Available Hours */}
          <div className="space-y-2 bg-canvas p-4 rounded-2xl border border-[#E0E0DC]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-obsidian flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-terracotta-500" />
                <span>Available Study Time:</span>
              </label>
              <span className="font-bold text-terracotta-600 bg-surface px-2.5 py-0.5 rounded-full border border-[#E0E0DC]">
                {form.available_hours_per_week} Hours / Week
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={form.available_hours_per_week}
              onChange={(e) => setForm(prev => ({ ...prev, available_hours_per_week: parseInt(e.target.value) }))}
              className="w-full accent-terracotta-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-subtle">
              <span>Light (3h/wk)</span>
              <span>Moderate (10h/wk)</span>
              <span>Intensive (25h/wk)</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#E0E0DC] text-subtle hover:text-obsidian font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-full bg-obsidian text-white font-bold hover:bg-zinc-800 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}