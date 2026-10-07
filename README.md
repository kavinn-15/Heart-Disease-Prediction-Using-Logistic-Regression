# CardioPredict ML — Interpretable Heart Disease Risk Assessment

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python)](https://www.python.org/)
[![Flask 3.0](https://img.shields.io/badge/Flask-3.0-lightgrey.svg?logo=flask)](https://flask.palletsprojects.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite-6.4-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.4%2B-orange.svg?logo=scikit-learn)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interpretable, production-ready, full-stack machine learning web application that calculates cardiovascular disease risk probabilities using calibrated L2-regularized Logistic Regression models. The system features a **Dual Prediction Engine** — offering both a **Detailed 13-Parameter Clinical Assessment** for comprehensive evaluations and an accessible **Quick 4-Measurement Risk Check** for rapid non-invasive screening.

---

> [!CAUTION]
> **Academic and Educational Demonstration Notice**  
> This software is developed strictly for **academic, educational, and machine learning research demonstration purposes**. It is **NOT** a certified medical diagnostic device and does **NOT** provide clinical diagnoses, medical opinions, prognoses, or therapeutic recommendations. All calculated probabilities, risk bands, and explanations are statistical model outputs (L2 Logistic Regression on the UCI Heart Disease dataset) and must never substitute for professional clinical consultation with licensed healthcare providers.

---

## Table of Contents

- [Overview](#overview)
- [Dual Prediction Engine](#dual-prediction-engine)
- [Key Features](#key-features)
  - [1. Patient Risk Assessment & Mode Selection](#1-patient-risk-assessment--mode-selection)
  - [2. Explainable AI & Feature Attribution](#2-explainable-ai--feature-attribution)
  - [3. Interactive What-If Counterfactual Simulator](#3-interactive-what-if-counterfactual-simulator)
  - [4. Feature Sensitivity Analysis](#4-feature-sensitivity-analysis)
  - [5. Classification Threshold Explorer](#5-classification-threshold-explorer)
  - [6. Interactive ROC Curve Explorer](#6-interactive-roc-curve-explorer)
  - [7. Confusion Matrix Explorer](#7-confusion-matrix-explorer)
  - [8. Model Coefficient Explorer](#8-model-coefficient-explorer)
  - [9. Prediction History](#9-prediction-history)
  - [10. Printable PDF Clinical Reports](#10-printable-pdf-clinical-reports)
  - [11. Dark / Light Mode System](#11-dark--light-mode-system)
- [Model Evaluation & Quality Gate](#model-evaluation--quality-gate)
- [Dataset & Clinical Biomarkers](#dataset--clinical-biomarkers)
- [API Reference](#api-reference)
- [Project Architecture & Directory Structure](#project-architecture--directory-structure)
- [Installation & Local Setup](#installation--local-setup)
- [Running Automated Tests](#running-automated-tests)
- [Model Training & Reproducibility](#model-training--reproducibility)
- [Known Limitations & Safety Principles](#known-limitations--safety-principles)

---

## Overview

Cardiovascular disease (CVD) is the leading cause of mortality worldwide. Early risk stratification can assist clinicians and individuals in identifying elevated risk profiles. Many machine learning systems operate as opaque "black boxes"; **CardioPredict ML** prioritizes **interpretability, statistical transparency, and explainability**:

- **No Black Boxes**: Implements mathematically transparent L2-regularized Logistic Regression where every prediction is fully decomposable into linear feature contributions ($z_i \times w_i$).
- **Dual Prediction Engine**: Supports both a comprehensive 13-parameter clinical mode and an accessible 4-measurement preliminary mode.
- **Trained on 630,000 Records**: Models are trained and rigorously evaluated on an expanded UCI Heart Disease clinical dataset (80% training / 20% held-out test split).
- **Interactive Deep-Dive Suite**: Includes What-If counterfactual simulations, univariate perturbation curves, dynamic confusion matrices, ROC curves, and coefficient rankings.

---

## Dual Prediction Engine

The application provides two genuinely independent modeling pipelines. **The 4-feature quick check does NOT feed partial inputs into the 13-feature model** — it utilizes its own dedicated scaler and trained Logistic Regression classifier.

```
                              How would you like to assess risk?
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         [ Detailed Clinical Assessment ]               [ Quick Heart Risk Check ]
             13 Clinical Parameters                          4 Basic Measurements
                       │                                               │
             Input Validation (13)                           Input Validation (4)
                       │                                               │
         StandardScaler (16 terms with Z-score)         Dedicated StandardScaler (4 terms)
                       │                                               │
         L2 Logistic Regression (C=0.01, balanced)      L2 Logistic Regression (C=0.05, balanced)
                       │                                               │
             predict_proba()                                 predict_proba()
                       │                                               │
         ROC-AUC: 95.16% | Accuracy: 88.42%             ROC-AUC: 81.95% | Accuracy: 74.02%
```

---

## Key Features

### 1. Patient Risk Assessment & Mode Selection
- **Clean Mode Selector**: Users choose between **Detailed Assessment** (13 clinical parameters) and **Quick Risk Check** (4 basic measurements).
- **13-Step Progress Indicator**: Real-time progress bar tracking completed clinical fields with completion percentage.
- **Clinical Tooltips**: In-line tooltips providing documented clinical definitions (e.g., ST depression, Thallium scintigraphy defect categories, fluoroscopy vessels).
- **Smart Presets**: One-click preset filling for testing (e.g., Healthy Baseline, Elevated Risk).
- **Seamless Transition**: After completing a Quick Risk Check, a single click transfers entered Age, Gender, BP, and Max HR directly into the Detailed Assessment form.

### 2. Explainable AI & Feature Attribution
- **Exact Mathematical Decomposition**: For every individual prediction, decomposes the logit score into standardized feature components ($z_i \times w_i$).
- **Directional Categorization**: Segregates patient factors into **Factors Increasing Model Score (+ Risk)** and **Factors Decreasing Model Score (Protective / -)**.
- **Contribution Bar Chart**: Horizontal bar chart ranking all inputs by absolute impact magnitude ($|z_i \times w_i|$).
- **Technical Inspection Drawer**: Expandable table exposing exact coefficients ($w_i$), standardized values ($Z$), intercept ($\beta_0$), logit score, and probability calculation formula ($P = \frac{1}{1 + e^{-\text{logit}}}$).

### 3. Interactive What-If Counterfactual Simulator
- **Live Risk Adjustment**: Modify individual biomarkers (e.g., lower total cholesterol from 280 to 200 mg/dl, reduce resting BP from 155 to 125 mm Hg, increase peak HR from 120 to 160 bpm) and calculate instantaneous probability deltas ($\Delta = P_{\text{modified}} - P_{\text{baseline}}$).
- **Visual Impact Indicators**: Color-coded directional badges indicating risk elevation or reduction.
- **Baseline Pre-loading**: Directly launch What-If scenarios from completed patient assessments.

### 4. Feature Sensitivity Analysis
- **Univariate Perturbation Gradients**: Systematically sweeps each biomarker across its valid clinical range while holding all other patient features strictly constant.
- **Sensitivity Ranking**: Ranks features by maximum probability swing ($\Delta P_{\max} - P_{\min}$) to identify which parameters exert the greatest influence on that patient's outcome.
- **Interactive Visualizer**: Dynamic probability response curves highlighting the patient's current coordinate.

### 5. Classification Threshold Explorer
- **Operational Decision Boundary Exploration**: Adjust the classification cutoff $\tau \in [0.10, 0.90]$ with presets ($0.30$, $0.40$, $0.50$, $0.60$, $0.70$).
- **Real-Time Performance Metrics**: Dynamically recalculates True Positives, False Positives, False Negatives, True Negatives, Accuracy, Precision, Recall (Sensitivity), and F1-Score on 126,000 held-out clinical test records.

### 6. Interactive ROC Curve Explorer
- **Empirical ROC Trajectory**: Renders 100 empirical ROC curve points computed on the test set alongside the 45-degree random chance diagonal.
- **Operating Coordinate Crosshairs**: Synchronized with the threshold slider; animated crosshair displays the corresponding True Positive Rate (Sensitivity), False Positive Rate ($1 - \text{Specificity}$), and Youden's $J$ Index ($J = \text{TPR} - \text{FPR}$).

### 7. Confusion Matrix Explorer
- **Dynamic Contingency Table**: Interactive $2 \times 2$ matrix displaying True Negatives, False Positives, False Negatives, and True Positives.
- **Interactive Tooltips**: Clear pedagogical breakdowns of Type I (False Positive / False Alarm) and Type II (False Negative / Missed Diagnosis) errors in clinical risk assessment.

### 8. Model Coefficient Explorer
- **Direct Weight Inspection**: Exposes exact trained weights directly from `model.coef_` and intercepts ($\beta_0$) without hardcoded approximations.
- **Interactive Sorting & Filtering**: Sort by absolute weight magnitude ($|w_i|$), positive vs. negative log-odds impact, or alphabetical name.

### 9. Prediction History
- **Persistent Local Storage**: Stores past assessments locally in browser `localStorage`.
- **Mode-Aware Records**: Distinctly categorizes assessments as **Detailed Assessment** or **Quick Risk Check**.
- **Actions**: Review historical probabilities and risk bands, reload parameters into the form, or export to PDF.

### 10. Printable PDF Clinical Reports
- **Multi-Section Assessment Summary**: Generates clean, downloadable PDF documents formatted for printing.
- **Comprehensive Content**: Features summary risk badges, input parameters, feature attribution rankings, pipeline metadata, and prominent educational disclaimers.
- **Dual Support**: Formats separate reports for both Detailed and Quick prediction modes.

### 11. Dark / Light Mode System
- **Theme Support**: High-contrast dark mode tailored for clinical and laboratory environments, persisted across browser reloads.

---

## Model Evaluation & Quality Gate

Both models are evaluated on **126,000 held-out clinical test records** using **5-Fold Stratified Cross-Validation**. Metrics are computed from test data:

| Evaluation Metric | Main Model (13 Features) | Quick Model (4 Features) | Tradeoff / Analysis |
| :--- | :--- | :--- | :--- |
| **ROC-AUC Score** | **95.16%** (0.9516) | **81.95%** (0.8195) | -13.21% expected drop due to 9 fewer clinical tests |
| **Test Accuracy** | **88.42%** (0.8842) | **74.02%** (0.7402) | -14.40% classification tradeoff |
| **Precision** | **86.73%** (0.8673) | **69.67%** (0.6967) | Positive predictive value |
| **Recall (Sensitivity)** | **87.56%** (0.8756) | **74.48%** (0.7448) | Detects ~3 out of 4 true positive cases |
| **F1-Score** | **87.14%** (0.8714) | **72.00%** (0.7200) | Harmonic mean of precision & recall |
| **5-Fold CV ROC-AUC** | **95.03%** (0.9503) | **81.66%** (0.8166) | Consistent cross-validated generalization |
| **Training Records** | **504,000** | **504,000** | 80% Stratified Training Split |
| **Test Records** | **126,000** | **126,000** | 20% Held-out Evaluation Split |

### Confusion Matrices (126,000 Test Records)

#### Main Model (13 Features, Threshold $\tau = 0.50$):
```
                          Predicted Negative (0)    Predicted Positive (1)
Actual Negative (0):              61,938 (TN)               7,571 (FP)
Actual Positive (1):               7,026 (FN)              49,465 (TP)
```

#### Quick Model (4 Features, Threshold $\tau = 0.50$):
```
                          Predicted Negative (0)    Predicted Positive (1)
Actual Negative (0):              51,195 (TN)              18,314 (FP)
Actual Positive (1):              14,415 (FN)              42,076 (TP)
```

### Learned Quick Model Coefficients (`quick_model.coef_`)
- **Age**: `+0.4270` (higher age increases cardiac risk score)
- **Sex**: `+0.7472` (male sex increases baseline risk score)
- **Blood Pressure (BP)**: `-0.0065` (minimal independent linear coefficient when conditioned on age and heart rate)
- **Heart Rate (Max HR)**: `-1.0560` (higher peak exertion heart rate acts as a strong protective factor)
- **Base Intercept ($\beta_0$)**: `-0.0744`

---

## Dataset & Clinical Biomarkers

The models are trained on the **UCI Heart Disease Clinical Dataset** expanded to approximately 630,000 records.

### Detailed Assessment Biomarkers (13 Features)

| Feature | Field Name | Type | Valid Range | Description / Clinical Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Age** | `age` | Numeric | 18 – 120 yrs | Patient chronological age |
| **Sex** | `sex` | Categorical | 0, 1 | Biological sex (0: Female, 1: Male) |
| **Chest Pain** | `cp` | Categorical | 1, 2, 3, 4 | 1: Typical Angina, 2: Atypical Angina, 3: Non-Anginal, 4: Asymptomatic |
| **Resting BP** | `trestbps` | Numeric | 50 – 260 mm Hg | Resting arterial blood pressure upon admission |
| **Cholesterol** | `chol` | Numeric | 80 – 650 mg/dl | Serum total cholesterol |
| **Fasting Blood Sugar** | `fbs` | Categorical | 0, 1 | Fasting blood sugar > 120 mg/dl (0: False, 1: True) |
| **Resting ECG** | `restecg` | Categorical | 0, 1, 2 | 0: Normal, 1: ST-T wave abnormality, 2: Left ventricular hypertrophy |
| **Max Heart Rate** | `thalach` | Numeric | 50 – 250 bpm | Maximum peak heart rate achieved during exercise stress test |
| **Exercise Angina** | `exang` | Categorical | 0, 1 | Exercise-induced chest pain (0: No, 1: Yes) |
| **ST Depression** | `oldpeak` | Numeric | 0.0 – 10.0 mm | ST depression induced by exercise relative to rest |
| **ST Slope** | `slope` | Categorical | 1, 2, 3 | Slope of peak exercise ST segment (1: Upsloping, 2: Flat, 3: Downsloping) |
| **Major Vessels** | `ca` | Numeric | 0 – 3 | Major vessels colored by fluoroscopy |
| **Thalassemia** | `thal` | Categorical | 3, 6, 7 | Thallium scintigraphy (3: Normal blood flow, 6: Fixed defect, 7: Reversible defect) |

### Quick Risk Check Measurements (4 Features)

| Feature | Field Name | Type | Valid Range | Dataset Encoding / Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Age** | `age` | Numeric | 18 – 120 yrs | Years |
| **Gender** | `sex` | Categorical | 0, 1 | 1 = Male, 0 = Female |
| **Blood Pressure** | `bp` | Numeric | 50 – 260 mm Hg | Resting blood pressure measurement |
| **Heart Rate** | `max_hr` | Numeric | 50 – 250 bpm | Peak exercise heart rate achieved |

---

## API Reference

The Flask backend serves **12 REST API endpoints**:

### Core Endpoints

#### `GET /health`
Returns backend health and model loading status.
```json
{
  "models_loaded": true,
  "status": "ok"
}
```

#### `GET /metrics`
Returns comprehensive evaluation metrics, cross-validation scores, dataset summaries, and confusion matrix for the 13-feature model.

#### `POST /predict`
Submits 13 clinical biomarkers for detailed risk prediction, risk categorization, and feature attribution.
```json
// Request Body:
{
  "age": 62, "sex": 1, "cp": 4, "trestbps": 155, "chol": 290, "fbs": 1,
  "restecg": 2, "thalach": 120, "exang": 1, "oldpeak": 2.8, "slope": 2, "ca": 2, "thal": 7
}

// Response Body:
{
  "logistic_regression": {
    "prediction": 1,
    "probability": 100.0,
    "risk_level": "High Risk",
    "contributing_features": [
      {
        "feature_key": "ca",
        "feature_name": "Fluoroscopy Major Vessels",
        "contribution": 1.3619,
        "direction": "increases_risk",
        "explanation": "2 major coronary vessel(s) colored under fluoroscopy"
      }
    ]
  }
}
```

---

### Quick Risk Check Endpoints

#### `POST /api/quick-predict`
Submits 4 accessible parameters for fast screening prediction:
```json
// Request Body:
{
  "age": 62,
  "sex": 1,
  "bp": 155,
  "max_hr": 120
}

// Response Body:
{
  "probability": 0.6454,
  "percentage": 64.5,
  "risk_level": "Moderate Risk",
  "prediction": 1,
  "model": "Quick Logistic Regression",
  "features": ["Age", "Sex", "BP", "Max HR"],
  "contributing_factors": [
    {
      "feature_name": "Heart Rate (Max HR)",
      "coefficient": -1.0560,
      "contribution": 0.8834,
      "direction": "increases_risk",
      "explanation": "Lower maximum heart rate (120 bpm) contributes +0.8834 to risk score."
    }
  ]
}
```

#### `GET /api/quick-metrics`
Returns evaluation metrics, sample distributions, confusion matrix, and feature metadata for the Quick Model.

---

### Advanced ML Analysis Endpoints

#### `POST /api/what-if`
Accepts `baseline` and `modified` patient objects; returns comparative predictions and percentage point deltas ($\Delta$).

#### `POST /api/sensitivity`
Accepts a patient profile; returns probability swing rankings and univariate perturbation test curves for all 13 features.

#### `GET /api/threshold-analysis?threshold=0.50`
Computes TP, FP, FN, TN, Accuracy, Precision, Recall, and F1-Score for the specified classification cutoff $\tau \in [0.10, 0.90]$.

#### `GET /api/roc-data`
Returns 100 empirical ROC curve coordinates (`fpr`, `tpr`, `threshold`) and ROC-AUC score ($95.16\%$).

#### `GET /api/confusion-matrix?threshold=0.50`
Returns the $2 \times 2$ contingency table counts and educational definitions for the given threshold.

#### `GET /api/model-coefficients`
Returns the trained Logistic Regression feature coefficients, intercept, and regularization metadata.

---

## Project Architecture & Directory Structure

```text
Heart Disease Prediction/
│
├── backend/
│   ├── dataset/
│   │   └── heart.csv                       # UCI Heart Disease dataset (~630k rows)
│   ├── models/
│   │   ├── logistic_model.pkl              # 13-feature L2 Logistic Regression model
│   │   ├── scaler.pkl                      # 16-feature StandardScaler
│   │   ├── advanced_analysis_artifacts.pkl # ROC points, thresholds, confusion matrices
│   │   ├── quick_logistic_model.pkl        # 4-feature Quick Logistic Regression model
│   │   ├── quick_scaler.pkl                # 4-feature Quick StandardScaler
│   │   └── quick_metrics.json              # Quick Model evaluation metrics
│   ├── utils/
│   │   ├── preprocess.py                   # 13-feature validation, scaling, decomposition
│   │   └── quick_preprocess.py             # 4-feature validation, scaling, decomposition
│   ├── app.py                              # Flask application & 12 REST API endpoints
│   ├── train_model.py                      # Training script for 13-feature model
│   ├── train_quick_model.py                # Training script for 4-feature Quick model
│   ├── generate_advanced_artifacts.py      # Artifacts pre-computation script
│   ├── test_app_integration.py             # Integration test suite (18 automated tests)
│   ├── test_live_api.py                    # Live HTTP test suite (12 endpoints)
│   └── requirements.txt                    # Backend Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PatientForm.jsx             # 13-input clinical parameter form
│   │   │   ├── PredictionResult.jsx        # Detailed prediction results & charts
│   │   │   ├── QuickPatientForm.jsx        # 4-input Quick Risk Check form
│   │   │   ├── QuickPredictionResult.jsx   # Quick Risk Check results & decomposition
│   │   │   ├── RiskBar.jsx                 # Animated risk band progress bar
│   │   │   ├── PredictionHistory.jsx       # History manager (Detailed & Quick)
│   │   │   ├── ModelPerformance.jsx        # Dual Model evaluation & comparison
│   │   │   ├── AdvancedAnalysisDashboard.jsx# Advanced ML suite container
│   │   │   ├── WhatIfSimulator.jsx         # Counterfactual simulation tool
│   │   │   ├── SensitivityAnalysis.jsx     # Feature sensitivity curves
│   │   │   ├── ThresholdAnalysis.jsx       # Decision cutoff optimizer
│   │   │   ├── RocExplorer.jsx             # Interactive ROC curve
│   │   │   ├── ConfusionMatrixExplorer.jsx # Dynamic confusion matrix
│   │   │   └── CoefficientExplorer.jsx     # Mathematical weight explorer
│   │   ├── utils/
│   │   │   └── generatePdfReport.js        # jsPDF report generation engine
│   │   ├── styles/
│   │   │   └── App.css                     # Complete design system & themes
│   │   ├── api.js                          # Axios HTTP client & endpoint methods
│   │   ├── App.jsx                         # Main app shell, mode routing, theme
│   │   └── main.jsx                        # React root entry point
│   ├── package.json                        # Frontend dependencies & scripts
│   └── vite.config.js                      # Vite build configuration
│
└── README.md                               # Project documentation
```

---

## Installation & Local Setup

### Prerequisites
- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.0` or higher (with `npm`)

### 1. Backend Setup

```bash
# 1. Clone the repository and navigate to root
cd "Heart Disease Prediction"

# 2. (Optional) Create and activate a Python virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Start the Flask backend server (runs on http://127.0.0.1:5000)
python backend/app.py
```

### 2. Frontend Setup

```bash
# 1. Open a new terminal and navigate to the frontend folder
cd "Heart Disease Prediction/frontend"

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## Running Automated Tests

The repository includes comprehensive automated test suites covering input validations, probability bounds, model scaling, What-If simulation, sensitivity curves, and all 12 live API routes:

### 1. Integration Test Suite
```bash
python backend/test_app_integration.py
```
*Executes 18 integration tests across both the 13-feature and 4-feature pipelines.*

### 2. Live HTTP Endpoint Test Suite
Ensure the backend server is running on `http://127.0.0.1:5000`, then run:
```bash
python backend/test_live_api.py
```
*Verifies all 12 HTTP endpoints return status 200 and expected schemas.*

### 3. Frontend Production Build Verification
```bash
cd frontend
npm run build
```
*Validates that all JSX components, styles, and bundle modules compile with zero errors.*

---

## Model Training & Reproducibility

All model training logic is reproducible using the provided scripts:

```bash
# Retrain the 13-feature Logistic Regression model and generate scalers
python backend/train_model.py

# Pre-compute advanced ML analysis artifacts (ROC points, threshold metrics)
python backend/generate_advanced_artifacts.py

# Retrain the 4-feature Quick Risk Check model and generate quick scalers
python backend/train_quick_model.py
```

All training scripts utilize `random_state=42` and stratified splits to guarantee reproducibility.

---

## Known Limitations & Safety Principles

1. **Academic Demonstration Only**: This software is not approved by regulatory healthcare bodies (e.g., FDA, CE-IVD). It is intended strictly for education and computer science demonstrations.
2. **Missing Modalities**: The Quick Risk Check uses 4 non-invasive features; it cannot detect coronary artery calcium (fluoroscopy) or exercise-induced ischemia (ST depression) visible in clinical stress tests.
3. **Single Blood Pressure Field**: The dataset provides a single `bp` column rather than separate systolic and diastolic readings.
4. **No Treatment Guidance**: The software strictly outputs probabilities and statistical attributions; it never prescribes medication, lifestyle interventions, or therapeutic directives.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
