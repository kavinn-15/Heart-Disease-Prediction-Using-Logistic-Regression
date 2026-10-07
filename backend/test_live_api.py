"""Verify live endpoints over HTTP."""

import json
import urllib.request

base_url = "http://127.0.0.1:5000"


def call(endpoint, method="GET", data=None):
    req = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    with urllib.request.urlopen(req) as res:
        return res.status, json.loads(res.read().decode("utf-8"))


def main():
    print("1. Testing GET /health ...")
    st, body = call("/health")
    assert st == 200
    print(f"   [PASS] status={st}, models_loaded={body.get('models_loaded')}")

    print("2. Testing GET /metrics ...")
    st, body = call("/metrics")
    assert st == 200
    lr_metrics = body["logistic_regression"]
    print(f"   [PASS] Accuracy={lr_metrics['accuracy'] * 100:.2f}%, ROC-AUC={lr_metrics['roc_auc'] * 100:.2f}%")

    print("3. Testing POST /predict (High Risk patient) ...")
    payload_high = {
        "age": 62,
        "sex": 1,
        "cp": 4,
        "trestbps": 155,
        "chol": 290,
        "fbs": 1,
        "restecg": 2,
        "thalach": 120,
        "exang": 1,
        "oldpeak": 2.8,
        "slope": 2,
        "ca": 2,
        "thal": 7,
    }
    st, body = call("/predict", "POST", payload_high)
    assert st == 200
    lr = body["logistic_regression"]
    print(f"   [PASS] Probability={lr['probability']}%, Risk Level={lr['risk_level']}, Class={lr['prediction']}")
    top_factor = lr["contributing_features"][0]
    print(f"   Top contributing factor: {top_factor['feature_name']} (score: {top_factor['contribution']:+.4f})")

    print("4. Testing POST /predict (Low Risk patient) ...")
    payload_low = {
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
    st, body = call("/predict", "POST", payload_low)
    assert st == 200
    lr_low = body["logistic_regression"]
    print(f"   [PASS] Probability={lr_low['probability']}%, Risk Level={lr_low['risk_level']}, Class={lr_low['prediction']}")

    print("\n5. Testing POST /api/what-if ...")
    st, body = call("/api/what-if", "POST", {
        "baseline": payload_high,
        "modified": dict(payload_high, age=55, chol=210, thalach=150)
    })
    assert st == 200
    print(f"   [PASS] Baseline={body['baseline']['probability']}%, Modified={body['modified']['probability']}%, Delta={body['delta']['probability_points']}% ({body['delta']['direction']})")

    print("\n6. Testing POST /api/sensitivity ...")
    st, body = call("/api/sensitivity", "POST", {"patient": payload_high})
    assert st == 200
    print(f"   [PASS] 13 features evaluated. Top sensitivity: {body['features_sensitivity'][0]['feature_name']} (swing: {body['features_sensitivity'][0]['sensitivity_swing']}%)")

    print("\n7. Testing GET /api/threshold-analysis ...")
    st, body = call("/api/threshold-analysis?threshold=0.40")
    assert st == 200
    m = body["metrics"]
    print(f"   [PASS] Operating threshold={body['operating_threshold']}, Recall={m['recall'] * 100:.2f}%, Precision={m['precision'] * 100:.2f}%, F1={m['f1'] * 100:.2f}%")

    print("\n8. Testing GET /api/roc-data ...")
    st, body = call("/api/roc-data")
    assert st == 200
    print(f"   [PASS] ROC-AUC={body['roc_auc'] * 100:.2f}%, Points={len(body['roc_points'])}")

    print("\n9. Testing GET /api/confusion-matrix ...")
    st, body = call("/api/confusion-matrix?threshold=0.50")
    assert st == 200
    c = body["counts"]
    print(f"   [PASS] TN={c['tn']:,}, FP={c['fp']:,}, FN={c['fn']:,}, TP={c['tp']:,}")

    print("\n10. Testing GET /api/model-coefficients ...")
    st, body = call("/api/model-coefficients")
    assert st == 200
    print(f"   [PASS] {body['total_features']} features. Top weight: {body['coefficients'][0]['feature_name']} ({body['coefficients'][0]['coefficient']:+.4f})")

    print("\n11. Testing GET /api/quick-metrics ...")
    st, body = call("/api/quick-metrics")
    assert st == 200
    qm = body["logistic_regression"]
    print(f"   [PASS] Quick Model Accuracy={qm['accuracy']*100:.2f}%, ROC-AUC={qm['roc_auc']*100:.2f}%")

    print("\n12. Testing POST /api/quick-predict ...")
    quick_sample = {"age": 55, "sex": 1, "bp": 130, "max_hr": 150}
    st, body = call("/api/quick-predict", "POST", quick_sample)
    assert st == 200
    print(f"   [PASS] Probability={body['percentage']}%, Risk Level={body['risk_level']}, Model={body['model']}")

    print("\nAll 12 live HTTP endpoint verifications passed successfully!")


if __name__ == "__main__":
    main()

