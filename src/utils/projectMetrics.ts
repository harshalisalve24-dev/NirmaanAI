import type { Project } from "../types/project";
import type { RiskPredictionResult } from "../services/apiService";

/**
 * Requirement 4: Current Health
 * Derive current health consistently from backend Risk Score / Risk Level:
 *  - 0–30   = "On Track"
 *  - >30–60 = "Watch"
 *  - >60–80 = "At Risk"
 *  - >80–100= "Critical"
 */
export function deriveCurrentHealth(
  riskScore: number | null | undefined,
  fallbackRiskLevel?: string | null
): "On Track" | "Watch" | "At Risk" | "Critical" {
  if (riskScore != null) {
    if (riskScore <= 30) return "On Track";
    if (riskScore <= 60) return "Watch";
    if (riskScore <= 80) return "At Risk";
    return "Critical";
  }
  const level = fallbackRiskLevel ?? "Medium";
  if (level === "Low") return "On Track";
  if (level === "Medium") return "Watch";
  if (level === "High") return "At Risk";
  return "Critical";
}

/**
 * Requirement 1 & 2: Actual vs Target Progress & Progress Variance
 * Variance = Actual Progress - Target Progress
 *  - Positive: "X.X pp ahead of target"
 *  - Negative: "X.X pp behind target"
 *  - Zero:     "On target"
 */
export function calculateProgressMetrics(p: Project) {
  const actualProgress = p.physicalProgress;
  const isCompleted = actualProgress >= 100;

  // Target Progress is 100% for completed projects, else physicalProgress + progressGap (expenditure %)
  const rawTarget = isCompleted
    ? 100
    : Math.max(0, Math.min(100, actualProgress + p.progressGap));

  const targetProgress = Math.round(rawTarget * 10) / 10;
  const variance = Math.round((actualProgress - targetProgress) * 10) / 10;

  let varianceText = "On target";
  if (variance > 0.05) {
    varianceText = `${variance.toFixed(1)} pp ahead of target`;
  } else if (variance < -0.05) {
    varianceText = `${Math.abs(variance).toFixed(1)} pp behind target`;
  }

  return {
    actualProgress,
    targetProgress,
    variance,
    varianceText,
    isCompleted,
  };
}

/**
 * Requirement 3: Budget Utilisation
 * Utilisation = Expenditure / Original Cost * 100
 * If utilisation > 100%, show exact overrun % over original budget.
 */
export function calculateBudgetMetrics(p: Project) {
  const utilisation =
    p.originalCost > 0
      ? (p.expenditure / p.originalCost) * 100
      : p.expenditurePercent;

  const isOverBudget = utilisation > 100;
  const overPct = isOverBudget ? (utilisation - 100).toFixed(1) : "0.0";

  const statusText = isOverBudget
    ? `${overPct}% over original budget (${utilisation.toFixed(1)}% utilized)`
    : `${utilisation.toFixed(1)}% utilized (Within original budget)`;

  return {
    utilisation: Math.round(utilisation * 10) / 10,
    isOverBudget,
    overPct,
    statusText,
  };
}

/**
 * Requirement 5 & 6: Delay Terminology & Completed Projects
 * Distinctly labels Current Delay (historical) vs Predicted Additional Delay (FastAPI ML).
 * Handles completed projects gracefully.
 */
export function calculateDelayMetrics(
  p: Project,
  prediction: RiskPredictionResult | null
) {
  const isCompleted = p.physicalProgress >= 100;

  // Historical/Current Delay to date
  const currentDelayMonths = p.actualDelayMonths ?? 0;
  const currentDelayStr =
    currentDelayMonths > 0
      ? `${currentDelayMonths.toFixed(1)} months`
      : "On Schedule";

  // ML Predicted Additional Delay
  const predictedDelayMonths = prediction?.predicted_delay_months ?? null;
  const predictedAdditionalDelayStr =
    predictedDelayMonths != null
      ? predictedDelayMonths > 0
        ? `${predictedDelayMonths.toFixed(1)} months`
        : "On Schedule"
      : null;

  // Completion dates
  const originalDate = p.originalCompletion || "—";
  const revisedDate = p.revisedCompletion || originalDate;
  const expectedCompletionStr = isCompleted ? "Project Completed" : revisedDate;

  return {
    isCompleted,
    currentDelayMonths,
    currentDelayStr,
    predictedDelayMonths,
    predictedAdditionalDelayStr,
    expectedCompletionStr,
  };
}
