"""Advanced ML analysis utilities for Heart Disease Prediction (Phase 2).

Provides helper functions for:
- What-If risk simulation (comparing baseline vs modified patient inputs)
- Feature sensitivity analysis (varying 13 clinical inputs to observe probability swings)
- Threshold & confusion matrix analysis (operating points on held-out test set)
- Logistic regression model coefficient explanations (standardized feature weights)
"""

import math
import numpy as np
import pandas as pd
try:
    from utils.preprocess import (
        FEATURE_ORDER,
        INPUT_FEATURES,
        FEATURE_SCHEMA,
        FEATURE_DISPLAY_NAMES,
        transform_input,
        validate_input,
    )
except ImportError:
    from backend.utils.preprocess import (
        FEATURE_ORDER,
        INPUT_FEATURES,
        FEATURE_SCHEMA,
        FEATURE_DISPLAY_NAMES,
        transform_input,
        validate_input,
    )


def get_risk_level(probability_percentage: float) -> str:
    """Determine presentational risk band from probability percentage.
    0-30%   -> Low Risk
    30-70%  -> Moderate Risk
    70-100% -> High Risk
    """
    if probability_percentage >= 70.0:
        return "High Risk"
    elif probability_percentage >= 30.0:
        return "Moderate Risk"
    return "Low Risk"


def compute_prediction_for_payload(payload: dict, model, scaler):
    """Run full preprocessing, scaling, and logistic regression prediction for a validated payload.

    Returns:
        (prediction: int, probability_percent: float, risk_level: str, features_scaled: np.ndarray, raw_features: np.ndarray)
    """
    raw_array = transform_input(payload)
    raw_df = pd.DataFrame(raw_array, columns=FEATURE_ORDER)
    scaled_array = scaler.transform(raw_df)
    scaled_df = pd.DataFrame(scaled_array, columns=FEATURE_ORDER)

    pred = int(model.predict(scaled_df)[0])
    prob_raw = float(model.predict_proba(scaled_df)[0][1])
    prob_percent = round(prob_raw * 100, 2)
    risk_level = get_risk_level(prob_percent)

    return pred, prob_percent, risk_level, scaled_array, raw_array


def compute_what_if_comparison(baseline_payload: dict, modified_payload: dict, model, scaler, compute_contributions_func=None):
    """Compute before/after comparative simulation for What-If Analysis.

    Returns:
        dict containing baseline stats, modified stats, delta metrics, and changed feature highlights.
    """
    base_pred, base_prob, base_risk, base_scaled, base_raw = compute_prediction_for_payload(
        baseline_payload, model, scaler
    )
    mod_pred, mod_prob, mod_risk, mod_scaled, mod_raw = compute_prediction_for_payload(
        modified_payload, model, scaler
    )

    delta_prob = round(mod_prob - base_prob, 2)

    if delta_prob > 0.05:
        direction = "increased"
    elif delta_prob < -0.05:
        direction = "decreased"
    else:
        direction = "no_change"

    # Identify which of the 13 clinical features were modified
    changed_features = []
    for feat in INPUT_FEATURES:
        b_val = baseline_payload.get(feat)
        m_val = modified_payload.get(feat)
        try:
            b_float = float(b_val)
            m_float = float(m_val)
            if abs(b_float - m_float) > 1e-5:
                changed_features.append({
                    "feature_key": feat,
                    "feature_name": FEATURE_DISPLAY_NAMES.get(feat, feat),
                    "baseline_value": b_float,
                    "modified_value": m_float,
                    "diff": round(m_float - b_float, 2)
                })
        except (ValueError, TypeError):
            if str(b_val) != str(m_val):
                changed_features.append({
                    "feature_key": feat,
                    "feature_name": FEATURE_DISPLAY_NAMES.get(feat, feat),
                    "baseline_value": b_val,
                    "modified_value": m_val,
                    "diff": None
                })

    baseline_contributions = []
    modified_contributions = []
    if compute_contributions_func:
        baseline_contributions = compute_contributions_func(base_scaled, base_raw)
        modified_contributions = compute_contributions_func(mod_scaled, mod_raw)

    return {
        "baseline": {
            "prediction": base_pred,
            "probability": base_prob,
            "risk_level": base_risk,
            "inputs": {feat: baseline_payload.get(feat) for feat in INPUT_FEATURES},
            "contributing_features": baseline_contributions
        },
        "modified": {
            "prediction": mod_pred,
            "probability": mod_prob,
            "risk_level": mod_risk,
            "inputs": {feat: modified_payload.get(feat) for feat in INPUT_FEATURES},
            "contributing_features": modified_contributions
        },
        "delta": {
            "probability_points": delta_prob,
            "direction": direction,
            "changed_features_count": len(changed_features),
            "changed_features": changed_features
        }
    }


