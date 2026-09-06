/**
 * Canonical Project interface for NirmaanAI.
 *
 * Source of truth: NirmaanAI_Feature_Engineered.csv (182 projects).
 * Firestore collection: "projects"  |  Document ID: String(projectCode)
 *
 * ML SAFETY: Only the 10 approved input features listed below may ever be sent
 * to the FastAPI Random Forest model. All other fields are display-only.
 * Use buildMLPayload() from src/utils/mlPayload.ts to construct the request.
 *
 * 10 approved ML inputs:
 *   originalCost · expenditure · physicalProgress · expenditurePercent
 *   remainingBudget · progressGap · plannedDurationDays
 *   sector · ministry · agency
 */
export interface Project {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string;             // String(projectCode), Firestore document ID
  projectCode: number;    // CSV col 4 — unique numeric project identifier
  name: string;           // CSV col 5
  sector: string;         // CSV col 1  ← ML input #8
  ministry: string;       // CSV col 2  ← ML input #9
  agency: string;         // CSV col 3  ← ML input #10
  state?: string;         // Not in CSV — optional

  // ── Financial (₹ Crore) ── ML inputs #1–6 ─────────────────────────────────
  originalCost: number;           // CSV col 6
  expenditure: number;            // CSV col 8
  physicalProgress: number;       // CSV col 9  — 0–100 %
  expenditurePercent: number;     // CSV col 19 — expenditure / originalCost × 100
  remainingBudget: number;        // CSV col 20 — originalCost − expenditure
  progressGap: number;            // CSV col 22 — physicalProgress − expectedProgress (negative = behind)

  // ── Duration ── ML input #7 ────────────────────────────────────────────────
  plannedDurationDays: number;    // CSV col 24

  // ── Financials (display only — NOT sent to ML) ─────────────────────────────
  revisedCost?: number | null;    // CSV col 7  — blank for most projects

  // ── Dates ─────────────────────────────────────────────────────────────────
  sanctionDate: string;            // CSV col 12  ISO "YYYY-MM-DD"
  originalCompletion: string;      // CSV col 10  ISO date or ""
  revisedCompletion: string | null;// CSV col 11  ISO date or null

  // ── Stage / status (display only — NOT sent to ML) ────────────────────────
  projectStage: string;            // CSV col 21 "Early Stage"|"In Progress"|"Near Completion"|…
  costStatus?: string;             // CSV col 18 "Over Budget"|"No Cost Overrun"|"Cost Reduced"|"Not Available"
  expenditureEfficiency?: string;  // CSV col 23 "Balanced"|"Low Expenditure"|"High Concern"|"Moderate Concern"

  // ── Historical schedule (display only — NOT sent to ML) ───────────────────
  actualDelayMonths?: number | null; // CSV col 14 — Schedule Delay Months (historical fact)
  delayRisk?: number;                // CSV col 38 — binary: 1=Delayed, 0=Not Delayed
  health?: string;                   // Mapped from CSV col 31 Progress Status

  // ── Derived risk level (display only — NOT from CSV directly) ─────────────
  risk?: string;            // "Critical"|"High"|"Medium"|"Low" — derived in import

  // ── ML model outputs (filled by FastAPI response — NOT from CSV) ──────────
  predictedDelayMonths?: number;   // AI predicted delay — distinct from actualDelayMonths
  expectedCompletion?: string;     // AI projected completion date

  // ── Prioritisation ────────────────────────────────────────────────────────
  priority?: number;

  // ── Optional nested detail ────────────────────────────────────────────────
  riskFactors?: Array<{
    factor: string;
    severity: string;   // "Critical"|"High"|"Medium"|"Low"
    impact: string;     // "High"|"Medium"|"Low"
  }>;

  milestones?: Array<{
    name: string;
    status: string;     // "Completed"|"In Progress"|"Delayed"|"Not Started"
    date: string;
  }>;
}
