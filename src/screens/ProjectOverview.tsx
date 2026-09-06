import { useState, useEffect } from "react";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProject } from "../services/projectService";

// ── Display helpers ──────────────────────────────────────────────────────────

function fmtCr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function fmtDelay(months: number | null | undefined): string {
  if (months == null || months <= 0) return "On Schedule";
  return `${months.toFixed(1)} months`;
}

// Build display object that matches the JSX field references
function toDisplay(p: Project) {
  const targetProgress = p.physicalProgress - p.progressGap; // progressGap is negative when behind
  return {
    name: p.name,
    sector: p.sector,
    ministry: p.ministry,
    agency: p.agency,
    state: p.state ?? p.agency,
    risk: p.risk ?? "Medium",
    health: p.health ?? "—",
    delay: fmtDelay(p.actualDelayMonths ?? p.predictedDelayMonths),
    progress: p.physicalProgress,
    progressGap: `${Math.abs(p.progressGap).toFixed(1)}%`,
    targetProgress: Math.max(0, Math.min(100, targetProgress)),
    expectedCompletion: fmtDate(p.revisedCompletion ?? p.originalCompletion),
    originalCompletion: fmtDate(p.originalCompletion),
    originalCost: fmtCr(p.originalCost),
    expenditure: fmtCr(p.expenditure),
    remainingBudget: fmtCr(p.remainingBudget),
    expenditurePercent: p.expenditurePercent,
    riskFactors: p.riskFactors ?? [],
    milestones: p.milestones ?? [],
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectOverview({
  project,
  navigate,
}: {
  project: string | null;
  navigate: (s: Screen, project?: string) => void;
}) {
  const [data, setData] = useState<ReturnType<typeof toDisplay> | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "budget">("overview");

  useEffect(() => {
    if (!project) {
      setData(null);
      setNotFound(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setData(null);
    setActiveTab("overview");

    getProject(project)
      .then((p) => {
        if (!p) {
          setNotFound(true);
        } else {
          setData(toDisplay(p));
        }
      })
      .catch((err) => {
        console.error("[ProjectOverview] fetch failed:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [project]);

  const riskColors: Record<string, string> = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#d97706",
    Low: "#16a34a",
  };

  const severityBg: Record<string, { bg: string; color: string; border: string }> = {
    Critical: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    High: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
    Medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
    Low: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  };

  const milestoneStatus: Record<string, { color: string; dot: string }> = {
    Completed: { color: "#16a34a", dot: "#16a34a" },
    "In Progress": { color: "#2563eb", dot: "#2563eb" },
    Delayed: { color: "#dc2626", dot: "#dc2626" },
    "Not Started": { color: "#94a3b8", dot: "#cbd5e1" },
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm text-slate-500">Loading project data…</div>
        </div>
      </div>
    );
  }

  // ── Not found / no selection ──────────────────────────────────────────────
  if (notFound || !project) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center px-8 max-w-sm">
          <div className="text-4xl mb-4">📋</div>
          <div className="font-semibold text-slate-700 mb-2">
            {notFound ? "Project Not Found" : "No Project Selected"}
          </div>
          <div className="text-sm text-slate-400 mb-6">
            {notFound
              ? `Project ID "${project}" was not found in the database.`
              : "Select a project from the Priority Queue or Risk Map to view its details."}
          </div>
          <button
            onClick={() => navigate("priority-queue")}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#2563eb" }}
          >
            Go to Priority Queue
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const p = data;

  return (
    <div className="min-h-full bg-slate-50 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate("priority-queue")}
                className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
              >
                ← Priority Queue
              </button>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: riskColors[p.risk] + "18",
                  color: riskColors[p.risk],
                  border: `1px solid ${riskColors[p.risk]}30`,
                }}
              >
                {p.risk} Risk
              </span>
              <span className="text-xs text-slate-400">{p.sector} · {p.agency}</span>
            </div>
            <h1 className="font-display font-bold text-slate-900 text-xl leading-snug">{p.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{p.ministry}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate("ai-risk-analysis", project)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
              style={{ background: "#2563eb" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="4" r="2.5" stroke="white" strokeWidth="1.3"/>
                <circle cx="3" cy="10" r="2" stroke="white" strokeWidth="1.3"/>
                <circle cx="11" cy="10" r="2" stroke="white" strokeWidth="1.3"/>
                <path d="M5 5.5L4 8.5M9 5.5L10 8.5M5 10H9" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Run Risk Analysis
            </button>
            <button
              onClick={() => navigate("ai-risk-analysis", project)}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Explain Risk
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Create Intervention
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Status strip */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "Current Health", value: p.health, valueColor: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: "Expected Delay", value: p.delay, valueColor: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: "Physical Progress", value: `${p.progress}%`, valueColor: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Est. Completion", value: p.expectedCompletion, valueColor: "#0f172a", bg: "white", border: "#e2e8f0" },
            { label: "Priority", value: p.risk, valueColor: riskColors[p.risk], bg: riskColors[p.risk] + "10", border: riskColors[p.risk] + "30" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="text-xs text-slate-500 mb-1.5">{s.label}</div>
              <div className="font-display font-bold text-base leading-tight" style={{ color: s.valueColor }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-slate-200">
          {(["overview", "milestones", "budget"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium capitalize relative"
              style={{
                color: activeTab === tab ? "#2563eb" : "#64748b",
                borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-4">
            {/* Progress gauge */}
            <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Progress vs Target</h3>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <div className="font-display font-bold text-3xl text-slate-900">{p.progress}%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Actual progress</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-3xl" style={{ color: "#dc2626" }}>{Math.round(p.targetProgress)}%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Target progress</div>
                </div>
              </div>
              <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="absolute inset-0 bg-slate-100 rounded-full" />
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: `${Math.min(100, p.targetProgress)}%`, background: "#fecaca" }}
                />
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: `${p.progress}%`, background: "#2563eb" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  <span className="text-slate-500">Actual</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-200" />
                  <span className="text-slate-500">Target</span>
                </div>
              </div>
              <div
                className="mt-4 px-3 py-2.5 rounded-lg text-xs font-medium"
                style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
              >
                Progress Gap: <strong>{p.progressGap}</strong> behind target
              </div>
            </div>

            {/* Risk factors */}
            <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Risk Factors</h3>
              <div className="space-y-3">
                {p.riskFactors.map((rf, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 mb-1">{rf.factor}</div>
                      <div
                        className="inline-flex text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={severityBg[rf.severity] || { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" }}
                      >
                        {rf.severity}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0 mt-1">
                      Impact: <span className="font-medium text-slate-600">{rf.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("ai-risk-analysis", project)}
                className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "#2563eb" }}
              >
                Full AI Risk Analysis →
              </button>
            </div>

            {/* Project info */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Project Details</h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Sector", value: p.sector },
                    { label: "Ministry", value: p.ministry },
                    { label: "Implementing Agency", value: p.agency },
                    { label: "Original Deadline", value: p.originalCompletion },
                    { label: "Revised Deadline", value: p.expectedCompletion },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-slate-400 flex-shrink-0">{f.label}</span>
                      <span className="text-xs font-medium text-slate-700 text-right">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="text-sm font-semibold text-slate-800 mb-5">Project Milestones</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-5">
                {p.milestones.map((m, i) => {
                  const s = milestoneStatus[m.status] ?? milestoneStatus["Not Started"];
                  return (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white relative z-10"
                        style={{ background: s.dot }}
                      >
                        {m.status === "Completed" ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : m.status === "In Progress" ? (
                          <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : m.status === "Delayed" ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 3V6.5L8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                          <span className="text-xs text-slate-400">{m.date || "—"}</span>
                        </div>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                          style={{ color: s.color, background: s.color + "15" }}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "budget" && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Original Cost", value: p.originalCost, sub: "Sanctioned amount", color: "#0f172a", bg: "white", border: "#e2e8f0" },
              { label: "Expenditure to Date", value: p.expenditure, sub: `${p.progress}% of project completed`, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { label: "Remaining Budget", value: p.remainingBudget, sub: "Available for completion", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl p-6" style={{ background: b.bg, border: `1px solid ${b.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="text-xs text-slate-500 mb-2">{b.label}</div>
                <div className="font-display font-bold text-3xl mb-1" style={{ color: b.color }}>{b.value}</div>
                <div className="text-xs text-slate-400">{b.sub}</div>
              </div>
            ))}

            <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Budget Utilisation</h3>
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: `${Math.min(100, p.expenditurePercent)}%`, background: p.expenditurePercent > 100 ? "#dc2626" : "#2563eb" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>₹0</span>
                <span className="font-medium" style={{ color: p.expenditurePercent > 100 ? "#dc2626" : "#2563eb" }}>
                  {p.expenditurePercent.toFixed(1)}% utilised
                </span>
                <span>{p.originalCost}</span>
              </div>
              <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                Physical progress ({p.progress}%) vs budget utilisation ({p.expenditurePercent.toFixed(1)}%). Review recommended if gap exceeds 15%.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
