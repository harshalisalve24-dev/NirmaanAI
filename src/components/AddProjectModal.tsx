import { useState, useEffect } from "react";
import type { Project } from "../types/project";
import { saveProject } from "../services/projectService";
import { predictProjectRisk, type RiskPredictionResult } from "../services/apiService";
import { calculatePredictedCompletionDate } from "../utils/projectMetrics";

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

const MINISTRIES = [
  "Ministry of Road Transport and Highways",
  "Ministry of Railways",
  "Ministry of Housing and Urban Affairs",
  "Ministry of Power",
  "Ministry of Coal",
  "Ministry of Petroleum and Natural Gas",
  "Ministry of Ports, Shipping and Waterways",
  "Ministry of Civil Aviation",
  "Ministry of Water Resources",
  "Ministry of Telecommunication",
  "Ministry of Health and Family Welfare",
];

const SECTOR_DEFAULT_MINISTRY: Record<string, string> = {
  "Roads & Highways": "Ministry of Road Transport and Highways",
  "Railways": "Ministry of Railways",
  "Urban Public Transport": "Ministry of Housing and Urban Affairs",
  "Power": "Ministry of Power",
  "Coal": "Ministry of Coal",
  "Oil & Gas": "Ministry of Petroleum and Natural Gas",
  "Telecommunication": "Ministry of Telecommunication",
  "Water Resources": "Ministry of Water Resources",
  "Aviation & Aviation Infrastructure": "Ministry of Civil Aviation",
  "Healthcare": "Ministry of Health and Family Welfare",
};

