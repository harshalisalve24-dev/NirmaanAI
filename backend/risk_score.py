"""
NirmaanAI Risk Score Calculator

Formula:
Risk Score = 0.60 * R_Delay + 0.25 * R_Gap + 0.15 * R_BudgetPressure

Components:
1. R_Delay = min(100, max(0, predicted_delay_months / 36 * 100))
2. R_Gap = max(0, min(100, (expenditure_percent - physical_progress) / 30 * 100))
3. R_BudgetPressure = max(0, min(100, (expenditure_percent - 75) / 25 * 100))

Risk Levels:
- Low: 0 to <30
- Medium: 30 to <50
- High: 50 to <70
- Critical: 70 to 100
"""

def calculate_risk_score(
    predicted_delay_months: float,
    expenditure_percent: float,
    physical_progress: float,
) -> tuple[float, str]:
    """
    Calculate the composite NirmaanAI Risk Score (0-100) and risk level classification.
    Handles missing/invalid inputs safely.
    """
    # Safe numerical conversions
    try:
        delay_months = max(0.0, float(predicted_delay_months))
    except (ValueError, TypeError):
        delay_months = 0.0

    try:
        exp_pct = float(expenditure_percent)
    except (ValueError, TypeError):
        exp_pct = 0.0

    try:
        phys_prog = float(physical_progress)
    except (ValueError, TypeError):
        phys_prog = 0.0

    # 1. R_Delay
    r_delay = min(100.0, max(0.0, (delay_months / 36.0) * 100.0))

    # 2. R_Gap
    progress_gap = exp_pct - phys_prog
    r_gap = max(0.0, min(100.0, (progress_gap / 30.0) * 100.0))

    # 3. R_BudgetPressure
    r_budget_pressure = max(0.0, min(100.0, ((exp_pct - 75.0) / 25.0) * 100.0))

    # Weighted Composite Score
    score = (0.60 * r_delay) + (0.25 * r_gap) + (0.15 * r_budget_pressure)
    score_rounded = round(score, 1)

    # Risk Level Classification
    if score_rounded < 30.0:
        level = "Low"
    elif score_rounded < 50.0:
        level = "Medium"
    elif score_rounded < 70.0:
        level = "High"
    else:
        level = "Critical"

    return score_rounded, level
