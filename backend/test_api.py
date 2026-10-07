"""Test script for Heart Disease Prediction REST API."""

import json
import urllib.error
import urllib.request

base_url = "http://127.0.0.1:5000"


def make_req(name, endpoint, method="GET", data=None):
    print(f"=== TEST: {name} ===")
    req = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=json.dumps(data).encode("utf-8") if data is not None else None,
        headers={"Content-Type": "application/json"} if data is not None else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            print(f"Status Code: {status}")
            print("Response JSON:")
            print(json.dumps(json.loads(body), indent=2))
            return status, json.loads(body)
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8")
        print(f"Status Code: {status}")
        try:
            parsed = json.loads(body)
            print("Response JSON:")
            print(json.dumps(parsed, indent=2))
            return status, parsed
        except Exception:
            print("Response Body:", body)
            return status, body
    except Exception as e:
        print("Connection Error:", e)
        return None, str(e)
    finally:
        print()


if __name__ == "__main__":
    # Health Check
    make_req("GET /health", "/health", "GET")

    # Metrics Check
    make_req("GET /metrics", "/metrics", "GET")

    # 1. Valid payload with dataset-matched clinical encodings (cp: 1-4, thal: 3, 6, 7, slope: 1-3)
    valid_payload = {
        "age": 58,
        "sex": 1,
        "cp": 4,           # Asymptomatic
        "trestbps": 140,
        "chol": 240,
        "fbs": 0,
        "restecg": 1,
        "thalach": 150,
        "exang": 1,
        "oldpeak": 2.0,
        "slope": 2,        # Flat
        "ca": 2,           # 2 vessels
        "thal": 7,         # Reversible defect
    }
    make_req("1. Valid Payload", "/predict", "POST", valid_payload)

    # 2. Missing field payload (missing 'age')
    missing_payload = {
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
    make_req("2. Missing Field Payload", "/predict", "POST", missing_payload)

    # 3. Invalid type payload (chol = "abc")
    invalid_type_payload = {
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
    make_req("3. Invalid Type Payload (chol='abc')", "/predict", "POST", invalid_type_payload)

    # 4. Out of bounds payload (thal = 99)
    out_of_bounds_payload = {
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
    make_req("4. Out of Bounds Payload (thal=99)", "/predict", "POST", out_of_bounds_payload)