def get_feature_variation_points(feature_key: str, current_val: float):
    """Generate meaningful test points for a clinical feature to evaluate sensitivity.

    Returns:
        List of (value, label) tuples.
    """
    schema = FEATURE_SCHEMA.get(feature_key, {})
    kind = schema.get("type", "float")

    if kind == "categorical":
        allowed = schema.get("allowed", [])
        if feature_key == "sex":
            return [(0, "Female (0)"), (1, "Male (1)")]
        elif feature_key == "cp":
            return [
                (1, "Typical Angina (1)"),
                (2, "Atypical Angina (2)"),
                (3, "Non-Anginal (3)"),
                (4, "Asymptomatic (4)"),
            ]
        elif feature_key == "fbs":
            return [(0, "Normal ≤120 (0)"), (1, "Elevated >120 (1)")]
        elif feature_key == "restecg":
            return [
                (0, "Normal (0)"),
                (1, "ST-T Abnormality (1)"),
                (2, "LV Hypertrophy (2)"),
            ]
        elif feature_key == "exang":
            return [(0, "No Angina (0)"), (1, "Yes Angina (1)")]
        elif feature_key == "slope":
            return [(1, "Upsloping (1)"), (2, "Flat (2)"), (3, "Downsloping (3)")]
        elif feature_key == "ca":
            return [(0, "0 Vessels"), (1, "1 Vessel"), (2, "2 Vessels"), (3, "3 Vessels")]
        elif feature_key == "thal":
            return [
                (3, "Normal Flow (3)"),
                (6, "Fixed Defect (6)"),
                (7, "Reversible Defect (7)"),
            ]
        return [(val, str(val)) for val in allowed]

    # Continuous / numerical features
    min_bound = schema.get("min", 0.0)
    max_bound = schema.get("max", 300.0)
    curr = float(current_val)

    if feature_key == "age":
        steps = [-20, -15, -10, -5, 0, 5, 10, 15, 20]
        pts = sorted(list(set(int(np.clip(curr + s, min_bound, max_bound)) for s in steps)))
        return [(val, f"{val} yrs") for val in pts]

    elif feature_key == "trestbps":
        steps = [-30, -20, -10, 0, 10, 20, 30]
        pts = sorted(list(set(int(np.clip(curr + s, min_bound, max_bound)) for s in steps)))
        return [(val, f"{val} mm Hg") for val in pts]

    elif feature_key == "chol":
        steps = [-60, -40, -20, 0, 20, 40, 60]
        pts = sorted(list(set(int(np.clip(curr + s, min_bound, max_bound)) for s in steps)))
        return [(val, f"{val} mg/dl") for val in pts]

    elif feature_key == "thalach":
        steps = [-30, -20, -10, 0, 10, 20, 30]
        pts = sorted(list(set(int(np.clip(curr + s, min_bound, max_bound)) for s in steps)))
        return [(val, f"{val} bpm") for val in pts]

    elif feature_key == "oldpeak":
        # Standard clinical ST depression test spectrum
        pts = sorted(list(set([0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, round(curr, 1)])))
        return [(val, f"{val:.1f} mm") for val in pts]

    # Generic fallback
    pts = sorted(list(set([max(min_bound, curr * 0.8), curr, min(max_bound, curr * 1.2)])))
    return [(round(val, 1), str(round(val, 1))) for val in pts]


