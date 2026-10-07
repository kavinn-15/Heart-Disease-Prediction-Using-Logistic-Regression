"""Automated test suite using Flask test client for Heart Disease Prediction."""

import json
import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app import app
from utils.preprocess import FEATURE_ORDER, INPUT_FEATURES, DERIVED_FEATURES, FEATURE_SCHEMA


def test_health_check():
    client = app.test_client()
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["models_loaded"] is True


def test_predict_valid():
    client = app.test_client()
    payload = {
        "age": 58,
        "sex": 1,
        "cp": 4,
        "trestbps": 140,
        "chol": 240,
        "fbs": 0,
        "restecg": 1,
        "thalach": 150,
        "exang": 1,
        "oldpeak": 2.0,
        "slope": 2,
        "ca": 2,
        "thal": 7,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_json()}"
    data = res.get_json()
    assert "logistic_regression" in data
    lr = data["logistic_regression"]
    assert "prediction" in lr
    assert "probability" in lr
    assert "risk_level" in lr
    assert "contributing_features" in lr
    assert isinstance(lr["probability"], float)
    assert 0.0 <= lr["probability"] <= 100.0
    assert lr["risk_level"] in ["Low Risk", "Moderate Risk", "High Risk"]
    assert len(lr["contributing_features"]) == len(FEATURE_ORDER)


