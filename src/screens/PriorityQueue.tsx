import { useState, useEffect, useMemo } from "react";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProjectsCached } from "../services/projectService";

const RISKS = ["All", "Critical", "High", "Medium", "Low"];

const riskColors: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#d97706",
  Low: "#16a34a",
};

export default function PriorityQueue({ navigate }: { navigate: (s: Screen, project?: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [ministryFilter, setMinistryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"priority" | "actualDelayMonths" | "physicalProgress">("priority");

  useEffect(() => {
    getProjectsCached()
      .then((all) => {
        // Pre-sort by risk then progressGap to establish base priority
        const riskOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        const sorted = [...all].sort((a, b) => {
          const rA = riskOrder[a.risk ?? "Low"] ?? 3;
          const rB = riskOrder[b.risk ?? "Low"] ?? 3;
          if (rA !== rB) return rA - rB;
          return a.progressGap - b.progressGap;
        });
        setProjects(sorted);
      })
      .catch((err) => console.error("[PriorityQueue] load failed:", err))
      .finally(() => setLoading(false));
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
        if (riskFilter !== "All" && p.risk !== riskFilter) return false;
        if (sectorFilter !== "All" && p.sector !== sectorFilter) return false;
        if (ministryFilter !== "All" && p.ministry !== ministryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "actualDelayMonths") {
          return (b.actualDelayMonths ?? 0) - (a.actualDelayMonths ?? 0);
        }
        if (sortBy === "physicalProgress") return a.physicalProgress - b.physicalProgress;
        // "priority" = current sorted order (risk + gap)
        return 0;
      });
  }, [projects, riskFilter, sectorFilter, ministryFilter, sortBy]);

  return (
    <div className="min-h-full bg-slate-50 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-slate-900 text-xl">Priority Queue</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${projects.length} projects · Ranked by urgency and risk severity`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Sort by:</span>
            {(["priority", "actualDelayMonths", "physicalProgress"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                style={{
                  background: sortBy === s ? "#2563eb" : "#f1f5f9",
                  color: sortBy === s ? "white" : "#64748b",
                }}
              >
                {s === "priority" ? "Priority" : s === "actualDelayMonths" ? "Delay" : "Progress"}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <FilterGroup label="Risk" options={RISKS} value={riskFilter} onChange={setRiskFilter} accentMap={riskColors} />
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
              Loading 182 projects from Firestore…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100" style={{ background: "#f8fafc" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Sector</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Risk</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Delay (mo)</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Progress</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Stage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
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
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background: riskColors[p.risk ?? "Medium"] + "18",
                          color: riskColors[p.risk ?? "Medium"],
                          border: `1px solid ${riskColors[p.risk ?? "Medium"]}30`,
                        }}
                      >
                        {p.risk ?? "Medium"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-bold text-sm" style={{ color: riskColors[p.risk ?? "Medium"] }}>
                        {p.actualDelayMonths != null ? `${p.actualDelayMonths.toFixed(1)} mo` : "—"}
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
                ))}
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
