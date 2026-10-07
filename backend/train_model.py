"""Train, tune, evaluate, and save Heart Disease Prediction Logistic Regression model.

Machine Learning Pipeline:
- Ingest 13 base clinical parameters from heart.csv
- Engineer derived clinical features (age_thalach_interaction, hypertension, high_cholesterol)
- Stratified 80/20 train/test split
- StandardScaler (Z-score normalization)
- Logistic Regression with L2 Regularization
- 5-Fold Stratified Cross-Validation for optimal C and solver
- Evaluation (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix)

Artifacts saved to backend/models/:
- logistic_model.pkl
- scaler.pkl
- metrics.json
"""

import json
import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler

# Ensure backend directory is in python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from utils.preprocess import FEATURE_ORDER, INPUT_FEATURES, DERIVED_FEATURES

# Column mapping dictionary for dataset ingestion
COLUMN_MAPPING = {
    "Age": "age",
    "Sex": "sex",
    "Chest pain type": "cp",
    "BP": "trestbps",
    "Cholesterol": "chol",
    "FBS over 120": "fbs",
    "EKG results": "restecg",
    "Max HR": "thalach",
    "Exercise angina": "exang",
    "ST depression": "oldpeak",
    "Slope of ST": "slope",
    "Number of vessels fluro": "ca",
    "Thallium": "thal",
}


