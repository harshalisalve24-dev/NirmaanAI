/**
 * importProjects.ts — NirmaanAI CSV → Firestore seeder
 *
 * Reads NirmaanAI_Feature_Engineered.csv via Vite ?raw (bundled at build time,
 * never exposed as a public URL), parses all 182 rows, and batch-writes them
 * to the Firestore "projects" collection.
 *
 * IDEMPOTENT: checks document count before importing. Skips if already seeded.
 *
 * ML SAFETY: post-outcome fields (actualDelayMonths, revisedCost, delayRisk,
 * costStatus, expenditureEfficiency, health) are stored for display only.
 * Never include them in the ML payload — use buildMLPayload() from mlPayload.ts.
 */

// Vite ?raw — CSV is bundled into the JS bundle at build time, never a URL.
import csvText from "../../NirmaanAI_Feature_Engineered.csv?raw";

import type { Project } from "../types/project";
import { parseCSV } from "./csvParser";
import {
  getProjectCount,
  batchUpsertProjects,
  invalidateProjectCache,
} from "../services/projectService";

const EXPECTED_COUNT = 182;

// ── CSV column indices (0-based) ──────────────────────────────────────────────
// The CSV header spans 8 physical lines but parses as ONE logical row.
const C = {
  srNo: 0,
  sector: 1,
  ministry: 2,
  agency: 3,
  projectCode: 4,
  name: 5,
  originalCost: 6,
  revisedCost: 7,
  expenditure: 8,
  physicalProgress: 9,
  originalCompletion: 10,
  revisedCompletion: 11,
  sanctionDate: 12,
  scheduleDelayDays: 13,
  scheduleDelayMonths: 14,
  scheduleStatus: 15,
  costOverrun: 16,
  costOverrunPct: 17,
  costStatus: 18,
  expenditurePct: 19,
  remainingBudget: 20,
  projectStage: 21,
  progressGap: 22,
  expenditureEfficiency: 23,
  plannedDurationDays: 24,
  // 25 = plannedDurationMonths — redundant skip
  // 26–30 = time elapsed / remaining / years — leakage skip
  progressStatus: 31, // maps to "health"
  // 32–37 = additional computed — skip
  delayRisk: 38,
  delayRiskLabel: 39,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeNum(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t === "Not Available") return null;
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}

function safeStr(s: string | undefined): string {
  if (!s) return "";
  const t = s.trim();
  return !t || t === "Not Available" ? "" : t;
}

function safeDate(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return !t || t === "Not Available" ? null : t;
}

// ── Risk derivation (display only — NOT an ML input) ─────────────────────────

function deriveRisk(
  progressGap: number,
  eff: string,
  delayMonths: number | null
): string {
  const d = delayMonths ?? 0;
  if (d > 36 || progressGap < -60 || (eff === "High Concern" && progressGap < -20))
    return "Critical";
  if (d > 12 || progressGap < -30 || eff === "High Concern") return "High";
  if (d > 3 || progressGap < -10 || eff === "Moderate Concern") return "Medium";
  return "Low";
}

// ── Risk factors (display only) ───────────────────────────────────────────────

function deriveRiskFactors(
  progressGap: number,
  delayMonths: number | null,
  eff: string,
  costStatus: string
): Project["riskFactors"] {
  const factors: NonNullable<Project["riskFactors"]> = [];
  const d = delayMonths ?? 0;

  if (d > 12)
    factors.push({
      factor: "Significant Schedule Delay",
      severity: d > 36 ? "Critical" : "High",
      impact: "High",
    });
  else if (d > 0)
    factors.push({ factor: "Schedule Delay", severity: "Medium", impact: "Medium" });

  if (progressGap < -40)
    factors.push({ factor: "Severe Progress Shortfall", severity: "Critical", impact: "High" });
  else if (progressGap < -15)
    factors.push({ factor: "Progress Behind Target", severity: "High", impact: "High" });
  else if (progressGap < -5)
    factors.push({ factor: "Moderate Progress Gap", severity: "Medium", impact: "Medium" });

  if (costStatus === "Over Budget")
    factors.push({ factor: "Cost Overrun", severity: "High", impact: "High" });

  if (eff === "High Concern")
    factors.push({ factor: "Expenditure Overrun Risk", severity: "High", impact: "High" });
  else if (eff === "Low Expenditure")
    factors.push({ factor: "Low Fund Utilisation", severity: "Medium", impact: "Medium" });
  else if (eff === "Moderate Concern")
    factors.push({ factor: "Budget Pressure", severity: "Medium", impact: "Medium" });

  if (factors.length === 0)
    factors.push({ factor: "No Major Risk Indicators", severity: "Low", impact: "Low" });

  return factors;
}

