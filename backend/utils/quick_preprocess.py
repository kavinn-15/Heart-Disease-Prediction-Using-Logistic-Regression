"""Preprocessing and validation utilities for Quick Risk Check (4-Feature Model).

Features:
- age: Age in years (18-120)
- sex: Biological Sex (0 = Female, 1 = Male)
- bp: Blood Pressure (50-260 mm Hg)
- max_hr: Maximum Heart Rate achieved (50-250 bpm)
"""

import numpy as np
import pandas as pd

QUICK_FEATURE_ORDER = ["age", "sex", "bp", "max_hr"]

QUICK_FEATURE_SCHEMA = {
    "age": {
        "type": "int",
        "min": 18,
        "max": 120,
        "description": "Patient age in years",
        "unit": "years"
    },
    "sex": {
        "type": "categorical",
        "allowed": [0, 1],
        "description": "Biological sex (0 = Female, 1 = Male)"
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


def validate_quick_input(data: dict) -> tuple[bool, dict[str, str]]:
    """Validate payload for the 4-feature Quick Risk Check.

    Returns:
        (is_valid: bool, errors_dict: dict[str, str])
    """
    if not isinstance(data, dict):
        return False, {"_global": "Request payload must be a JSON object."}

    errors = {}

    for feature in QUICK_FEATURE_ORDER:
        if feature not in data or data[feature] is None or data[feature] == "":
            errors[feature] = f"Field '{feature}' is required."
            continue

        raw_val = data[feature]
        schema = QUICK_FEATURE_SCHEMA[feature]
        kind = schema["type"]

        try:
            val_num = float(raw_val)
        except (ValueError, TypeError):
            errors[feature] = f"Field '{feature}' must be a valid number, got {repr(raw_val)}."
            continue

        if kind == "categorical":
            if not val_num.is_integer():
                errors[feature] = f"Field '{feature}' must be an integer (0 or 1)."
                continue
            int_val = int(val_num)
            if int_val not in schema["allowed"]:
                errors[feature] = f"Field '{feature}' must be 0 (Female) or 1 (Male)."
        elif kind in ("int", "float"):
            min_val = schema.get("min")
            max_val = schema.get("max")
            if min_val is not None and val_num < min_val:
                errors[feature] = f"Field '{feature}' ({val_num}) is below minimum allowed value ({min_val})."
            elif max_val is not None and val_num > max_val:
                errors[feature] = f"Field '{feature}' ({val_num}) exceeds maximum allowed value ({max_val})."

    return len(errors) == 0, errors


def transform_quick_input(data: dict) -> np.ndarray:
    """Transform validated dictionary into a 2D numpy array with QUICK_FEATURE_ORDER.

    Returns:
        NumPy 2D array of shape (1, 4) with dtype float64.
    """
    row = [
        float(data["age"]),
        float(data["sex"]),
        float(data["bp"]),
        float(data["max_hr"])
    ]
    return np.array([row], dtype=np.float64)


def compute_quick_contributing_features(features_scaled, raw_values, quick_model):
    """Compute local feature contributions (coef * z_score) for Quick Model explainability.

    Uses actual Quick Logistic Regression model weights.

    Returns:
        List of dicts sorted descending by absolute contribution magnitude.
    """
    coefs = quick_model.coef_[0]
    contributions = []

    for idx, feat in enumerate(QUICK_FEATURE_ORDER):
        coef = float(coefs[idx])
        z_val = float(features_scaled[0][idx])
        raw_val = float(raw_values[0][idx])
        contrib = coef * z_val
        direction = "increases_risk" if contrib > 0 else "decreases_risk"

        # Human-readable plain language explanation
        explanation = ""
        if feat == "age":
            explanation = f"Patient age of {int(raw_val)} years"
        elif feat == "sex":
            explanation = "Biological male" if int(raw_val) == 1 else "Biological female"
        elif feat == "bp":
            explanation = f"Blood pressure of {int(raw_val)} mm Hg"
        elif feat == "max_hr":
            explanation = f"Heart rate of {int(raw_val)} bpm during peak physical exertion"

        contributions.append({
            "feature_key": feat,
            "feature_name": QUICK_FEATURE_DISPLAY_NAMES.get(feat, feat),
            "raw_value": raw_val,
            "coefficient": round(coef, 4),
            "z_score": round(z_val, 4),
            "contribution": round(contrib, 4),
            "absolute_impact": round(abs(contrib), 4),
            "direction": direction,
            "explanation": explanation
        })

    contributions.sort(key=lambda x: x["absolute_impact"], reverse=True)
    return contributions