def main():
    print("=" * 75)
    print("  HEART DISEASE PREDICTION - LOGISTIC REGRESSION TRAINING & TUNING  ")
    print("=" * 75)

    data_path = os.path.join(CURRENT_DIR, "dataset", "heart.csv")
    models_dir = os.path.join(CURRENT_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)

    print(f"\n[1] Loading dataset from: {data_path}")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Required dataset not found at {data_path}.")

    df = pd.read_csv(data_path)
    print(f"Loaded dataset: {df.shape[0]:,} rows, {df.shape[1]} columns")

    # 1. Drop 'id' column if present
    if "id" in df.columns:
        print("\n[2] Dropping 'id' column...")
        df = df.drop(columns=["id"])

    # 2. Rename columns to match INPUT_FEATURES
    cols_to_rename = {k: v for k, v in COLUMN_MAPPING.items() if k in df.columns}
    if cols_to_rename:
        df = df.rename(columns=cols_to_rename)

    # 3. Convert target column ('Heart Disease' -> 'target' with Presence=1, Absence=0)
    target_col_name = "Heart Disease" if "Heart Disease" in df.columns else "target"
    if target_col_name in df.columns:
        if df[target_col_name].dtype == object or isinstance(df[target_col_name].iloc[0], str):
            mapping = {"Presence": 1, "Absence": 0}
            df["target"] = df[target_col_name].map(mapping)
            if target_col_name != "target":
                df = df.drop(columns=[target_col_name])
        else:
            df["target"] = df[target_col_name].astype(int)

    # Sanity checks for input features
    for col in INPUT_FEATURES:
        if col not in df.columns:
            raise KeyError(f"Required feature '{col}' missing from dataset.")
        df[col] = pd.to_numeric(df[col], errors="raise")

    df["target"] = df["target"].astype(int)

    # 4. Feature Engineering: Compute derived features
    print(f"\n[3] Engineering derived clinical features ({len(DERIVED_FEATURES)} features)...")
    df["age_thalach_interaction"] = (df["age"] * df["thalach"]).astype(np.float64)
    df["hypertension"] = (df["trestbps"] >= 140.0).astype(np.float64)
    df["high_cholesterol"] = (df["chol"] >= 240.0).astype(np.float64)

    # Ensure all features in FEATURE_ORDER exist
    for col in FEATURE_ORDER:
        if col not in df.columns:
            raise KeyError(f"Required feature '{col}' missing from engineered dataset.")

    # 5. Train-Test Split (80/20 Stratified)
    print(f"\n[4] Splitting data into 80% train and 20% test sets across {len(FEATURE_ORDER)} features...")
    X = df[FEATURE_ORDER]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"  * Train set: {X_train.shape[0]:,} samples")
    print(f"  * Test set:  {X_test.shape[0]:,} samples")

    # 6. Feature Scaling (StandardScaler)
    print("\n[5] Fitting StandardScaler on training data...")
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=FEATURE_ORDER)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=FEATURE_ORDER)

    # 7. Hyperparameter Tuning: L2-Regularized Logistic Regression
    print("\n" + "-" * 75)
    print("[6] Hyperparameter Tuning: L2 Logistic Regression (GridSearchCV 5-Fold CV)...")
    print("-" * 75)

    lr_param_grid = {
        "C": [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0],
        "solver": ["lbfgs", "liblinear"],
        "class_weight": [None, "balanced"],
        "max_iter": [1000]
    }

    lr_grid = GridSearchCV(
        estimator=LogisticRegression(random_state=42),
        param_grid=lr_param_grid,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="roc_auc",
        n_jobs=-1,
        verbose=1
    )

    lr_start_time = time.time()
    lr_grid.fit(X_train_scaled, y_train)
    lr_tune_time = time.time() - lr_start_time

    best_lr_model = lr_grid.best_estimator_
    print(f"\n  [+] Best L2 Logistic Regression Parameters: {lr_grid.best_params_}")
    print(f"  [+] Best 5-Fold CV ROC-AUC: {lr_grid.best_score_:.4f}")
    print(f"  [+] Logistic Regression training completed in {lr_tune_time:.2f}s")

    lr_y_pred = best_lr_model.predict(X_test_scaled)
    lr_y_prob = best_lr_model.predict_proba(X_test_scaled)[:, 1]

    lr_metrics = {
        "training_time_seconds": round(lr_tune_time, 2),
        "best_params": lr_grid.best_params_,
        "best_cv_roc_auc": round(float(lr_grid.best_score_), 4),
        "accuracy": float(round(accuracy_score(y_test, lr_y_pred), 4)),
        "precision": float(round(precision_score(y_test, lr_y_pred, zero_division=0), 4)),
        "recall": float(round(recall_score(y_test, lr_y_pred, zero_division=0), 4)),
        "f1": float(round(f1_score(y_test, lr_y_pred, zero_division=0), 4)),
        "roc_auc": float(round(roc_auc_score(y_test, lr_y_prob), 4)),
        "confusion_matrix": confusion_matrix(y_test, lr_y_pred).tolist(),
        "model_coefficients": {
            feat: float(round(coef, 4))
            for feat, coef in zip(FEATURE_ORDER, best_lr_model.coef_[0])
        },
        "intercept": float(round(best_lr_model.intercept_[0], 4))
    }

    # 8. Print Evaluation Results
    print("\n" + "=" * 75)
    print("               LOGISTIC REGRESSION EVALUATION METRICS (TEST SET)     ")
    print("=" * 75)
    print(f"  * Best Parameters:  {lr_metrics['best_params']}")
    print(f"  * 5-Fold CV AUC:    {lr_metrics['best_cv_roc_auc']:.4f}")
    print(f"  * Test Accuracy:    {lr_metrics['accuracy'] * 100:.2f}% ({lr_metrics['accuracy']})")
    print(f"  * Test Precision:   {lr_metrics['precision'] * 100:.2f}% ({lr_metrics['precision']})")
    print(f"  * Test Recall:      {lr_metrics['recall'] * 100:.2f}% ({lr_metrics['recall']})")
    print(f"  * Test F1 Score:    {lr_metrics['f1'] * 100:.2f}% ({lr_metrics['f1']})")
    print(f"  * Test ROC-AUC:     {lr_metrics['roc_auc'] * 100:.2f}% ({lr_metrics['roc_auc']})")
    print("  * Confusion Matrix [ [TN, FP], [FN, TP] ]:")
    print(f"      TN={lr_metrics['confusion_matrix'][0][0]:,}, FP={lr_metrics['confusion_matrix'][0][1]:,}")
    print(f"      FN={lr_metrics['confusion_matrix'][1][0]:,}, TP={lr_metrics['confusion_matrix'][1][1]:,}")

    print(f"\n>>> LOGISTIC REGRESSION FEATURE COEFFICIENTS ({len(FEATURE_ORDER)} features):")
    sorted_coefs = sorted(
        lr_metrics["model_coefficients"].items(), key=lambda x: abs(x[1]), reverse=True
    )
    for rank, (feat, coef) in enumerate(sorted_coefs, 1):
        direction = "(+ Risk)" if coef > 0 else "(- Risk)"
        print(f"  {rank:2d}. {feat:<25}: {coef:+.4f} {direction}")

    # 9. Save Model and Scaler Artifacts
    print("\n[7] Saving artifacts to backend/models/ ...")
    joblib.dump(best_lr_model, os.path.join(models_dir, "logistic_model.pkl"))
    joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))

    all_metrics = {
        "dataset_summary": {
            "total_samples": int(df.shape[0]),
            "train_samples": int(X_train.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "features_count": len(FEATURE_ORDER),
            "feature_order": FEATURE_ORDER,
            "input_features": INPUT_FEATURES,
            "derived_features": DERIVED_FEATURES,
            "target_distribution": {
                "Absence (0)": int((df["target"] == 0).sum()),
                "Presence (1)": int((df["target"] == 1).sum())
            }
        },
        "logistic_regression": lr_metrics
    }

    metrics_path = os.path.join(models_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    print("  [+] Saved logistic_model.pkl")
    print("  [+] Saved scaler.pkl")
    print("  [+] Saved metrics.json")
    print(f"\nLogistic Regression training ({len(FEATURE_ORDER)} features) completed successfully!")


if __name__ == "__main__":
    main()