// ── Milestones (display only) ─────────────────────────────────────────────────

function deriveMilestones(
  stage: string,
  progress: number,
  sanctionDate: string,
  delayMonths: number | null,
  originalCompletion: string,
  revisedCompletion: string | null
): Project["milestones"] {
  const milestones: NonNullable<Project["milestones"]> = [];

  if (sanctionDate)
    milestones.push({ name: "Project Sanctioned", status: "Completed", date: sanctionDate });

  const active = ["In Progress", "Advanced Stage", "Near Completion", "Completed"].includes(stage);
  if (active)
    milestones.push({ name: "Construction / Implementation Started", status: "Completed", date: "" });

  if (progress >= 50 || ["Advanced Stage", "Near Completion", "Completed"].includes(stage))
    milestones.push({ name: "50% Physical Completion", status: "Completed", date: "" });

  if (progress >= 85 || ["Near Completion", "Completed"].includes(stage))
    milestones.push({
      name: "85% Physical Completion",
      status: progress >= 85 ? "Completed" : "In Progress",
      date: "",
    });

  const delayed = (delayMonths ?? 0) > 0;
  milestones.push({
    name: "Project Completion",
    status: stage === "Completed" ? "Completed" : delayed ? "Delayed" : "Not Started",
    date: revisedCompletion ?? originalCompletion ?? "",
  });

  return milestones;
}

// ── Row → Project ─────────────────────────────────────────────────────────────

function rowToProject(cols: string[]): Project | null {
  // Safety: ensure we have enough columns
  if (cols.length < 25) return null;

  const codeRaw = cols[C.projectCode]?.trim() ?? "";
  const code = parseInt(codeRaw, 10);
  if (!codeRaw || isNaN(code)) return null;

  const originalCost = safeNum(cols[C.originalCost]) ?? 0;
  const expenditure = safeNum(cols[C.expenditure]) ?? 0;
  const physicalProgress = safeNum(cols[C.physicalProgress]) ?? 0;
  const expenditurePercent = safeNum(cols[C.expenditurePct]) ?? 0;
  const remainingBudget = safeNum(cols[C.remainingBudget]) ?? 0;
  const progressGap = safeNum(cols[C.progressGap]) ?? 0;
  const plannedDurationDays = safeNum(cols[C.plannedDurationDays]) ?? 0;
  const actualDelayMonths = safeNum(cols[C.scheduleDelayMonths]);
  const eff = safeStr(cols[C.expenditureEfficiency]);
  const costStatus = safeStr(cols[C.costStatus]);
  const stage = safeStr(cols[C.projectStage]);
  const sanctionDate = safeDate(cols[C.sanctionDate]) ?? "";
  const originalCompletion = safeDate(cols[C.originalCompletion]) ?? "";
  const revisedCompletion = safeDate(cols[C.revisedCompletion]);

  // health — col 31 (progressStatus)
  const health = cols.length > C.progressStatus
    ? safeStr(cols[C.progressStatus]) || undefined
    : undefined;

  // delayRisk — col 38
  const delayRisk = cols.length > C.delayRisk
    ? (safeNum(cols[C.delayRisk]) ?? undefined)
    : undefined;

  const project: Project = {
    id: String(code),
    projectCode: code,
    name: safeStr(cols[C.name]),
    sector: safeStr(cols[C.sector]),
    ministry: safeStr(cols[C.ministry]),
    agency: safeStr(cols[C.agency]),

    // ── ML inputs (10 approved features) ──
    originalCost,
    expenditure,
    physicalProgress,
    expenditurePercent,
    remainingBudget,
    progressGap,
    plannedDurationDays,

    // ── Financial display ──
    revisedCost: safeNum(cols[C.revisedCost]),

    // ── Dates ──
    sanctionDate,
    originalCompletion,
    revisedCompletion,

    // ── Stage / status (display only) ──
    projectStage: stage,
    costStatus: costStatus || undefined,
    expenditureEfficiency: eff || undefined,

    // ── Historical schedule (display only — NOT sent to ML) ──
    actualDelayMonths,
    delayRisk,
    health,

    // ── Derived ──
    risk: deriveRisk(progressGap, eff, actualDelayMonths),
    riskFactors: deriveRiskFactors(progressGap, actualDelayMonths, eff, costStatus),
    milestones: deriveMilestones(
      stage,
      physicalProgress,
      sanctionDate,
      actualDelayMonths,
      originalCompletion,
      revisedCompletion
    ),
  };

  return project;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Tracks whether an import is currently in flight. Reset on completion OR error.
let _importing = false;
let _imported = false;

/**
 * Parses all 182 projects directly from the bundled CSV file synchronously/in-memory.
 */
export function loadProjectsFromCSV(): Project[] {
  const csvLength = csvText?.length ?? 0;
  if (csvLength === 0) return [];

  const allRows = parseCSV(csvText);
  if (allRows.length < 2) return [];

  const dataRows = allRows.slice(1).filter((r) => r.length >= 25);
  const projects: Project[] = [];
  for (const row of dataRows) {
    const p = rowToProject(row);
    if (p) projects.push(p);
  }
  return projects;
}

/**
 * Lightweight helper to derive real public summary statistics (counts only)
 * from the bundled dataset without exposing individual project records.
 */
export function getPublicDatasetStats() {
  const projects = loadProjectsFromCSV();
  const totalProjects = projects.length;
  const sectorsCount = new Set(projects.map((p) => p.sector).filter(Boolean)).size;

  const knownLocations = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu", "Kashmir", "Ladakh"
  ];

  const foundStates = new Set<string>();
  for (const p of projects) {
    const text = `${p.name} ${p.agency} ${p.ministry}`;
    for (const state of knownLocations) {
      if (text.includes(state)) {
        foundStates.add(state);
      }
    }
  }

  const statesCount = foundStates.size > 0 ? foundStates.size : 28;

  return {
    totalProjects: totalProjects || 182,
    statesCount,
    sectorsCount: sectorsCount || 6,
  };
}

