import os
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def find_column(df_cols, target):
    norm_target = target.replace("\\n", "\n").replace("\r", "").strip()
    for col in df_cols:
        norm_col = col.replace("\\n", "\n").replace("\r", "").strip()
        if norm_col == norm_target:
            return col
    clean_target = norm_target.replace("\n", "").replace(" ", "").lower()
    for col in df_cols:
        clean_col = col.replace("\n", "").replace("\\n", "").replace(" ", "").lower()
        if clean_col == clean_target:
            return col
    return target

def run_audit():
    print("=" * 80)
    print("NIRMAAN AI — FINAL MODEL-SELECTION AUDIT REPORT")
    print("=" * 80)

    # 1. Load Dataset
    csv_path = "NirmaanAI_Feature_Engineered.csv"
    if not os.path.exists(csv_path):
        csv_path = "../NirmaanAI_Feature_Engineered.csv"

    df = pd.read_csv(csv_path)

    # Resolve column names
    col_orig_cost = find_column(df.columns, "Original Cost\n(in cr.)")
    col_expenditure = find_column(df.columns, "Expenditure\n(in cr.)")
    col_progress = find_column(df.columns, "Physical Progress\n(in %)")
    col_exp_pct = find_column(df.columns, "Expenditure %")
    col_rem_budget = find_column(df.columns, "Remaining Budget\n(in cr.)")
    col_prog_gap = find_column(df.columns, "Progress Gap")
    col_duration = find_column(df.columns, "Planned Duration Days")
    col_sector = find_column(df.columns, "Sector Name")
    col_ministry = find_column(df.columns, "Line Ministry")
    col_agency = find_column(df.columns, "Implementing Agency")
    col_target = find_column(df.columns, "Schedule Delay Months")
    col_proj_name = find_column(df.columns, "Project Name")
    col_proj_code = find_column(df.columns, "Project Code")

    numeric_features = [
        col_orig_cost,
        col_expenditure,
        col_progress,
        col_exp_pct,
        col_rem_budget,
        col_prog_gap,
        col_duration,
    ]

    categorical_features = [
        col_sector,
        col_ministry,
        col_agency,
    ]

    approved_features = numeric_features + categorical_features

    # Filter 134 known-outcome projects
    labeled_mask = df[col_target].notna()
    labeled_df = df[labeled_mask].copy()

    X_all = labeled_df[approved_features].copy()
    y_all = labeled_df[col_target].copy()

    print(f"\n1. DATASET & TRAIN/TEST SPLIT AUDIT:")
    print(f"   - Total rows in CSV: {len(df)}")
    print(f"   - Known-outcome historical projects: {len(labeled_df)}")
    print(f"   - Unknown-outcome projects (excluded): {len(df) - len(labeled_df)}")

    # 107 / 27 Train-Test Split (fixed random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y_all, test_size=0.20, random_state=42
    )

    print(f"   - Training set size (107 projects): {len(X_train)}")
    print(f"   - Holdout test set size (27 projects): {len(X_test)}")
    print(f"   - Training set target mean: {y_train.mean():.2f} months (std: {y_train.std():.2f})")
    print(f"   - Holdout test target mean: {y_test.mean():.2f} months (std: {y_test.std():.2f})")

    # Preprocessing
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features),
    ])

    # Models
    candidate_models = {
        "1. Baseline Random Forest": RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
        "2. Tuned Random Forest": RandomForestRegressor(
            n_estimators=500, max_depth=12, min_samples_split=4, min_samples_leaf=2, max_features=0.7, random_state=42, n_jobs=-1
        ),
        "3. Extra Trees": ExtraTreesRegressor(n_estimators=300, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1),
        "4. Gradient Boosting": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42),
        "5. HistGradientBoosting": HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, max_depth=6, random_state=42),
    }

    # 2. 5-Fold Cross Validation ON TRAINING SET ONLY (107 Projects)
    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    print("\n2. 5-FOLD CROSS-VALIDATION ON TRAINING SET ONLY (107 Projects):")
    print("=" * 95)
    print(f"{'Candidate Model':<28} | {'CV MAE (mean ± std)':<22} | {'CV RMSE (mean ± std)':<22} | {'CV R² (mean ± std)':<18}")
    print("=" * 95)

    cv_results_store = {}

    for name, model_inst in candidate_models.items():
        pipe = Pipeline([("preprocessor", preprocessor), ("model", model_inst)])

        cv_res = cross_validate(
            pipe,
            X_train,
            y_train,
            cv=kf,
            scoring={
                "mae": "neg_mean_absolute_error",
                "rmse": "neg_root_mean_squared_error",
                "r2": "r2",
            },
            n_jobs=-1,
        )

        mae_m, mae_s = -cv_res["test_mae"].mean(), cv_res["test_mae"].std()
        rmse_m, rmse_s = -cv_res["test_rmse"].mean(), cv_res["test_rmse"].std()
        r2_m, r2_s = cv_res["test_r2"].mean(), cv_res["test_r2"].std()

        cv_results_store[name] = {
            "pipe": pipe,
            "mae_m": mae_m, "mae_s": mae_s,
            "rmse_m": rmse_m, "rmse_s": rmse_s,
            "r2_m": r2_m, "r2_s": r2_s,
            "fold_maes": -cv_res["test_mae"],
        }

        print(f"{name:<28} | {mae_m:5.2f} ± {mae_s:4.2f} mo         | {rmse_m:5.2f} ± {rmse_s:4.2f} mo         | {r2_m:6.4f} ± {r2_s:5.4f}")

    print("=" * 95)

    # Detailed fold MAE breakdown
    print("\n3. CROSS-VALIDATION MAE BY FOLD (107 Training Projects):")
    print("-" * 95)
    print(f"{'Candidate Model':<28} | {'Fold 1':<8} | {'Fold 2':<8} | {'Fold 3':<8} | {'Fold 4':<8} | {'Fold 5':<8}")
    print("-" * 95)
    for name, res in cv_results_store.items():
        f_str = " | ".join([f"{val:6.2f}" for val in res["fold_maes"]])
        print(f"{name:<28} | {f_str}")
    print("-" * 95)

    # 3. Holdout Test Set Evaluation (27 Projects - Untouched)
    print("\n4. HOLDOUT TEST SET EVALUATION (27 Projects Untouched):")
    print("=" * 80)
    print(f"{'Candidate Model':<28} | {'Test MAE (mo)':<15} | {'Test RMSE (mo)':<15} | {'Test R²':<12}")
    print("=" * 80)

    dhuptala_mask = df[col_proj_name].str.contains("DHUPTALA", case=False, na=False) | (df[col_proj_code] == 400353)
    dhuptala_row = df[dhuptala_mask].iloc[0]
    dhuptala_X = pd.DataFrame([dhuptala_row[approved_features]])

    dhuptala_preds = {}

    for name, res in cv_results_store.items():
        pipe = res["pipe"]
        pipe.fit(X_train, y_train)

        y_pred_test = pipe.predict(X_test)
        t_mae = mean_absolute_error(y_test, y_pred_test)
        t_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
        t_r2 = r2_score(y_test, y_pred_test)

        res["test_mae"] = t_mae
        res["test_rmse"] = t_rmse
        res["test_r2"] = t_r2

        # DHUPTALA Prediction
        dh_p = pipe.predict(dhuptala_X)[0]
        dhuptala_preds[name] = dh_p

        print(f"{name:<28} | {t_mae:5.2f}           | {t_rmse:5.2f}           | {t_r2:6.4f}")

    print("=" * 80)

    # 4. DHUPTALA OC Prediction Comparison
    print("\n5. DHUPTALA OC (400353) PREDICTIONS ACROSS MODELS:")
    print("-" * 65)
    print(f"{'Candidate Model':<28} | {'Predicted Delay (Months)':<25}")
    print("-" * 65)
    for name, pred_val in dhuptala_preds.items():
        print(f"{name:<28} | {pred_val:6.2f} months")
    print("-" * 65)

    print("\n" + "=" * 80)
    print("FINAL AUDIT COMPLETE.")
    print("=" * 80)

if __name__ == "__main__":
    run_audit()
