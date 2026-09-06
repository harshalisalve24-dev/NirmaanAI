import { useState } from "react";
import type { Project } from "../types/project";
import { saveProject } from "../services/projectService";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newProject: Project) => void;
}

const SECTORS = [
  "Roads & Highways",
  "Railways",
  "Urban Public Transport",
  "Coal",
  "Power",
  "Oil & Gas",
  "Telecommunication",
  "Water Resources",
  "Aviation & Aviation Infrastructure",
  "Healthcare",
];

export default function AddProjectModal({
  isOpen,
  onClose,
  onSaved,
}: AddProjectModalProps) {
  const [projectCode, setProjectCode] = useState(
    Math.floor(800000 + Math.random() * 100000).toString()
  );
  const [name, setName] = useState("");
  const [sector, setSector] = useState("Roads & Highways");
  const [ministry, setMinistry] = useState("Ministry of Road Transport and Highways");
  const [agency, setAgency] = useState("NHAI");
  const [originalCost, setOriginalCost] = useState("250.0");
  const [expenditure, setExpenditure] = useState("75.0");
  const [physicalProgress, setPhysicalProgress] = useState("25");
  const [sanctionDate, setSanctionDate] = useState("2023-01-15");
  const [originalCompletion, setOriginalCompletion] = useState("2026-12-31");
  const [revisedCompletion, setRevisedCompletion] = useState("");
  const [revisedCost, setRevisedCost] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectCode.trim()) {
      setError("Please fill out Project Code and Project Name.");
      return;
    }

    const cost = parseFloat(originalCost) || 0;
    const exp = parseFloat(expenditure) || 0;
    const prog = parseFloat(physicalProgress) || 0;

    if (cost <= 0) {
      setError("Original Cost must be greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);

    const expPct = (exp / cost) * 100;
    const remBudget = cost - exp;
    const gap = expPct - prog; // Expenditure % - Physical Progress %

    // Compute planned duration in days
    const sDate = new Date(sanctionDate || "2023-01-01").getTime();
    const cDate = new Date(originalCompletion || "2026-12-31").getTime();
    const durationDays = Math.max(30, Math.round((cDate - sDate) / (1000 * 60 * 60 * 24)));

    const codeNum = parseInt(projectCode, 10) || Math.floor(800000 + Math.random() * 100000);
    const docId = String(codeNum);

    const newProject: Project = {
      id: docId,
      projectCode: codeNum,
      name: name.trim(),
      sector: sector.trim(),
      ministry: ministry.trim(),
      agency: agency.trim(),
      originalCost: cost,
      expenditure: exp,
      physicalProgress: prog,
      expenditurePercent: Math.round(expPct * 100) / 100,
      remainingBudget: Math.round(remBudget * 100) / 100,
      progressGap: Math.round(gap * 100) / 100,
      plannedDurationDays: durationDays,
      sanctionDate: sanctionDate || "2023-01-01",
      originalCompletion: originalCompletion || "2026-12-31",
      revisedCompletion: revisedCompletion ? revisedCompletion : null,
      revisedCost: revisedCost ? parseFloat(revisedCost) : null,
      projectStage: prog < 30 ? "Early Stage" : prog < 80 ? "In Progress" : "Near Completion",
      risk: gap > 20 ? "Critical" : gap > 5 ? "High" : gap > -10 ? "Medium" : "Low",
      health: prog >= 100 ? "On Track" : gap > 15 ? "Critical" : "Watch",
      riskFactors: [],
      milestones: [
        { name: "Sanction & Approval", status: "Completed", date: sanctionDate },
        { name: "Site Mobilization", status: "Completed", date: sanctionDate },
        { name: "Main Implementation Phase", status: "In Progress", date: originalCompletion },
      ],
    };

    try {
      await saveProject(newProject);
      onSaved(newProject);
      onClose();
    } catch (err: any) {
      console.error("[AddProjectModal] save error:", err);
      setError("Failed to save new project to Firestore.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="font-display font-bold text-base">Add New Infrastructure Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Code (ID) *
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 font-mono"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                placeholder="e.g. NH 44 Expressway Expansion"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Line Ministry *
              </label>
              <input
                type="text"
                value={ministry}
                onChange={(e) => setMinistry(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Implementing Agency *
              </label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Original Cost (₹ Cr) *
              </label>
              <input
                type="number"
                step="0.01"
                value={originalCost}
                onChange={(e) => setOriginalCost(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expenditure to Date (₹ Cr) *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenditure}
                onChange={(e) => setExpenditure(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical Progress (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={physicalProgress}
                onChange={(e) => setPhysicalProgress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sanction Date *
              </label>
              <input
                type="date"
                value={sanctionDate}
                onChange={(e) => setSanctionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Original Deadline *
              </label>
              <input
                type="date"
                value={originalCompletion}
                onChange={(e) => setOriginalCompletion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Revised Deadline (Optional)
              </label>
              <input
                type="date"
                value={revisedCompletion}
                onChange={(e) => setRevisedCompletion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Includes all 10 approved ML features for live FastAPI risk prediction.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors"
                style={{ background: "#2563eb" }}
              >
                {saving ? "Saving..." : "Save Project"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
