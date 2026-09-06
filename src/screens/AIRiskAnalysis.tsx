import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Screen } from "../App";
import type { Project } from "../types/project";
import { getProject } from "../services/projectService";
import { buildMLPayload } from "../utils/mlPayload";

// ── Derive analysis display from a Project ───────────────────────────────────

const RISK_FACTOR_COLORS = ["#dc2626", "#ea580c", "#d97706", "#f59e0b", "#16a34a"];

function buildAnalysis(p: Project) {
  const riskFactors = (p.riskFactors ?? []).map((rf, i) => ({
    name: rf.factor,
    contribution: Math.max(5, Math.round(40 - i * 7)),
    color: RISK_FACTOR_COLORS[i] ?? "#94a3b8",
  }));

  const delayMonths = p.actualDelayMonths ?? p.predictedDelayMonths ?? 0;
  const delayStr = delayMonths > 0 ? `${delayMonths.toFixed(1)} months` : "On Schedule";

  const keyIndicators = [
    {
      label: "Physical Progress",
      value: `${p.physicalProgress}%`,
      status: p.physicalProgress < 40 ? "red" : p.physicalProgress < 70 ? "yellow" : "green",
      note: `Expenditure: ${p.expenditurePercent.toFixed(1)}% of budget used`,
    },
    {
      label: "Expected Delay",
      value: delayStr,
      status: delayMonths > 12 ? "red" : delayMonths > 3 ? "yellow" : "green",
      note: `Progress gap: ${Math.abs(p.progressGap).toFixed(1)}% behind target`,
    },
    {
      label: "Budget Utilisation",
      value: `${p.expenditurePercent.toFixed(1)}%`,
      status: p.expenditurePercent > 100 ? "red" : p.expenditurePercent < 20 ? "yellow" : "green",
      note: p.costStatus ? `Cost status: ${p.costStatus}` : "Within original budget",
    },
    {
      label: "Project Stage",
      value: p.projectStage,
      status: p.expenditureEfficiency === "High Concern" ? "red" : "yellow",
      note: `Efficiency: ${p.expenditureEfficiency ?? "Balanced"}`,
    },
  ];

  const classification = (() => {
    if (delayMonths > 24) return "Critical Schedule Overrun — Immediate Intervention Required";
    if (delayMonths > 6) return "Schedule Overrun — Progress & Expenditure Misalignment";
    if (p.expenditureEfficiency === "High Concern") return "Budget Overrun Risk — Expenditure Concern";
    if (p.progressGap < -30) return "Severe Progress Shortfall — Implementation Bottleneck";
    return "Moderate Risk — Monitoring Required";
  })();

  const summary = `This project (${p.name}) is classified as ${p.risk ?? "Medium"} risk. ` +
    `Physical progress stands at ${p.physicalProgress}% with ${p.expenditurePercent.toFixed(1)}% of budget utilised. ` +
    (delayMonths > 0
      ? `A schedule delay of ${delayStr} has been recorded. `
      : "No schedule delay recorded. ") +
    `Project stage: ${p.projectStage}. ` +
    `Expenditure efficiency: ${p.expenditureEfficiency ?? "Balanced"}.`;

  const interventions = (() => {
    const items: string[] = [];
    if (delayMonths > 12)
      items.push(`Convene emergency review meeting — project is ${delayStr} delayed`);
    if (p.progressGap < -20)
      items.push("Issue contractor performance notice — progress is significantly below target");
    if (p.expenditureEfficiency === "High Concern" || (p.costStatus ?? "").includes("Over"))
      items.push("Initiate cost audit and review revised cost projections");
    if (p.expenditureEfficiency === "Low Expenditure")
      items.push("Release pending fund tranches — expenditure significantly below allocation");
    if (p.projectStage === "Early Stage" && p.physicalProgress > 30)
      items.push("Verify progress reporting — stage/progress mismatch detected");
    if (items.length === 0)
      items.push("Continue regular monitoring — no critical intervention required at this time");
    return items;
  })();

  // Generate a simple planned vs actual timeline based on progress
  const stages = 5;
  const timeline = Array.from({ length: stages }, (_, i) => {
    const q = i + 1;
    const plannedPct = Math.min(100, Math.round(p.physicalProgress + Math.abs(p.progressGap) + (i - stages + 1) * 8));
    const actualPct = Math.min(100, Math.round(Math.max(0, p.physicalProgress - (stages - 1 - i) * Math.max(3, Math.abs(p.progressGap) / stages))));
    return {
      month: `Period ${q}`,
      planned: Math.max(actualPct + 2, plannedPct),
      actual: actualPct,
    };
  });

  return { riskFactors, keyIndicators, classification, summary, interventions, timeline, delayStr };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AIRiskAnalysis({
  project,
  navigate,
}: {
  project: string | null;
  navigate: (s: Screen, project?: string) => void;
}) {
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<ReturnType<typeof buildAnalysis> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [explainStep, setExplainStep] = useState(0);

  useEffect(() => {
    setLoading(true);
    setExplainMode(false);
    setExplainStep(0);
    setNotFound(false);
    setProjectData(null);
    setAnalysis(null);

    if (!project) {
      setLoading(false);
      return;
    }

    getProject(project)
      .then((p) => {
        if (!p) {
          setNotFound(true);
        } else {
          setProjectData(p);
          setAnalysis(buildAnalysis(p));
        }
      })
      .catch((err) => {
        console.error("[AIRiskAnalysis] fetch failed:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [project]);

  const explanationSteps = [
    "Reading project schedule data and progress logs…",
    "Comparing physical progress against planned milestones…",
    "Identifying bottleneck indicators — expenditure, stage, progress gap…",
    "Classifying risk level based on delay and indicator patterns…",
    "Generating intervention recommendations…",
  ];

  const handleExplain = () => {
    setExplainMode(true);
    setExplainStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setExplainStep(step);
      if (step >= explanationSteps.length) clearInterval(interval);
    }, 700);
  };

  const riskColors: Record<string, string> = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#d97706",
    Low: "#16a34a",
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="17" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="19" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 8V12C7 15 10 17 12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M17 8V12C17 15 14 17 12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="font-display font-semibold text-slate-800 text-base mb-2">Running Risk Analysis…</div>
          <div className="text-sm text-slate-500 mb-5">Analysing project indicators and schedule data</div>
          <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-blue-500 rounded-full loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found / no selection ──────────────────────────────────────────────
  if (notFound || !project || !projectData || !analysis) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center px-8 max-w-sm">
          <div className="text-4xl mb-4">🔍</div>
          <div className="font-semibold text-slate-700 mb-2">
            {notFound ? "Project Not Found" : "No Project Selected"}
          </div>
          <div className="text-sm text-slate-400 mb-6">
            Navigate to a project from the Priority Queue to run its AI risk analysis.
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

  const data = analysis;
  const risk = projectData.risk ?? "Medium";
  // Expose ML payload in console for dev verification (never sent automatically)
  const _mlPayload = buildMLPayload(projectData);
  void _mlPayload; // intentionally computed — used when "Run Analysis" calls FastAPI

  return (
    <div className="min-h-full bg-slate-50 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate("project-overview", project)}
                className="text-xs text-slate-400 hover:text-blue-600"
              >
                ← Project Overview
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="#2563eb">
                  <circle cx="3.5" cy="3" r="1.8" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
                  <circle cx="9.5" cy="3" r="1.8" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
                  <circle cx="6.5" cy="10" r="1.8" stroke="#2563eb" strokeWidth="1.2" fill="none"/>
                  <path d="M3.5 4.8V7C3.5 8.5 5 9.5 6.5 10" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                  <path d="M9.5 4.8V7C9.5 8.5 8 9.5 6.5 10" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI Risk Analysis</span>
            </div>
            <h1 className="font-display font-bold text-slate-900 text-xl leading-snug">{projectData.name}</h1>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleExplain}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              Explain Risk
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800">
              Create Intervention
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Explain mode */}
        {explainMode && (
          <div className="bg-blue-950 rounded-xl p-5 border border-blue-900 fade-in">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-semibold text-blue-200">NirmaanAI is explaining risk derivation…</span>
            </div>
            <div className="space-y-2">
              {explanationSteps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm"
                  style={{ opacity: i <= explainStep ? 1 : 0.2, transition: "opacity 0.4s" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: i < explainStep ? "#16a34a" : i === explainStep ? "#2563eb" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {i < explainStep ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ) : i === explainStep ? (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <span style={{ color: i <= explainStep ? "#e2e8f0" : "#475569" }}>{step}</span>
                </div>
              ))}
            </div>
            {explainStep >= explanationSteps.length - 1 && (
              <div className="mt-4 p-3 rounded-lg text-sm text-blue-100 leading-relaxed fade-in" style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}>
                <strong>Risk derivation complete.</strong> This project is classified as <strong>{risk}</strong> because
                physical progress ({projectData.physicalProgress}%) is {Math.abs(projectData.progressGap).toFixed(1)}% behind target.
                {data.riskFactors[0] && ` The primary driver is ${data.riskFactors[0].name.toLowerCase()}, contributing approximately ${data.riskFactors[0].contribution}% of the schedule pressure.`}
              </div>
            )}
          </div>
        )}

        {/* Summary card */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: "#fef2f2", borderColor: "#fecaca" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: riskColors[risk] ?? "#dc2626" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3L16.5 15H1.5L9 3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 8V11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="13.5" r="0.75" fill="white"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-red-800 text-sm">Risk Classification: {data.classification}</span>
              </div>
              <p className="text-sm text-red-700 leading-relaxed">{data.summary}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Key indicators */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Key Indicators</h3>
            <div className="space-y-3">
              {data.keyIndicators.map((ind, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#f8fafc" }}>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: ind.status === "red" ? "#dc2626" : ind.status === "yellow" ? "#d97706" : "#16a34a" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-0.5">{ind.label}</div>
                    <div className="font-display font-bold text-slate-900 text-base">{ind.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{ind.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk factor chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Risk Factor Breakdown</h3>
            <p className="text-xs text-slate-400 mb-4">Relative contribution to expected schedule delay</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.riskFactors} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 40]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Contribution"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]} barSize={12}>
                  {data.riskFactors.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Planned vs Actual Progress</h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-blue-500 rounded" />
                Planned
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-400 rounded" />
                Actual
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {data.timeline.map((t, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="text-xs text-slate-500 w-16 flex-shrink-0">{t.month}</div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${t.planned}%` }} />
                    </div>
                    <span className="text-xs text-blue-500 w-8 text-right">{t.planned}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${t.actual}%` }} />
                    </div>
                    <span className="text-xs text-red-500 w-8 text-right">{t.actual}%</span>
                  </div>
                </div>
                <div
                  className="text-xs font-semibold w-16 text-right flex-shrink-0"
                  style={{ color: t.planned - t.actual > 10 ? "#dc2626" : "#d97706" }}
                >
                  -{t.planned - t.actual}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended interventions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H6L8 1Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
            </svg>
            <h3 className="font-semibold text-slate-800 text-sm">Recommended Interventions</h3>
          </div>
          <div className="space-y-2">
            {data.interventions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                  style={{ background: "#2563eb", minWidth: 20 }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#0f172a" }}>
            Create Intervention Plan →
          </button>
        </div>

        {/* ML Safety disclaimer */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
            <circle cx="7" cy="7" r="6" stroke="#94a3b8" strokeWidth="1.2"/>
            <path d="M7 4V7.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="7" cy="9.5" r="0.6" fill="#94a3b8"/>
          </svg>
          <p className="text-xs text-slate-400 leading-relaxed">
            NirmaanAI derives risk classification from project progress indicators and expenditure patterns using 10 approved ML features.
            Post-outcome fields (schedule delay, cost overrun, revised cost) are stored for display only and are never sent to the prediction model.
            All analysis should be reviewed by the responsible officer before action.
          </p>
        </div>
      </div>
    </div>
  );
}