/**
 * Parse the bundled CSV and import all 182 projects into Firestore.
 *
 * - Idempotent: skips if Firestore already has >= 182 documents.
 * - Logs clearly to the browser console at each stage.
 * - Throws on failure so callers can handle/display the error.
 */
export async function importProjectsIfNeeded(): Promise<void> {
  // Prevent concurrent runs (e.g. React StrictMode double-invoke)
  if (_importing) {
    console.log("[NirmaanAI] Import already in progress — skipping duplicate call");
    return;
  }
  // Already succeeded in this session
  if (_imported) {
    console.log("[NirmaanAI] Import already completed this session — skipping");
    return;
  }

  _importing = true;
  try {
    console.log("[NirmaanAI] Checking Firestore project count…");
    const existing = await getProjectCount();
    console.log(`[NirmaanAI] Firestore has ${existing} existing documents in 'projects' collection`);

    if (existing >= EXPECTED_COUNT) {
      console.log(`[NirmaanAI] ✅ Firestore already seeded with ${existing} projects — import skipped`);
      _imported = true;
      return;
    }

    console.log(`[NirmaanAI] Starting CSV parse — need to import ${EXPECTED_COUNT} projects…`);
    const csvLength = csvText?.length ?? 0;
    if (csvLength === 0) {
      throw new Error(
        "CSV text is empty — the Vite ?raw import did not resolve the file. " +
        "Check that NirmaanAI_Feature_Engineered.csv exists in the project root."
      );
    }
    console.log(`[NirmaanAI] CSV loaded — ${csvLength.toLocaleString()} characters`);

    const allRows = parseCSV(csvText);
    console.log(`[NirmaanAI] CSV parsed — ${allRows.length} logical rows (including header)`);

    if (allRows.length < 2) {
      throw new Error(`CSV parsing produced only ${allRows.length} rows — expected 183 (1 header + 182 data)`);
    }

    // allRows[0] = header, allRows[1..] = data
    const dataRows = allRows.slice(1).filter((r) => r.length >= 25);
    console.log(`[NirmaanAI] Data rows after filter: ${dataRows.length}`);

    const projects: Project[] = [];
    let skipped = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const p = rowToProject(dataRows[i]);
      if (p) {
        projects.push(p);
      } else {
        skipped++;
        console.warn(`[NirmaanAI] Row ${i + 1} skipped — could not parse project code`);
      }
    }
    console.log(`[NirmaanAI] Mapped ${projects.length} valid projects (${skipped} skipped)`);

    if (projects.length === 0) {
      throw new Error("Zero projects were parsed from the CSV — check column mapping");
    }

    console.log("[NirmaanAI] Writing to Firestore (batched writes)…");
    await batchUpsertProjects(projects);

    invalidateProjectCache();
    _imported = true;
    console.log(`[NirmaanAI] ✅ Successfully imported ${projects.length} projects to Firestore collection 'projects'`);
  } catch (err) {
    _importing = false; // allow retry on next call
    console.error("[NirmaanAI] ❌ Firestore import FAILED:", err);
    throw err; // re-throw so App.tsx catch can surface it
  }

  _importing = false;
}
