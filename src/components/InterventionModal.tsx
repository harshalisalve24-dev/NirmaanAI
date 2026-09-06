import { useState } from "react";
import type { Project, Intervention } from "../types/project";
import { addInterventionToProject } from "../services/projectService";

interface InterventionModalProps {
  isOpen?: boolean;
  project: Project;
  initialAction?: string;
  actionTitle?: string;
  onClose: () => void;
  onSaved: (updatedProject: Project) => void;
}

export default function InterventionModal({
  isOpen = true,
  project,
  initialAction,
  actionTitle,
  onClose,
  onSaved,
}: InterventionModalProps) {
  const defaultAction = actionTitle || initialAction || "Expedite Procurement";
  const [action, setAction] = useState(defaultAction);
  const [department, setDepartment] = useState("Infrastructure Monitoring Cell");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [reason, setReason] = useState(
    `Addressing schedule delay (${project.actualDelayMonths ?? 0} mo) and progress variance.`
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim() || !department.trim()) {
      setError("Please fill out Action Title and Responsible Department.");
      return;
    }

    setSaving(true);
    setError(null);

    const newIntervention: Intervention = {
      id: `int_${Date.now()}`,
      action: action.trim(),
      department: department.trim(),
      deadline: deadline || new Date().toISOString().split("T")[0],
      reason: reason.trim(),
      status: "Assigned",
      createdAt: new Date().toISOString(),
    };

    try {
      const updated = await addInterventionToProject(project.id, newIntervention);
      if (updated) {
        onSaved(updated);
        onClose();
      } else {
        setError("Failed to save intervention. Project not found.");
      }
    } catch (err: any) {
      console.error("[InterventionModal] save error:", err);
      setError("Error saving intervention to Firestore.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="font-display font-bold text-base">Create AI Recommended Intervention</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
            Target Project: <strong className="text-slate-800">{project.name}</strong> ({project.agency})
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Intervention / Action Title *
            </label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              placeholder="e.g. Expedite Procurement"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsible Officer / Dept *
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                placeholder="e.g. Chief Engineer / Ministry Cell"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Completion Deadline *
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justification & Action Plan
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              placeholder="Describe intervention scope and target milestones..."
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Initial Status: <strong className="text-blue-600">Assigned</strong>
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
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5"
                style={{ background: "#2563eb" }}
              >
                {saving ? "Saving..." : "Create Intervention"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
