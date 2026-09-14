import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProjectsCached } from "../services/projectService";
import { predictProjectsRiskBatch, type RiskPredictionResult } from "../services/apiService";

interface PriorityQueueProps {
  navigate: (s: Screen, project?: string, filter?: string) => void;
  initialRiskFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const RISKS = ["All", "Critical", "High", "Med / Low", "Medium", "Low"];

const riskColors: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  "Med / Low": "#16a34a",
  Medium: "#d97706",
  Low: "#16a34a",
};

export default function PriorityQueue({
  navigate,
  initialRiskFilter = "All",
  onFilterChange,
}: PriorityQueueProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [predictions, setPredictions] = useState<Map<string, RiskPredictionResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState(initialRiskFilter);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [ministryFilter, setMinistryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"priority" | "predictedDelayMonths" | "physicalProgress">("priority");

  useEffect(() => {
    setRiskFilter(initialRiskFilter);
  }, [initialRiskFilter]);

  const handleRiskFilterChange = (f: string) => {
    setRiskFilter(f);
    if (onFilterChange) onFilterChange(f);
  };

  useEffect(() => {
    getProjectsCached()
      .then(async (all) => {
        setProjects(all);
        setLoading(false);

        // Fetch predictions from FastAPI (uses in-memory session cache)
        try {
          const predMap = await predictProjectsRiskBatch(all);
          setPredictions(predMap);
        } catch (err) {
          console.warn("[PriorityQueue] predictions fetch error:", err);
        }
      })
      .catch((err) => {
        console.error("[PriorityQueue] load failed:", err);
        setLoading(false);
      });
  }, []);

  // Build dynamic filter options from actual data
  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.sector))).sort()],
    [projects]
  );
  const ministries = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.ministry))).sort()],
    [projects]
  );

  const filtered = useMemo(() => {
    return projects
      .filter((p) => {
        const pred = predictions.get(p.id);
        const effectiveRisk = pred?.risk_level ?? p.risk ?? "Medium";

        if (riskFilter === "Critical" && effectiveRisk !== "Critical") return false;
        if (riskFilter === "High" && effectiveRisk !== "High") return false;
        if (riskFilter === "Medium" && effectiveRisk !== "Medium") return false;
        if (riskFilter === "Low" && effectiveRisk !== "Low") return false;
        if (riskFilter === "Med / Low" && effectiveRisk !== "Medium" && effectiveRisk !== "Low") return false;
        if (sectorFilter !== "All" && p.sector !== sectorFilter) return false;
        if (ministryFilter !== "All" && p.ministry !== ministryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const predA = predictions.get(a.id);
        const predB = predictions.get(b.id);

        if (sortBy === "predictedDelayMonths") {
          const delayA = predA?.predicted_delay_months ?? a.actualDelayMonths ?? 0;
          const delayB = predB?.predicted_delay_months ?? b.actualDelayMonths ?? 0;
          return delayB - delayA;
        }
        if (sortBy === "physicalProgress") return a.physicalProgress - b.physicalProgress;
        
        // Default "priority" = sort descending by FastAPI Risk Score (0-100)
        const scoreA = predA?.risk_score ?? 0;
        const scoreB = predB?.risk_score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Fallback to progress gap if risk score equal or unavailable
        return a.progressGap - b.progressGap;
      });
  }, [projects, predictions, riskFilter, sectorFilter, ministryFilter, sortBy]);

  const pageTitle =
    riskFilter === "Critical"
      ? `Critical Projects (${filtered.length})`
      : riskFilter === "High"
      ? `High Risk Projects (${filtered.length})`
      : riskFilter === "Med / Low"
      ? `Med / Low Risk Projects (${filtered.length})`
      : riskFilter !== "All"
      ? `${riskFilter} Risk Projects (${filtered.length})`
      : `All Projects (${filtered.length})`;

  return (
    <div className="min-h-full bg-slate-50 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-slate-900 text-xl">{pageTitle}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${projects.length} projects · Ranked by urgency and risk severity`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Sort by:</span>
            {(["priority", "predictedDelayMonths", "physicalProgress"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                style={{
                  background: sortBy === s ? "#2563eb" : "#f1f5f9",
                  color: sortBy === s ? "white" : "#64748b",
                }}
              >
                {s === "priority" ? "AI Risk Score" : s === "predictedDelayMonths" ? "Predicted Delay" : "Progress"}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <FilterGroup label="Risk" options={RISKS} value={riskFilter} onChange={handleRiskFilterChange} accentMap={riskColors} />
          <FilterGroup label="Sector" options={sectors} value={sectorFilter} onChange={setSectorFilter} />
          <FilterGroup label="Ministry" options={ministries.slice(0, 8)} value={ministryFilter} onChange={setMinistryFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-5">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading projects from Firestore…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100" style={{ background: "#f8fafc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Sector</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">AI Risk Score</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Predicted Delay</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Progress</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Stage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const pred = predictions.get(p.id);
                  const effectiveRisk = pred?.risk_level ?? p.risk ?? "Medium";
                  const delayVal = pred
                    ? (pred.predicted_delay_months > 0 ? `${pred.predicted_delay_months.toFixed(1)} mo` : "On Schedule")
                    : (p.actualDelayMonths != null ? `${p.actualDelayMonths.toFixed(1)} mo` : "—");

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate("project-overview", p.id)}
                      className="border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 text-xs text-slate-400 font-medium">{i + 1}</td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{p.ministry} · {p.agency}</div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{p.sector}</span>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                          style={{
                            background: riskColors[effectiveRisk] + "18",
                            color: riskColors[effectiveRisk],
                            border: `1px solid ${riskColors[effectiveRisk]}30`,
                          }}
                          title={pred ? `Composite Risk Score: ${pred.risk_score.toFixed(1)}` : undefined}
                        >
                          <span>{effectiveRisk}</span>
                          {pred && <span className="opacity-80">({pred.risk_score.toFixed(0)})</span>}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="font-bold text-sm" style={{ color: riskColors[effectiveRisk] }}>
                          {delayVal}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.physicalProgress}%`,
                                background: p.physicalProgress < 40 ? "#dc2626" : p.physicalProgress < 70 ? "#d97706" : "#16a34a",
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8 flex-shrink-0">{p.physicalProgress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-xs text-slate-500">{p.projectStage}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No projects match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
  accentMap,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentMap?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {options.map((o) => {
          const active = value === o;
          const accent = accentMap?.[o];
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: active ? (accent ? accent + "18" : "#eff6ff") : "#f1f5f9",
                color: active ? (accent || "#2563eb") : "#94a3b8",
                border: active ? `1px solid ${accent ? accent + "40" : "#bfdbfe"}` : "1px solid transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
