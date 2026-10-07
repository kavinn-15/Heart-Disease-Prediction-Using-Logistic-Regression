"""Train, evaluate, and save the 4-Feature Quick Risk Check Logistic Regression model.

Features:
- age: Age in years
- sex: Biological Sex (0 = Female, 1 = Male)
- bp: Blood Pressure (mm Hg)
- max_hr: Maximum Heart Rate achieved (bpm)

Target:
- target: Heart Disease Presence (1) vs Absence (0)

Pipeline:
- Stratified 80/20 train/test split (random_state=42)
- StandardScaler fitted strictly on training data
- L2 Regularized Logistic Regression with 5-fold Stratified Cross-Validation
- Comprehensive evaluation on held-out 126,000 test set records
- Artifacts saved to backend/models/:
  * quick_logistic_model.pkl
  * quick_scaler.pkl
  * quick_metrics.json
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

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

QUICK_FEATURE_ORDER = ["age", "sex", "bp", "max_hr"]

QUICK_FEATURE_SCHEMA = {
    "age": {
        "type": "int",
        "min": 18,
        "max": 120,
        "description": "Age in years",
        "unit": "years"
    },
    "sex": {
        "type": "categorical",
        "allowed": [0, 1],
        "description": "Biological Sex (0 = Female, 1 = Male)"
    },
    "bp": {
        "type": "float",
        "min": 50.0,
        "max": 260.0,
        "description": "Blood Pressure (BP)",
        "unit": "mm Hg"
    },
    "max_hr": {
        "type": "float",
        "min": 50.0,
        "max": 250.0,
        "description": "Heart Rate (Max HR)",
        "unit": "bpm"
    }
}

QUICK_FEATURE_DISPLAY_NAMES = {
    "age": "Age",
    "sex": "Biological Sex",
    "bp": "Blood Pressure (BP)",
    "max_hr": "Heart Rate (Max HR)"
}


def main():
    print("=" * 75)
    print("   HEART DISEASE PREDICTION — QUICK RISK CHECK (4 FEATURES) TRAINING   ")
    print("=" * 75)

    data_path = os.path.join(CURRENT_DIR, "dataset", "heart.csv")
    models_dir = os.path.join(CURRENT_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)

    print(f"\n[1] Loading dataset from: {data_path}")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Required dataset not found at {data_path}.")

    cols = ["Age", "Sex", "BP", "Max HR", "Heart Disease"]
    df = pd.read_csv(data_path, usecols=cols)
    print(f"Loaded {df.shape[0]:,} rows with columns: {cols}")

    # Rename to canonical lowercase names
    df = df.rename(columns={
        "Age": "age",
        "Sex": "sex",
        "BP": "bp",
        "Max HR": "max_hr",
        "Heart Disease": "target"
    })

    # Encode target: 'Presence' -> 1, 'Absence' -> 0
    if df["target"].dtype == object or isinstance(df["target"].iloc[0], str):
        df["target"] = df["target"].map({"Presence": 1, "Absence": 0}).astype(int)
    else:
        df["target"] = df["target"].astype(int)

    for col in QUICK_FEATURE_ORDER:
        df[col] = pd.to_numeric(df[col], errors="raise")

    # 80/20 Stratified Split
    print(f"\n[2] Performing 80/20 Stratified Train/Test split across {len(QUICK_FEATURE_ORDER)} features...")
    X = df[QUICK_FEATURE_ORDER]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"  * Training set: {X_train.shape[0]:,} samples")
    print(f"  * Test set:     {X_test.shape[0]:,} samples")
    print(f"  * Target distribution in test set:")
    print(f"      Absence (0):  {(y_test == 0).sum():,} ({((y_test == 0).sum() / len(y_test))*100:.1f}%)")
    print(f"      Presence (1): {(y_test == 1).sum():,} ({((y_test == 1).sum() / len(y_test))*100:.1f}%)")

    # Fit StandardScaler strictly on training data
    print("\n[3] Fitting StandardScaler strictly on training data...")
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=QUICK_FEATURE_ORDER)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=QUICK_FEATURE_ORDER)

    # Hyperparameter tuning with Stratified 5-Fold Cross Validation
    print("\n[4] Hyperparameter tuning with 5-Fold Stratified CV (scoring: roc_auc)...")
    param_grid = {
        "C": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0],
        "solver": ["lbfgs", "liblinear"],
        "class_weight": [None, "balanced"],
        "max_iter": [1000]
    }

    grid = GridSearchCV(
        estimator=LogisticRegression(random_state=42),
        param_grid=param_grid,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="roc_auc",
        n_jobs=-1,
        verbose=1
    )

    t0 = time.time()
    grid.fit(X_train_scaled, y_train)
    tune_time = time.time() - t0

    best_model = grid.best_estimator_
    print(f"  [+] Best Hyperparameters: {grid.best_params_}")
    print(f"  [+] Best 5-Fold CV ROC-AUC: {grid.best_score_:.4f}")
    print(f"  [+] Training finished in {tune_time:.2f}s")

    # Evaluate on held-out test set
    print("\n[5] Evaluating on held-out test set (126,000 samples)...")
    y_pred = best_model.predict(X_test_scaled)
    y_prob = best_model.predict_proba(X_test_scaled)[:, 1]

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    acc = float(round(accuracy_score(y_test, y_pred), 4))
    prec = float(round(precision_score(y_test, y_pred, zero_division=0), 4))
    rec = float(round(recall_score(y_test, y_pred, zero_division=0), 4))
    f1 = float(round(f1_score(y_test, y_pred, zero_division=0), 4))
    auc = float(round(roc_auc_score(y_test, y_prob), 4))

    print("=" * 75)
    print("           QUICK MODEL LOGISTIC REGRESSION EVALUATION METRICS          ")
    print("=" * 75)
    print(f"  * Accuracy:     {acc * 100:.2f}% ({acc})")
    print(f"  * Precision:    {prec * 100:.2f}% ({prec})")
    print(f"  * Recall:       {rec * 100:.2f}% ({rec})")
    print(f"  * F1-Score:     {f1 * 100:.2f}% ({f1})")
    print(f"  * ROC-AUC:      {auc * 100:.2f}% ({auc})")
    print(f"  * 5-Fold CV:    {grid.best_score_ * 100:.2f}% ({grid.best_score_:.4f})")
    print(f"  * Confusion Matrix:")
    print(f"      TN = {tn:,}   FP = {fp:,}")
    print(f"      FN = {fn:,}   TP = {tp:,}")

    print("\n>>> MODEL COEFFICIENTS (Standardized weights w_i):")
    coefs = {}
    for feat, w in zip(QUICK_FEATURE_ORDER, best_model.coef_[0]):
        coefs[feat] = float(round(w, 4))
        direction = "(+ Risk)" if w > 0 else "(- Risk)"
        print(f"  - {QUICK_FEATURE_DISPLAY_NAMES[feat]:<25}: {w:+.4f} {direction}")
    intercept = float(round(best_model.intercept_[0], 4))
    print(f"  - Intercept (beta_0): {intercept:+.4f}")

    # Save artifacts
    print("\n[6] Saving Quick model artifacts to backend/models/ ...")
    model_file = os.path.join(models_dir, "quick_logistic_model.pkl")
    scaler_file = os.path.join(models_dir, "quick_scaler.pkl")
    metrics_file = os.path.join(models_dir, "quick_metrics.json")

    joblib.dump(best_model, model_file)
    joblib.dump(scaler, scaler_file)

    metrics_payload = {
        "model_name": "Quick Logistic Regression (4 Features)",
        "features": QUICK_FEATURE_ORDER,
        "feature_display_names": QUICK_FEATURE_DISPLAY_NAMES,
        "dataset_summary": {
            "total_samples": int(df.shape[0]),
            "train_samples": int(X_train.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "features_count": len(QUICK_FEATURE_ORDER),
            "target_distribution": {
                "Absence (0)": int((df["target"] == 0).sum()),
                "Presence (1)": int((df["target"] == 1).sum())
            }
        },
        "logistic_regression": {
            "training_time_seconds": round(tune_time, 2),
            "best_params": grid.best_params_,
            "best_cv_roc_auc": round(float(grid.best_score_), 4),
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "roc_auc": auc,
            "confusion_matrix": cm.tolist(),
            "counts": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp)
            },
            "model_coefficients": coefs,
            "intercept": intercept
        }
    }

    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"  [+] Saved {model_file}")
    print(f"  [+] Saved {scaler_file}")
    print(f"  [+] Saved {metrics_file}")
    print("\nQuick Model training and evaluation completed successfully!")


if __name__ == "__main__":
    main()