def compute_all_feature_sensitivity(patient_payload: dict, model, scaler):
    """Compute sensitivity curve and sensitivity magnitude across all 13 clinical features.

    Varies each feature while keeping other 12 features constant at patient_payload values.

    Returns:
        dict containing baseline probability and sorted list of feature sensitivity profiles.
    """
    _, base_prob, base_risk, _, _ = compute_prediction_for_payload(patient_payload, model, scaler)

    features_sensitivity = []

    for feat in INPUT_FEATURES:
        curr_val = float(patient_payload[feat])
        variation_points = get_feature_variation_points(feat, curr_val)

        # Batch transform all variation points
        rows = []
        for val, _ in variation_points:
            test_dict = dict(patient_payload)
            test_dict[feat] = val
            rows.append(transform_input(test_dict)[0])

        rows_df = pd.DataFrame(rows, columns=FEATURE_ORDER)
        scaled_rows = pd.DataFrame(scaler.transform(rows_df), columns=FEATURE_ORDER)
        probs = model.predict_proba(scaled_rows)[:, 1] * 100.0

        points_data = []
        min_p = float("inf")
        max_p = float("-inf")

        for idx, (val, label) in enumerate(variation_points):
            p = round(float(probs[idx]), 2)
            delta = round(p - base_prob, 2)
            min_p = min(min_p, p)
            max_p = max(max_p, p)

            if delta > 0.05:
                direction = "increases_risk"
            elif delta < -0.05:
                direction = "decreases_risk"
            else:
                direction = "neutral"

            is_current = bool(abs(float(val) - curr_val) < 1e-4)

            points_data.append({
                "value": val,
                "label": label,
                "probability": p,
                "delta": delta,
                "direction": direction,
                "is_current": is_current
            })

        swing = round(max_p - min_p, 2)

        # Determine general direction with respect to increasing value
        if len(points_data) >= 2:
            first_p = points_data[0]["probability"]
            last_p = points_data[-1]["probability"]
            if last_p > first_p + 1.0:
                direction_trend = "positive"  # Increasing feature value increases risk
            elif last_p < first_p - 1.0:
                direction_trend = "negative"  # Increasing feature value decreases risk (protective)
            else:
                direction_trend = "mixed"
        else:
            direction_trend = "neutral"

        features_sensitivity.append({
            "feature_key": feat,
            "feature_name": FEATURE_DISPLAY_NAMES.get(feat, feat),
            "current_value": curr_val,
            "unit": FEATURE_SCHEMA.get(feat, {}).get("unit", ""),
            "baseline_probability": base_prob,
            "min_probability": min_p,
            "max_probability": max_p,
            "sensitivity_swing": swing,
            "sensitivity_magnitude": swing,
            "direction_trend": direction_trend,
            "points": points_data
        })

    # Sort descending by sensitivity swing
    features_sensitivity.sort(key=lambda x: x["sensitivity_swing"], reverse=True)

    return {
        "baseline_probability": base_prob,
        "baseline_risk_level": base_risk,
        "features_sensitivity": features_sensitivity
    }


def get_model_coefficients_data(model):
    """Retrieve and format model coefficients and feature explanations directly from trained Logistic Regression."""
    coefs = model.coef_[0]
    intercept = float(model.intercept_[0])

    items = []
    for idx, feat in enumerate(FEATURE_ORDER):
        c = float(coefs[idx])
        is_derived = feat not in INPUT_FEATURES
        direction = "positive" if c > 0 else "negative"

        items.append({
            "feature_key": feat,
            "feature_name": FEATURE_DISPLAY_NAMES.get(feat, feat),
            "coefficient": round(c, 4),
            "absolute_coefficient": round(abs(c), 4),
            "direction": direction,
            "is_derived": is_derived,
            "description": FEATURE_SCHEMA.get(feat, {}).get("description", f"Engineered clinical interaction term ({feat})")
        })

    # Sort descending by absolute coefficient magnitude
    items_sorted = sorted(items, key=lambda x: x["absolute_coefficient"], reverse=True)

    return {
        "coefficients": items_sorted,
        "intercept": round(intercept, 4),
        "total_features": len(FEATURE_ORDER),
        "regularization": "L2 Regularization (Ridge penalty)",
        "scaler_note": "This visualization shows how the trained Logistic Regression model weights standardized input features. Coefficients correspond to the standardized feature representation (Z-score normalized by StandardScaler)."
    }
