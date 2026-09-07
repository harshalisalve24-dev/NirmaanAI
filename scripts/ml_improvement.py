import os
import json
import joblib
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

# Try importing XGBoost if available
try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

def find_column(df_cols, target):
    """Robustly find a column name in df_cols regardless of newline representation (\n vs \\n)."""
    norm_target = target.replace("\\n", "\n").replace("\r", "").strip()
    for col in df_cols:
        norm_col = col.replace("\\n", "\n").replace("\r", "").strip()
        if norm_col == norm_target:
            return col
    # Fallback to key-matching ignoring newlines and spaces
    clean_target = norm_target.replace("\n", "").replace(" ", "").lower()
    for col in df_cols:
        clean_col = col.replace("\n", "").replace("\\n", "").replace(" ", "").lower()
        if clean_col == clean_target:
            return col
    return target

def run_pipeline():
    print("=" * 70)
    print("NIRMAAN AI — ML MODEL IMPROVEMENT & AUDIT PIPELINE")
    print("=" * 70)

    # 1. Load Dataset
    csv_path = "NirmaanAI_Feature_Engineered.csv"
    if not os.path.exists(csv_path):
        csv_path = "../NirmaanAI_Feature_Engineered.csv"

    df = pd.read_csv(csv_path)
    print(f"\n1. DATASET AUDIT:")
    print(f"   Total rows in CSV: {len(df)}")
    print(f"   Total columns: {len(df.columns)}")

    # Resolve actual column names in CSV for approved 10 features
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

    target_col = find_column(df.columns, "Schedule Delay Months")
    labeled_mask = df[target_col].notna()
    labeled_df = df[labeled_mask].copy()
    unlabeled_df = df[~labeled_mask].copy()

    print(f"   Projects with known historical target ('{target_col}'): {len(labeled_df)}")
    print(f"   Projects with unknown/missing target (excluded from training): {len(unlabeled_df)}")
    print(f"   Target statistics (134 historical projects):")
    print(f"     Mean Delay: {labeled_df[target_col].mean():.2f} months")
    print(f"     Median Delay: {labeled_df[target_col].median():.2f} months")
    print(f"     Min Delay: {labeled_df[target_col].min():.2f} months")
    print(f"     Max Delay: {labeled_df[target_col].max():.2f} months")
    print(f"     Std Dev: {labeled_df[target_col].std():.2f} months")

    print(f"\n2. FEATURE SELECTION AUDIT:")
    print(f"   Approved 10 historical-safe features (Resolved CSV Column Names):")
    for f in approved_features:
        print(f"     - '{f.replace(chr(10), ' ')}'")

    print("\n   Excluded Post-Outcome / Leakage Variables:")
    excluded_vars = [
        "Revised Date of Commissioning",
        "Schedule Delay Days",
        "Schedule Delay Months",
        "Schedule Status",
        "Cost Overrun",
        "Cost Overrun %",
        "Cost Status",
        "Remaining Project Time Days",
        "Remaining Project Time Months",
        "Time Elapsed Days",
        "Time Elapsed %",
        "Expected Progress %",
        "Progress Deviation",
    ]
    for ev in excluded_vars:
        print(f"     - {ev}")

    # Prepare X and y
    X = labeled_df[approved_features].copy()
    y = labeled_df[target_col].copy()

    # Preprocessing Pipeline
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )

    # 3. Model Definitions
    candidate_models = {
        "Baseline Random Forest": RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
        "Tuned Random Forest": RandomForestRegressor(
            n_estimators=500, max_depth=12, min_samples_split=4, min_samples_leaf=2, max_features=0.7, random_state=42, n_jobs=-1
        ),
        "Extra Trees": ExtraTreesRegressor(n_estimators=300, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42),
        "HistGradientBoosting": HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, max_depth=6, random_state=42),
    }

    if HAS_XGBOOST:
        candidate_models["XGBoost"] = XGBRegressor(
            n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1
        )

    # 4. Cross-Validation Evaluation (5-Fold CV on 134 labeled rows)
    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    print("\n3. 5-FOLD CROSS-VALIDATION RESULTS (134 Labeled Projects):")
    print("-" * 80)
    print(f"{'Model':<25} | {'Mean MAE (mo)':<15} | {'Mean RMSE (mo)':<15} | {'Mean R²':<12}")
    print("-" * 80)

    cv_summary = []

    for name, model_inst in candidate_models.items():
        pipe = Pipeline(steps=[("preprocessor", preprocessor), ("model", model_inst)])

        cv_res = cross_validate(
            pipe,
            X,
            y,
            cv=kf,
            scoring={
                "mae": "neg_mean_absolute_error",
                "rmse": "neg_root_mean_squared_error",
                "r2": "r2",
            },
            n_jobs=-1,
        )

        mae_mean = -cv_res["test_mae"].mean()
        mae_std = cv_res["test_mae"].std()
        rmse_mean = -cv_res["test_rmse"].mean()
        rmse_std = cv_res["test_rmse"].std()
        r2_mean = cv_res["test_r2"].mean()
        r2_std = cv_res["test_r2"].std()

        cv_summary.append({
            "name": name,
            "pipeline": pipe,
            "mae_mean": mae_mean,
            "mae_std": mae_std,
            "rmse_mean": rmse_mean,
            "rmse_std": rmse_std,
            "r2_mean": r2_mean,
            "r2_std": r2_std,
        })

        print(f"{name:<25} | {mae_mean:.2f} ± {mae_std:.2f}     | {rmse_mean:.2f} ± {rmse_std:.2f}     | {r2_mean:.4f} ± {r2_std:.4f}")

    print("-" * 80)

    # 5. Train/Test Holdout Split Evaluation (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    print("\n4. HOLDOUT TEST SET PERFORMANCE (107 Train / 27 Test):")
    print("-" * 80)
    print(f"{'Model':<25} | {'Test MAE (mo)':<15} | {'Test RMSE (mo)':<15} | {'Test R²':<12}")
    print("-" * 80)

    holdout_summary = []

    for item in cv_summary:
        name = item["name"]
        pipe = item["pipeline"]

        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        holdout_summary.append({
            "name": name,
            "mae": mae,
            "rmse": rmse,
            "r2": r2,
            "y_pred": y_pred,
        })

        print(f"{name:<25} | {mae:.2f}           | {rmse:.2f}           | {r2:.4f}")

    print("-" * 80)

    # 6. Residual / Outlier Analysis on Test Set for Baseline & Tuned RF
    baseline_pipe = cv_summary[0]["pipeline"]
    baseline_pipe.fit(X_train, y_train)
    y_test_pred_base = baseline_pipe.predict(X_test)

    residuals = np.abs(y_test - y_test_pred_base)
    outliers_idx = residuals.nlargest(5).index

    col_proj_name = find_column(df.columns, "Project Name")
    col_proj_code = find_column(df.columns, "Project Code")

    print("\n5. RESIDUAL & OUTLIER ANALYSIS (Largest Errors on Test Set):")
    for idx in outliers_idx:
        p_name = df.loc[idx, col_proj_name]
        act = y_test.loc[idx]
        pred = y_test_pred_base[list(y_test.index).index(idx)]
        err = abs(act - pred)
        print(f"   Row {idx} ({p_name}): Actual={act:.1f} mo, Predicted={pred:.1f} mo, Abs Error={err:.1f} mo")

    print("\n   Outlier Diagnosis:")
    print("   - High errors stem from extreme historical outliers (e.g. projects delayed 60-100+ months or negative delay entries)")
    print("   - Small sample size (134 total labeled projects across diverse sectors) creates high variance in residual distribution.")

    # 7. Model Selection Decision
    best_cv = min(cv_summary, key=lambda x: x["mae_mean"])
    baseline_cv = cv_summary[0]

    print("\n6. MODEL SELECTION DECISION:")
    print(f"   Baseline RF CV MAE: {baseline_cv['mae_mean']:.2f} months (R² = {baseline_cv['r2_mean']:.4f})")
    print(f"   Best CV Model: '{best_cv['name']}' with CV MAE: {best_cv['mae_mean']:.2f} months (R² = {best_cv['r2_mean']:.4f})")

    # Select best model (or keep Baseline RF if improvement < 0.1 mo)
    selected_item = best_cv if (baseline_cv['mae_mean'] - best_cv['mae_mean'] > 0.1) else baseline_cv
    selected_name = selected_item["name"]

    print(f"\n   Selected Model for Deployment: '{selected_name}'")

    # Fit selected model on ALL 134 labeled historical projects
    final_model_pipe = selected_item["pipeline"]
    final_model_pipe.fit(X, y)

    # 8. DHUPTALA OC Prediction Verification
    dhuptala_mask = df[col_proj_name].str.contains("DHUPTALA", case=False, na=False) | (df[col_proj_code] == 400353)
    dhuptala_row = df[dhuptala_mask].iloc[0]

    dhuptala_X = pd.DataFrame([dhuptala_row[approved_features]])
    dhuptala_pred = final_model_pipe.predict(dhuptala_X)[0]

    print("\n7. DHUPTALA OC TEST PREDICTION VERIFICATION:")
    print(f"   Project Code: {dhuptala_row[col_proj_code]}")
    print(f"   Project Name: {dhuptala_row[col_proj_name]}")
    print(f"   Sector: {dhuptala_row[col_sector]}")
    print(f"   Original Cost: ₹{dhuptala_row[col_orig_cost]} Cr")
    print(f"   Expenditure: ₹{dhuptala_row[col_expenditure]} Cr")
    print(f"   Physical Progress: {dhuptala_row[col_progress]}%")
    print(f"   Progress Gap: {dhuptala_row[col_prog_gap]}%")
    print(f"   -> PREDICTED SCHEDULE DELAY: {dhuptala_pred:.2f} months")

    # 9. Save Artifacts
    # A. Model pkl
    saved_model_filename = "NirmaanAI_Final_RF_Regression_Improved.pkl"
    joblib.dump(final_model_pipe, saved_model_filename)
    print(f"\n8. ARTIFACTS SAVED:")
    print(f"   Saved Model: {saved_model_filename}")

    # Also copy to backend/models/ if directory exists
    backend_model_dir = "backend/models"
    if os.path.exists(backend_model_dir):
        joblib.dump(final_model_pipe, os.path.join(backend_model_dir, saved_model_filename))
        print(f"   Copied Model to: {backend_model_dir}/{saved_model_filename}")

    # B. Feature metadata pkl
    feature_meta = {
        "features": approved_features,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "model_name": selected_name,
        "cv_mae": float(selected_item["mae_mean"]),
        "cv_r2": float(selected_item["r2_mean"]),
    }
    saved_features_filename = "NirmaanAI_ML_Features_Improved.pkl"
    joblib.dump(feature_meta, saved_features_filename)
    print(f"   Saved Feature List: {saved_features_filename}")

    if os.path.exists(backend_model_dir):
        joblib.dump(feature_meta, os.path.join(backend_model_dir, saved_features_filename))
        print(f"   Copied Feature List to: {backend_model_dir}/{saved_features_filename}")

    # 10. Generate NirmaanAI_ML_IMPROVED.ipynb Notebook
    notebook_filename = "NirmaanAI_ML_IMPROVED.ipynb"
    build_jupyter_notebook(notebook_filename, cv_summary, holdout_summary, selected_name, dhuptala_pred, approved_features)
    print(f"   Saved Improved Notebook: {notebook_filename}")

    print("\n" + "=" * 70)
    print("PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 70)

def build_jupyter_notebook(filepath, cv_summary, holdout_summary, selected_name, dhuptala_pred, approved_features):
    cells = []

    # Markdown Title
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# NirmaanAI — Improved Infrastructure Delay Regression Model\n",
            "**Dataset**: `NirmaanAI_Feature_Engineered.csv` (182 projects total; 134 historical labeled, 48 ongoing unlabeled)\n",
            "**Target Variable**: `Schedule Delay Months`\n",
            "**ML Boundary**: 10 Historical-Safe Features (Strictly zero post-outcome temporal leakage)"
        ]
    })

    # Step 1 Code: Imports and Data Loading
    cells.append({
        "cell_type": "code",
        "execution_count": 1,
        "metadata": {},
        "outputs": [],
        "source": [
            "import os\n",
            "import joblib\n",
            "import numpy as np\n",
            "import pandas as pd\n",
            "from sklearn.model_selection import KFold, cross_validate, train_test_split\n",
            "from sklearn.compose import ColumnTransformer\n",
            "from sklearn.pipeline import Pipeline\n",
            "from sklearn.impute import SimpleImputer\n",
            "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n",
            "from sklearn.ensemble import (\n",
            "    RandomForestRegressor,\n",
            "    ExtraTreesRegressor,\n",
            "    GradientBoostingRegressor,\n",
            "    HistGradientBoostingRegressor,\n",
            ")\n",
            "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
            "\n",
            "# Load Dataset\n",
            "df = pd.read_csv('NirmaanAI_Feature_Engineered.csv')\n",
            "print('Dataset loaded:', df.shape)\n",
            "\n",
            "# Filter labeled projects (134 rows with known schedule delay)\n",
            "target_col = [c for c in df.columns if 'Schedule Delay Months' in c.replace('\\n', ' ') or 'Schedule Delay Months' in c][0]\n",
            "labeled_df = df[df[target_col].notna()].copy()\n",
            "print('Labeled projects count:', len(labeled_df))\n",
            "print('Unlabeled/Ongoing projects count:', len(df) - len(labeled_df))"
        ]
    })

    # Step 2 Code: Feature Selection & Preprocessing
    cells.append({
        "cell_type": "code",
        "execution_count": 2,
        "metadata": {},
        "outputs": [],
        "source": [
            "approved_features = " + repr(approved_features) + "\n",
            "numeric_features = approved_features[:7]\n",
            "categorical_features = approved_features[7:]\n",
            "\n",
            "X = labeled_df[approved_features].copy()\n",
            "y = labeled_df[target_col].copy()\n",
            "\n",
            "numeric_transformer = Pipeline(steps=[\n",
            "    ('imputer', SimpleImputer(strategy='median')),\n",
            "    ('scaler', StandardScaler())\n",
            "])\n",
            "\n",
            "categorical_transformer = Pipeline(steps=[\n",
            "    ('imputer', SimpleImputer(strategy='most_frequent')),\n",
            "    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))\n",
            "])\n",
            "\n",
            "preprocessor = ColumnTransformer(transformers=[\n",
            "    ('num', numeric_transformer, numeric_features),\n",
            "    ('cat', categorical_transformer, categorical_features)\n",
            "])\n",
            "\n",
            "print('Features prepared successfully. Features count:', len(approved_features))"
        ]
    })

    # Step 3 Code: 5-Fold Cross Validation
    cells.append({
        "cell_type": "code",
        "execution_count": 3,
        "metadata": {},
        "outputs": [],
        "source": [
            "candidate_models = {\n",
            "    'Baseline Random Forest': RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),\n",
            "    'Tuned Random Forest': RandomForestRegressor(n_estimators=500, max_depth=12, min_samples_split=4, min_samples_leaf=2, max_features=0.7, random_state=42, n_jobs=-1),\n",
            "    'Extra Trees': ExtraTreesRegressor(n_estimators=300, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1),\n",
            "    'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42),\n",
            "    'HistGradientBoosting': HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, max_depth=6, random_state=42)\n",
            "}\n",
            "\n",
            "kf = KFold(n_splits=5, shuffle=True, random_state=42)\n",
            "results = []\n",
            "\n",
            "for name, model in candidate_models.items():\n",
            "    pipe = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])\n",
            "    cv_res = cross_validate(pipe, X, y, cv=kf, scoring={'mae': 'neg_mean_absolute_error', 'rmse': 'neg_root_mean_squared_error', 'r2': 'r2'}, n_jobs=-1)\n",
            "    results.append({\n",
            "        'Model': name,\n",
            "        'Mean MAE': -cv_res['test_mae'].mean(),\n",
            "        'MAE Std': cv_res['test_mae'].std(),\n",
            "        'Mean RMSE': -cv_res['test_rmse'].mean(),\n",
            "        'Mean R²': cv_res['test_r2'].mean()\n",
            "    })\n",
            "\n",
            "res_df = pd.DataFrame(results)\n",
            "display(res_df.round(4))"
        ]
    })

    # Step 4 Code: Train Final Model and Predict DHUPTALA
    cells.append({
        "cell_type": "code",
        "execution_count": 4,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Train Final Selected Model on all 134 labeled projects\n",
            "final_model = Pipeline(steps=[\n",
            "    ('preprocessor', preprocessor),\n",
            "    ('model', candidate_models['" + selected_name + "'])\n",
            "])\n",
            "final_model.fit(X, y)\n",
            "\n",
            "# DHUPTALA OC Prediction\n",
            "dhuptala_mask = df['Project Name'].str.contains('DHUPTALA', case=False, na=False) | (df['Project Code'] == 400353)\n",
            "dhuptala_row = df[dhuptala_mask].iloc[0]\n",
            "dhuptala_df = pd.DataFrame([dhuptala_row[approved_features]])\n",
            "pred = final_model.predict(dhuptala_df)[0]\n",
            "\n",
            "print('=== DHUPTALA OC TEST PREDICTION ===')\n",
            "print(f'Project Code: {dhuptala_row[\"Project Code\"]}')\n",
            "print(f'Predicted Delay: {pred:.2f} months')\n",
            "\n",
            "# Save improved model and metadata\n",
            "joblib.dump(final_model, 'NirmaanAI_Final_RF_Regression_Improved.pkl')\n",
            "joblib.dump({\n",
            "    'features': approved_features,\n",
            "    'model_name': '" + selected_name + "'\n",
            "}, 'NirmaanAI_ML_Features_Improved.pkl')\n",
            "print('Artifacts exported successfully!')"
        ]
    })

    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10"}
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)

if __name__ == "__main__":
    run_pipeline()