const AGENCY_MAP: Record<string, string[]> = {
  "Roads & Highways": ["NHAI", "NHIDCL", "MoRTH / State PWD"],
  "Railways": ["Indian Railways", "RVNL", "DFCCIL", "IRCON International"],
  "Urban Public Transport": ["DMRC", "MMRDA", "Maha Metro", "BMRCL"],
  "Power": ["POWERGRID", "NTPC Limited", "NHPC Limited"],
  "Coal": ["Coal India Limited (CIL)", "SECL", "NCL", "MCL"],
  "Oil & Gas": ["ONGC", "GAIL (India) Limited", "IOCL", "BPCL"],
  "Telecommunication": ["BSNL", "MTNL"],
  "Water Resources": ["CWC", "State Water Resources Dept"],
  "Aviation & Aviation Infrastructure": ["AAI (Airports Authority of India)"],
  "Healthcare": ["HSCC", "HITES", "Ministry of Health"],
};

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionPreview, setPredictionPreview] = useState<RiskPredictionResult | null>(null);

  // Handle Sector Change -> Update Ministry & Agency defaults
  const handleSectorChange = (newSector: string) => {
    setSector(newSector);
    if (SECTOR_DEFAULT_MINISTRY[newSector]) {
      setMinistry(SECTOR_DEFAULT_MINISTRY[newSector]);
    }
    const agencies = AGENCY_MAP[newSector] ?? ["Default Agency"];
    setAgency(agencies[0]);
  };

  // Compute live prediction preview
  useEffect(() => {
    const cost = parseFloat(originalCost) || 0;
    const exp = parseFloat(expenditure) || 0;
    const prog = parseFloat(physicalProgress) || 0;
    if (cost <= 0 || !name.trim()) return;

    const expPct = (exp / cost) * 100;
    const remBudget = cost - exp;
    const gap = expPct - prog;

    const sDate = new Date(sanctionDate || "2023-01-01").getTime();
    const cDate = new Date(originalCompletion || "2026-12-31").getTime();
    const durationDays = Math.max(30, Math.round((cDate - sDate) / (1000 * 60 * 60 * 24)));

    const tempProject: Project = {
      id: "preview",
      projectCode: 999999,
      name: name.trim(),
      sector,
      ministry,
      agency,
      originalCost: cost,
      expenditure: exp,
      physicalProgress: prog,
      expenditurePercent: Math.round(expPct * 100) / 100,
      remainingBudget: Math.round(remBudget * 100) / 100,
      progressGap: Math.round(gap * 100) / 100,
      plannedDurationDays: durationDays,
      sanctionDate: sanctionDate || "2023-01-01",
      originalCompletion: originalCompletion || "2026-12-31",
      revisedCompletion: null,
      projectStage: prog < 30 ? "Early Stage" : prog < 80 ? "In Progress" : "Near Completion",
    };

    predictProjectRisk(tempProject)
      .then((res) => setPredictionPreview(res))
      .catch((err) => console.warn("[AddProjectModal] prediction preview error:", err));
  }, [name, sector, ministry, agency, originalCost, expenditure, physicalProgress, sanctionDate, originalCompletion]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 3 || cleanName.toLowerCase() === "ght") {
      setError("Please enter a valid Project Name (at least 3 characters).");
      return;
    }

    if (!projectCode.trim()) {
      setError("Please enter a valid Project Code.");
      return;
    }

    const cost = parseFloat(originalCost) || 0;
    const exp = parseFloat(expenditure) || 0;
    const prog = parseFloat(physicalProgress) || 0;

    if (cost <= 0) {
      setError("Original Cost must be greater than 0 ₹ Cr.");
      return;
    }
    if (exp < 0) {
      setError("Expenditure to date cannot be negative.");
      return;
    }
    if (prog < 0 || prog > 100) {
      setError("Physical Progress must be between 0% and 100%.");
      return;
    }

    setSaving(true);
    setError(null);

    const expPct = (exp / cost) * 100;
    const remBudget = cost - exp;
    const gap = expPct - prog;

    const sDate = new Date(sanctionDate || "2023-01-01").getTime();
    const cDate = new Date(originalCompletion || "2026-12-31").getTime();
    const durationDays = Math.max(30, Math.round((cDate - sDate) / (1000 * 60 * 60 * 24)));

    const codeNum = parseInt(projectCode, 10) || Math.floor(800000 + Math.random() * 100000);
    const docId = String(codeNum);

    const newProject: Project = {
      id: docId,
      projectCode: codeNum,
      name: cleanName,
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
      revisedCompletion: null,
      projectStage: prog < 30 ? "Early Stage" : prog < 80 ? "In Progress" : "Near Completion",
      risk: predictionPreview ? predictionPreview.risk_level : (gap > 20 ? "Critical" : gap > 5 ? "High" : gap > -10 ? "Medium" : "Low"),
      health: prog >= 100 ? "On Track" : (predictionPreview && predictionPreview.risk_score > 60 ? "At Risk" : "Watch"),
      predictedDelayMonths: predictionPreview?.predicted_delay_months,
      riskScore: predictionPreview?.risk_score,
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

  const availableAgencies = AGENCY_MAP[sector] ?? ["Default Agency"];
  const predictedAddlDelay = predictionPreview?.predicted_delay_months ?? 0;
  const predictedCompletionDateStr = calculatePredictedCompletionDate(originalCompletion, predictedAddlDelay);

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
                onChange={(e) => handleSectorChange(e.target.value)}
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
              <select
                value={ministry}
                onChange={(e) => setMinistry(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {MINISTRIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Implementing Agency *
              </label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {availableAgencies.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
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
                min="0.1"
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
                min="0"
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

          <div className="grid grid-cols-2 gap-3">
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
                Original Completion Date *
              </label>
              <input
                type="date"
                value={originalCompletion}
                onChange={(e) => setOriginalCompletion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          {/* AI Prediction Display Panel */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Live AI Risk & Schedule Prediction
                </span>
              </div>
              {predictionPreview && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    predictionPreview.risk_level === "Critical"
                      ? "bg-red-100 text-red-700"
                      : predictionPreview.risk_level === "High"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {predictionPreview.risk_level} Risk
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <div className="text-[10px] text-slate-500 font-medium">AI Predicted Completion</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{predictedCompletionDateStr}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <div className="text-[10px] text-slate-500 font-medium">Expected Additional Delay</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {predictionPreview ? `${predictionPreview.predicted_delay_months.toFixed(1)} months` : "Calculating…"}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <div className="text-[10px] text-slate-500 font-medium">Risk Score</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {predictionPreview ? `${predictionPreview.risk_score.toFixed(1)} / 100` : "Calculating…"}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <div className="text-[10px] text-slate-500 font-medium">Risk Level</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {predictionPreview ? predictionPreview.risk_level : "Calculating…"}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-blue-700/80 leading-relaxed pt-1">
              AI prediction based on historical infrastructure project patterns and current project inputs.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Uses 10 approved ML features for live FastAPI prediction.
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
