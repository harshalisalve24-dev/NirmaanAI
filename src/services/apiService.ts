import type { Project } from "../types/project";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface RiskPredictionResult {
  predicted_delay_months: number;
  risk_score: number;
  risk_level: string; // "Low" | "Medium" | "High" | "Critical"
}

// In-memory cache for prediction results during session
const predictionCache = new Map<string, RiskPredictionResult>();

/**
 * Maps the 10 approved historical-safe features from a Project object
 * to the exact snake_case JSON structure required by FastAPI backend.
 */
export function buildBackendPayload(project: Project) {
  return {
    original_cost: Number(project.originalCost),
    expenditure: Number(project.expenditure),
    physical_progress: Number(project.physicalProgress),
    expenditure_percent: Number(project.expenditurePercent),
    remaining_budget: Number(project.remainingBudget),
    progress_gap: Number(project.progressGap),
    planned_duration_days: Number(project.plannedDurationDays),
    sector_name: String(project.sector),
    line_ministry: String(project.ministry),
    implementing_agency: String(project.agency),
  };
}

/**
 * Calls FastAPI POST /predict endpoint to get ML predicted delay, risk score, and risk level.
 * Uses session-level in-memory cache to prevent duplicate network calls.
 */
export async function predictProjectRisk(
  project: Project
): Promise<RiskPredictionResult> {
  const cacheKey = project.id || String(project.projectCode);
  if (predictionCache.has(cacheKey)) {
    return predictionCache.get(cacheKey)!;
  }

  const payload = buildBackendPayload(project);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `FastAPI predict endpoint error: ${response.status} ${response.statusText}`
    );
  }

  const result: RiskPredictionResult = await response.json();
  predictionCache.set(cacheKey, result);
  return result;
}

/**
 * Batch utility to fetch predictions for multiple projects concurrently (with cache lookup).
 */
export async function predictProjectsRiskBatch(
  projects: Project[]
): Promise<Map<string, RiskPredictionResult>> {
  const results = new Map<string, RiskPredictionResult>();
  
  await Promise.all(
    projects.map(async (p) => {
      try {
        const res = await predictProjectRisk(p);
        results.set(p.id || String(p.projectCode), res);
      } catch (err) {
        console.warn(`[predictProjectsRiskBatch] Failed for project ${p.id}:`, err);
      }
    })
  );

  return results;
}
