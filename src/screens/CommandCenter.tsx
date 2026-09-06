import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProjectsCached } from "../services/projectService";

const riskData = [
  { name: "Critical", value: 47, color: "#dc2626" },
  { name: "High", value: 112, color: "#ea580c" },
  { name: "Medium", value: 298, color: "#d97706" },
  { name: "Low", value: 790, color: "#16a34a" },
];

const earlyWarnings = [
  {
    title: "3 Highway Projects",
    subtitle: "Entering delay risk zone",
    detail: "Punjab & Haryana Corridor",
    type: "warning",
    icon: "⚠",
  },
  {
    title: "Power Grid — Rajasthan",
    subtitle: "Land acquisition stalled",
    detail: "12 villages pending NOC",
    type: "alert",
    icon: "⚡",
  },
  {
    title: "Railway Bridge — Assam",
    subtitle: "Tender re-awarded",
    detail: "Schedule reset required",
    type: "info",
    icon: "🛤",
  },
];

const sectorBreakdown = [
  { sector: "Highways", total: 412, critical: 18, color: "#3b82f6" },
  { sector: "Railways", total: 287, critical: 12, color: "#8b5cf6" },
  { sector: "Metro Rail", total: 156, critical: 9, color: "#06b6d4" },
  { sector: "Power", total: 203, critical: 5, color: "#f59e0b" },
  { sector: "Bridges", total: 98, critical: 2, color: "#10b981" },
  { sector: "Mining", total: 91, critical: 1, color: "#6366f1" },
];

export default function CommandCenter({ navigate }: { navigate: (s: Screen, project?: string) => void }) {
  const [search, setSearch] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [immediateProjects, setImmediateProjects] = useState<Project[]>([]);

  // Load top 4 most-delayed / critically-behind projects from Firestore
  useEffect(() => {
    getProjectsCached()
      .then((all) => {
        const sorted = [...all].sort((a, b) => {
          // Prioritise by: risk level then progress gap then actual delay
          const riskOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          const rA = riskOrder[a.risk ?? "Low"] ?? 3;
          const rB = riskOrder[b.risk ?? "Low"] ?? 3;
          if (rA !== rB) return rA - rB;
          return a.progressGap - b.progressGap; // more negative = further behind
        });
        setImmediateProjects(sorted.slice(0, 4));
      })
      .catch((err) => console.error("[CommandCenter] Firestore load failed:", err));
  }, []);

  const riskColors: Record<string, string> = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#d97706",
    Low: "#16a34a",
  };

  return (
    <div className="min-h-full bg-slate-50 fade-in">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-xs font-medium text-slate-400 mb-0.5">Saturday, 05 September 2026</div>
          <h1 className="font-display font-bold text-slate-900 text-xl">Good Morning, Officer</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 w-56"
              style={{ outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a5 5 0 0 1 5 5v2l1 2H2L3 8V6a5 5 0 0 1 5-5Z" stroke="#64748b" strokeWidth="1.3"/>
                <path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="#64748b" strokeWidth="1.3"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
            {showNotif && (
              <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  <span className="text-xs text-blue-600 font-medium">3 new</span>
                </div>
                {[
                  { title: "NH-44 delay increased by 0.8 months", time: "2 hrs ago", type: "critical" },
                  { title: "Ganga Bridge tender re-issued", time: "5 hrs ago", type: "warning" },
                  { title: "Weekly risk report generated", time: "9 hrs ago", type: "info" },
                ].map((n, i) => (
                  <div key={i} className="px-4 py-3 border-b border-slate-50 flex items-start gap-3 hover:bg-slate-50">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.type === "critical" ? "#dc2626" : n.type === "warning" ? "#d97706" : "#3b82f6" }}
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-800">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-slate-900 text-2xl">Infrastructure Risk Command Center</h2>
            <p className="text-sm text-slate-500 mt-0.5">Live monitoring across 1,247 active projects · Last updated 09:14 IST</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live · All systems operational
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Projects", value: "1,247", sub: "Across 6 sectors", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Critical Projects", value: "47", sub: "↑ 3 from last week", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
            { label: "High Risk", value: "112", sub: "↓ 5 from last week", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
            { label: "Med / Low Risk", value: "1,088", sub: "↑ 2 from last week", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-xl p-5 border card-hover"
              style={{ borderColor: k.border, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
            >
              <div
                className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full mb-3"
                style={{ background: k.bg, color: k.color }}
              >
                {k.label}
              </div>
              <div className="font-display font-bold text-slate-900 text-3xl mb-1">{k.value}</div>
              <div className="text-xs text-slate-500">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Risk distribution chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Risk Distribution</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx={55}
                    cy={55}
                    innerRadius={36}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [val, "Projects"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {riskData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-slate-600">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Sector Overview</h3>
            <div className="space-y-3">
              {sectorBreakdown.map((s) => {
                const pct = Math.round((s.critical / s.total) * 100);
                return (
                  <div key={s.sector} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-slate-600 flex-shrink-0">{s.sector}</div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(s.total / 412) * 100}%`, background: s.color, opacity: 0.25 }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden -ml-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct * 4}%`, background: "#dc2626" }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 w-8 text-right">{s.total}</div>
                    <div className="text-xs font-semibold w-6 text-right" style={{ color: "#dc2626" }}>{s.critical}</div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                <div className="w-20" />
                <div className="flex-1">Total projects</div>
                <div className="flex-1">Critical count</div>
                <div className="w-8 text-right">Total</div>
                <div className="w-6 text-right text-red-500">Crit</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Immediate Attention */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Immediate Attention Required</h3>
              </div>
              <button
                onClick={() => navigate("priority-queue")}
                className="text-xs text-blue-600 font-medium hover:text-blue-700"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {immediateProjects.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Loading projects…</div>
              ) : (
                immediateProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate("project-overview", p.id)}
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: riskColors[p.risk ?? "Medium"] + "18",
                              color: riskColors[p.risk ?? "Medium"],
                              border: `1px solid ${riskColors[p.risk ?? "Medium"]}30`,
                            }}
                          >
                            {p.risk ?? "Medium"}
                          </span>
                          <span className="text-xs text-slate-400">{p.sector} · {p.agency}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-slate-500 mb-1">Progress Gap</div>
                        <div className="text-sm font-bold text-red-600">
                          {Math.abs(p.progressGap).toFixed(1)}% behind
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${p.physicalProgress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">{p.physicalProgress}% complete</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Early Warning Cards */}
          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Early Warnings</h3>
            <div className="space-y-3">
              {earlyWarnings.map((w, i) => {
                const styles =
                  w.type === "alert"
                    ? { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626" }
                    : w.type === "warning"
                    ? { bg: "#fffbeb", border: "#fde68a", dot: "#d97706" }
                    : { bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" };
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4 card-hover cursor-pointer"
                    style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-lg leading-none mt-0.5">{w.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: styles.dot }} />
                          <span className="text-xs font-semibold text-slate-800">{w.title}</span>
                        </div>
                        <div className="text-xs text-slate-600">{w.subtitle}</div>
                        <div className="text-xs text-slate-400 mt-1">{w.detail}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => navigate("risk-map")}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors card-hover"
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 2.5L4.5 1L9 2.5L13 1V11.5L9 13L4.5 11.5L1 13V2.5Z" stroke="#2563eb" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M4.5 1V11.5M9 2.5V13" stroke="#2563eb" strokeWidth="1.2"/>
                  </svg>
                  <span className="text-xs font-semibold text-blue-700">View Risk Map →</span>
                </div>
                <p className="text-xs text-slate-500">Geospatial view of all project risk zones across India</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