def test_predict_missing_field():
    client = app.test_client()
    # Missing 'age'
    payload = {
        "sex": 1,
        "cp": 2,
        "trestbps": 130,
        "chol": 220,
        "fbs": 0,
        "restecg": 0,
        "thalach": 160,
        "exang": 0,
        "oldpeak": 0.5,
        "slope": 1,
        "ca": 0,
        "thal": 3,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"] == "Validation failed"
    assert "age" in data["errors"]


def test_predict_invalid_type():
    client = app.test_client()
    payload = {
        "age": 55,
        "sex": 1,
        "cp": 1,
        "trestbps": 130,
        "chol": "abc",
        "fbs": 0,
        "restecg": 0,
        "thalach": 160,
        "exang": 0,
        "oldpeak": 0.5,
        "slope": 1,
        "ca": 0,
        "thal": 3,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"] == "Validation failed"
    assert "chol" in data["errors"]


def test_predict_invalid_category():
    client = app.test_client()
    # thal = 99 is invalid (allowed: [3, 6, 7])
    payload = {
        "age": 55,
        "sex": 1,
        "cp": 1,
        "trestbps": 130,
        "chol": 220,
        "fbs": 0,
        "restecg": 0,
        "thalach": 160,
        "exang": 0,
        "oldpeak": 0.5,
        "slope": 1,
        "ca": 0,
        "thal": 99,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"] == "Validation failed"
    assert "thal" in data["errors"]


def test_predict_low_risk_preset():
    client = app.test_client()
    payload = {
        "age": 38,
        "sex": 0,
        "cp": 1,
        "trestbps": 115,
        "chol": 175,
        "fbs": 0,
        "restecg": 0,
        "thalach": 172,
        "exang": 0,
        "oldpeak": 0.0,
        "slope": 1,
        "ca": 0,
        "thal": 3,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    lr = data["logistic_regression"]
    assert lr["risk_level"] == "Low Risk"
    assert lr["probability"] < 30.0


def test_metrics():
    client = app.test_client()
    res = client.get("/metrics")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "logistic_regression" in data
    assert "dataset_summary" in data
    assert "accuracy" in data["logistic_regression"]
    assert "roc_auc" in data["logistic_regression"]
    assert "confusion_matrix" in data["logistic_regression"]


def test_what_if_simulation():
    client = app.test_client()
    base = {
        "age": 62, "sex": 1, "cp": 4, "trestbps": 155, "chol": 290,
        "fbs": 1, "restecg": 2, "thalach": 120, "exang": 1, "oldpeak": 2.8,
        "slope": 2, "ca": 2, "thal": 7
    }
    mod = dict(base, age=55, chol=210, thalach=150)
    res = client.post("/api/what-if", json={"baseline": base, "modified": mod})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_json()}"
    data = res.get_json()
    assert "baseline" in data
    assert "modified" in data
    assert "delta" in data
    assert "probability" in data["baseline"]
    assert "probability" in data["modified"]
    assert "probability_points" in data["delta"]
    assert data["delta"]["direction"] in ["increased", "decreased", "no_change"]
    assert data["delta"]["changed_features_count"] == 3


def test_sensitivity_analysis():
    client = app.test_client()
    base = {
        "age": 55, "sex": 1, "cp": 2, "trestbps": 130, "chol": 220,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0, "oldpeak": 1.0,
        "slope": 2, "ca": 1, "thal": 3
    }
    res = client.post("/api/sensitivity", json={"patient": base})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_json()}"
    data = res.get_json()
    assert "baseline_probability" in data
    assert "features_sensitivity" in data
    assert len(data["features_sensitivity"]) == 13
    first_feat = data["features_sensitivity"][0]
    assert "feature_name" in first_feat
    assert "sensitivity_swing" in first_feat
    assert "points" in first_feat
    assert len(first_feat["points"]) >= 2


def test_threshold_analysis():
    client = app.test_client()
    for th in [0.30, 0.40, 0.50, 0.60, 0.70]:
        res = client.get(f"/api/threshold-analysis?threshold={th}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.get_json()
        assert "metrics" in data
        assert "operating_threshold" in data
        m = data["metrics"]
        assert "accuracy" in m
        assert "precision" in m
        assert "recall" in m
        assert "f1" in m
        assert "tn" in m
        assert "tp" in m


def test_roc_data():
    client = app.test_client()
    res = client.get("/api/roc-data")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "roc_auc" in data
    assert data["roc_auc"] == 0.9516
    assert "roc_points" in data
    assert len(data["roc_points"]) > 50
    first_pt = data["roc_points"][0]
    assert "fpr" in first_pt
    assert "tpr" in first_pt


def test_confusion_matrix():
    client = app.test_client()
    res = client.get("/api/confusion-matrix?threshold=0.50")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "confusion_matrix" in data
    assert "counts" in data
    assert data["counts"]["tn"] == 61938
    assert data["counts"]["tp"] == 49465
    assert "explanations" in data
    assert "true_positive" in data["explanations"]


def test_model_coefficients():
    client = app.test_client()
    res = client.get("/api/model-coefficients")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "coefficients" in data
    assert len(data["coefficients"]) == 16
    assert "intercept" in data
    assert "scaler_note" in data
    top = data["coefficients"][0]
    assert "feature_name" in top
    assert "coefficient" in top
    assert "absolute_coefficient" in top


def test_quick_metrics():
    client = app.test_client()
    res = client.get("/api/quick-metrics")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "logistic_regression" in data
    assert "accuracy" in data["logistic_regression"]
    assert "roc_auc" in data["logistic_regression"]
    assert data["logistic_regression"]["accuracy"] == 0.7402
    assert data["logistic_regression"]["roc_auc"] == 0.8195


def test_quick_predict_valid():
    client = app.test_client()
    payload = {
        "age": 55,
        "sex": 1,
        "bp": 130,
        "max_hr": 150
    }
    res = client.post("/api/quick-predict", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.get_json()}"
    data = res.get_json()
    assert "prediction" in data
    assert "probability" in data
    assert "percentage" in data
    assert "risk_level" in data
    assert "contributing_features" in data
    assert len(data["contributing_features"]) == 4
    assert data["model"] == "Quick Logistic Regression"


def test_quick_predict_invalid_age():
    client = app.test_client()
    payload = {
        "age": 10,  # below minimum
        "sex": 1,
        "bp": 130,
        "max_hr": 150
    }
    res = client.post("/api/quick-predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert "errors" in data
    assert "age" in data["errors"]


def test_quick_predict_invalid_sex():
    client = app.test_client()
    payload = {
        "age": 55,
        "sex": 3,  # invalid category
        "bp": 130,
        "max_hr": 150
    }
    res = client.post("/api/quick-predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert "errors" in data
    assert "sex" in data["errors"]


def test_quick_predict_missing_field():
    client = app.test_client()
    payload = {
        "age": 55,
        "sex": 1,
        # missing bp
        "max_hr": 150
    }
    res = client.post("/api/quick-predict", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert "errors" in data
    assert "bp" in data["errors"]


if __name__ == "__main__":
    print("Running integration tests...")
    test_health_check()
    print("[PASS] test_health_check")
    test_metrics()
    print("[PASS] test_metrics")
    test_predict_valid()
    print("[PASS] test_predict_valid")
    test_predict_missing_field()
    print("[PASS] test_predict_missing_field")
    test_predict_invalid_type()
    print("[PASS] test_predict_invalid_type")
    test_predict_invalid_category()
    print("[PASS] test_predict_invalid_category")
    test_predict_low_risk_preset()
    print("[PASS] test_predict_low_risk_preset")
    test_what_if_simulation()
    print("[PASS] test_what_if_simulation")
    test_sensitivity_analysis()
    print("[PASS] test_sensitivity_analysis")
    test_threshold_analysis()
    print("[PASS] test_threshold_analysis")
    test_roc_data()
    print("[PASS] test_roc_data")
    test_confusion_matrix()
    print("[PASS] test_confusion_matrix")
    test_model_coefficients()
    print("[PASS] test_model_coefficients")
    test_quick_metrics()
    print("[PASS] test_quick_metrics")
    test_quick_predict_valid()
    print("[PASS] test_quick_predict_valid")
    test_quick_predict_invalid_age()
    print("[PASS] test_quick_predict_invalid_age")
    test_quick_predict_invalid_sex()
    print("[PASS] test_quick_predict_invalid_sex")
    test_quick_predict_missing_field()
    print("[PASS] test_quick_predict_missing_field")
    print("\nAll 18 integration tests passed successfully!")



