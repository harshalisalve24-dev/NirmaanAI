import type { Project } from "../types/project";

/**
 * ML SAFETY: The 10 approved features for the FastAPI Random Forest model.
 *
 * NEVER add any other field to this payload — particularly:
 *   actualDelayMonths, revisedCost, costStatus, delayRisk, expenditureEfficiency,
 *   scheduleStatus, costOverrun, remainingProjectTime, timeElapsed,
 *   expectedProgress, progressDeviation, progressStatus, health, risk
 */
export interface MLPayload {
  "Original Cost": number;
  "Expenditure": number;
  "Physical Progress": number;
  "Expenditure %": number;
  "Remaining Budget": number;
  "Progress Gap": number;
  "Planned Duration Days": number;
  "Sector Name": string;
  "Line Ministry": string;
  "Implementing Agency": string;
}

export function buildMLPayload(project: Project): MLPayload {
  return {
    "Original Cost": project.originalCost,
    "Expenditure": project.expenditure,
    "Physical Progress": project.physicalProgress,
    "Expenditure %": project.expenditurePercent,
    "Remaining Budget": project.remainingBudget,
    "Progress Gap": project.progressGap,
    "Planned Duration Days": project.plannedDurationDays,
    "Sector Name": project.sector,
    "Line Ministry": project.ministry,
    "Implementing Agency": project.agency,
  };
}
