import os
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
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

def run_oof_percentile_audit():
    csv_path = "NirmaanAI_Feature_Engineered.csv"
    if not os.path.exists(csv_path):
        csv_path = "../NirmaanAI_Feature_Engineered.csv"

    df = pd.read_csv(csv_path)

    # Resolve column names
    col_target = find_column(df.columns, "Schedule Delay Months")
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
        col_orig_cost, col_expenditure, col_progress, col_exp_pct, col_rem_budget, col_prog_gap, col_duration
    ]
    categorical_features = [col_sector, col_ministry, col_agency]
    approved_features = numeric_features + categorical_features

    # Filter 134 known-outcome projects
    labeled_mask = df[col_target].notna()
    labeled_df = df[labeled_mask].copy().reset_index(drop=True)

    # Calculate Progress Gap explicitly: Expenditure % - Physical Progress %
    exp_pct_series = pd.to_numeric(labeled_df[col_exp_pct], errors='coerce')
    phys_prog_series = pd.to_numeric(labeled_df[col_progress], errors='coerce')
    calculated_progress_gap = exp_pct_series - phys_prog_series
    labeled_df["Calculated_Progress_Gap"] = calculated_progress_gap

    # Overwrite the feature in X dataframe with calculated progress gap
    X = labeled_df[approved_features].copy()
    X[col_prog_gap] = calculated_progress_gap

    y = pd.to_numeric(labeled_df[col_target], errors='coerce')

    # Preprocessing Pipeline setup
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    # Out-Of-Fold (OOF) predictions array
    oof_predictions = np.zeros(len(labeled_df))

    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    for train_idx, val_idx in kf.split(X, y):
        X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
        X_val = X.iloc[val_idx]

        # Re-create pipeline instance per fold to guarantee zero leakage across folds
        preprocessor = ColumnTransformer([
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ])

        rf_pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("model", RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1))
        ])

        rf_pipe.fit(X_tr, y_tr)
        oof_predictions[val_idx] = rf_pipe.predict(X_val)

    labeled_df["OOF_ML_Predicted_Delay"] = oof_predictions

    # OOF Overall Metrics
    oof_mae = mean_absolute_error(y, oof_predictions)
    oof_rmse = np.sqrt(mean_squared_error(y, oof_predictions))
    oof_r2 = r2_score(y, oof_predictions)

    print("=" * 95)
    print("OUT-OF-FOLD (OOF) DATASET DISTRIBUTION AUDIT (134 Known-Outcome Historical Projects)")
    print("=" * 95)
    print(f"Number of Labeled Projects: {len(labeled_df)}")
    print(f"Number of Cross-Validation Folds: {kf.n_splits}")
    print(f"Mean OOF MAE  : {oof_mae:.4f} months")
    print(f"Mean OOF RMSE : {oof_rmse:.4f} months")
    print(f"Mean OOF R²   : {oof_r2:.4f}")
    print("=" * 95)

    vars_to_analyze = {
        "Actual Schedule Delay Months": y,
        "OOF ML-Predicted Delay (Months)": labeled_df["OOF_ML_Predicted_Delay"],
        "Calculated Progress Gap (%)": labeled_df["Calculated_Progress_Gap"],
        "Physical Progress (%)": phys_prog_series,
        "Planned Duration Days": pd.to_numeric(labeled_df[col_duration], errors='coerce'),
        "Expenditure %": exp_pct_series,
        "Remaining Budget (in cr.)": pd.to_numeric(labeled_df[col_rem_budget], errors='coerce'),
    }

    print(f"{'Variable':<38} | {'Min':<8} | {'25%':<8} | {'Median':<8} | {'75%':<8} | {'90%':<8} | {'95%':<8} | {'Max':<8}")
    print("-" * 95)

    percentiles = [0, 25, 50, 75, 90, 95, 100]
    for var_name, s in vars_to_analyze.items():
        vals = np.percentile(s.dropna(), percentiles)
        print(f"{var_name:<38} | {vals[0]:<8.2f} | {vals[1]:<8.2f} | {vals[2]:<8.2f} | {vals[3]:<8.2f} | {vals[4]:<8.2f} | {vals[5]:<8.2f} | {vals[6]:<8.2f}")

    print("=" * 95)

if __name__ == "__main__":
    run_oof_percentile_audit()
