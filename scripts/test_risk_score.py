import sys
import os

# Add backend directory to sys.path
backend_path = os.path.abspath("backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from risk_score import calculate_risk_score

def test_dhuptala_risk_score():
    print("=" * 60)
    print("NIRMAAN AI — REVISED RISK SCORE UNIT TEST")
    print("=" * 60)

    # DHUPTALA OC (Project Code 400353) Test Case
    pred_delay = 20.57
    exp_pct = 24.57
    phys_prog = 19.0

    score, level = calculate_risk_score(
        predicted_delay_months=pred_delay,
        expenditure_percent=exp_pct,
        physical_progress=phys_prog,
    )

    print(f"Inputs:")
    print(f"  - Predicted Delay Months: {pred_delay} months")
    print(f"  - Expenditure %: {exp_pct}%")
    print(f"  - Physical Progress: {phys_prog}%")
    print(f"  - Progress Gap (Expenditure % - Physical Progress %): {exp_pct - phys_prog:.2f}%")
    print(f"\nOutputs:")
    print(f"  - Calculated Risk Score: {score} / 100")
    print(f"  - Assigned Risk Level: {level}")

    # Assertions
    assert abs(score - 38.9) < 0.2, f"Expected score ~38.9, got {score}"
    assert level == "Medium", f"Expected level 'Medium', got {level}"

    print("\n✅ DHUPTALA TEST PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_dhuptala_risk_score()
