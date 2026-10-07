"""Preprocess module for Heart Disease Prediction.

Provides the single source of truth for:
- FEATURE_ORDER and INPUT_FEATURES
- Feature constraints, types, sensible ranges, and allowed categorical options
- Input validation logic
- Input dictionary to NumPy 2D array transformation with derived feature engineering
"""

import numpy as np

# Base clinical input fields collected from user / request payload
INPUT_FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal"
]

# Engineered / derived features computed during transformation
DERIVED_FEATURES = [
    "age_thalach_interaction",
    "hypertension",
    "high_cholesterol"
]

# Canonical feature ordering used by all models, training scripts, and API endpoints
FEATURE_ORDER = INPUT_FEATURES + DERIVED_FEATURES

# Field metadata, valid ranges, and allowed categories for input validation
FEATURE_SCHEMA = {
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
        "description": "Sex (0 = Female, 1 = Male)"
    },
    "cp": {
        "type": "categorical",
        "allowed": [1, 2, 3, 4],
        "description": "Chest pain type (1: Typical angina, 2: Atypical angina, 3: Non-anginal pain, 4: Asymptomatic)"
    },
    "trestbps": {
        "type": "float",
        "min": 50.0,
        "max": 260.0,
        "description": "Resting blood pressure (mm Hg)",
        "unit": "mm Hg"
    },
    "chol": {
        "type": "float",
        "min": 80.0,
        "max": 650.0,
        "description": "Serum cholesterol (mg/dl)",
        "unit": "mg/dl"
    },
    "fbs": {
        "type": "categorical",
        "allowed": [0, 1],
        "description": "Fasting blood sugar > 120 mg/dl (0 = No/False, 1 = Yes/True)"
    },
    "restecg": {
        "type": "categorical",
        "allowed": [0, 1, 2],
        "description": "Resting ECG results (0: Normal, 1: ST-T wave abnormality, 2: Left ventricular hypertrophy)"
    },
    "thalach": {
        "type": "float",
        "min": 50.0,
        "max": 250.0,
        "description": "Maximum heart rate achieved (bpm)",
        "unit": "bpm"
    },
    "exang": {
        "type": "categorical",
        "allowed": [0, 1],
        "description": "Exercise-induced angina (0 = No, 1 = Yes)"
    },
    "oldpeak": {
        "type": "float",
        "min": 0.0,
        "max": 10.0,
        "description": "ST depression induced by exercise relative to rest",
        "unit": "mm"
    },
    "slope": {
        "type": "categorical",
        "allowed": [1, 2, 3],
        "description": "Slope of peak exercise ST segment (1: Upsloping, 2: Flat, 3: Downsloping)"
    },
    "ca": {
        "type": "categorical",
        "allowed": [0, 1, 2, 3],
        "description": "Number of major vessels colored by fluoroscopy (0, 1, 2, 3)"
    },
    "thal": {
        "type": "categorical",
        "allowed": [3, 6, 7],
        "description": "Thalassemia status (3: Normal blood flow, 6: Fixed defect, 7: Reversible defect)"
    }
}

# Display names for contributing feature reporting
FEATURE_DISPLAY_NAMES = {
    "age": "Age",
    "sex": "Biological Sex",
    "cp": "Chest Pain Type",
    "trestbps": "Resting Blood Pressure",
    "chol": "Serum Cholesterol",
    "fbs": "Fasting Blood Sugar",
    "restecg": "Resting ECG",
    "thalach": "Max Heart Rate",
    "exang": "Exercise Angina",
    "oldpeak": "ST Depression",
    "slope": "ST Slope",
    "ca": "Fluoroscopy Major Vessels",
    "thal": "Thalassemia",
    "age_thalach_interaction": "Age × Max HR Interaction",
    "hypertension": "Hypertension (BP ≥ 140)",
    "high_cholesterol": "High Cholesterol (≥ 240 mg/dl)",
}


def validate_input(data: dict) -> tuple[bool, dict[str, str]]:
    """Validate request payload against FEATURE_SCHEMA.

    Returns:
        (is_valid, errors_dict)
    """
    if not isinstance(data, dict):
        return False, {"_global": "Request payload must be a JSON object."}

    errors = {}

    for feature in INPUT_FEATURES:
        if feature not in data or data[feature] is None or data[feature] == "":
            errors[feature] = f"Field '{feature}' is required."
            continue

        raw_val = data[feature]
        schema = FEATURE_SCHEMA[feature]
        kind = schema["type"]

        # Parse numeric value
        try:
            val_num = float(raw_val)
        except (ValueError, TypeError):
            errors[feature] = f"Field '{feature}' must be a valid number, got {repr(raw_val)}."
            continue

        if kind == "categorical":
            # Must be an integer matching allowed values
            if not val_num.is_integer():
                errors[feature] = f"Field '{feature}' must be an integer, got {val_num}."
                continue
            int_val = int(val_num)
            if int_val not in schema["allowed"]:
                errors[feature] = (
                    f"Field '{feature}' value {int_val} is invalid. "
                    f"Allowed values: {schema['allowed']}."
                )
        elif kind in ("int", "float"):
            min_val = schema.get("min")
            max_val = schema.get("max")
            if min_val is not None and val_num < min_val:
                errors[feature] = f"Field '{feature}' ({val_num}) is below minimum allowed value ({min_val})."
            elif max_val is not None and val_num > max_val:
                errors[feature] = f"Field '{feature}' ({val_num}) exceeds maximum allowed value ({max_val})."

    is_valid = len(errors) == 0
    return is_valid, errors


def transform_input(data: dict) -> np.ndarray:
    """Transform validated dictionary into a 2D numpy array with FEATURE_ORDER.

    Computes derived features:
    - age_thalach_interaction: age * thalach
    - hypertension: 1 if trestbps >= 140 else 0
    - high_cholesterol: 1 if chol >= 240 else 0

    Args:
        data: Validated dictionary containing all required input features.

    Returns:
        NumPy 2D array of shape (1, len(FEATURE_ORDER)) with dtype float64.
    """
    age = float(data["age"])
    sex = float(data["sex"])
    cp = float(data["cp"])
    trestbps = float(data["trestbps"])
    chol = float(data["chol"])
    fbs = float(data["fbs"])
    restecg = float(data["restecg"])
    thalach = float(data["thalach"])
    exang = float(data["exang"])
    oldpeak = float(data["oldpeak"])
    slope = float(data["slope"])
    ca = float(data["ca"])
    thal = float(data["thal"])

    # Feature engineering / derived clinical parameters
    age_thalach_interaction = age * thalach
    hypertension = 1.0 if trestbps >= 140.0 else 0.0
    high_cholesterol = 1.0 if chol >= 240.0 else 0.0

    features_map = {
        "age": age,
        "sex": sex,
        "cp": cp,
        "trestbps": trestbps,
        "chol": chol,
        "fbs": fbs,
        "restecg": restecg,
        "thalach": thalach,
        "exang": exang,
        "oldpeak": oldpeak,
        "slope": slope,
        "ca": ca,
        "thal": thal,
        "age_thalach_interaction": age_thalach_interaction,
        "hypertension": hypertension,
        "high_cholesterol": high_cholesterol,
    }

    row = [features_map[feat] for feat in FEATURE_ORDER]
    return np.array([row], dtype=np.float64)
