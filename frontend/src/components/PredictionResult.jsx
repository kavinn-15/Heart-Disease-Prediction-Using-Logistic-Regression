import React from 'react';
import RiskBar from './RiskBar';
import { generatePdfReport } from '../utils/generatePdfReport';

export default function PredictionResult({ result, formData, onReset, onLaunchWhatIf }) {
  if (!result) return null;

  const lr = result.logistic_regression || result;

  // Determine risk level badge styling
  const prob = lr.probability ?? 0;
  let riskBadgeClass = 'status-healthy';
  let riskLabel = lr.risk_level || (prob >= 70 ? 'High Risk' : prob >= 30 ? 'Moderate Risk' : 'Low Risk');

  if (prob >= 70 || lr.prediction === 1) {
    riskBadgeClass = prob >= 70 ? 'status-danger' : 'status-warning';
  } else if (prob >= 30) {
    riskBadgeClass = 'status-warning';
  }

  const contributingFeatures = lr.contributing_features || [];

  // Separate factors increasing score vs factors decreasing score
  const increasingFactors = contributingFeatures.filter((f) => f.direction === 'increases_risk');
  const decreasingFactors = contributingFeatures.filter((f) => f.direction === 'decreases_risk');

  // Maximum impact for normalized bar charting
  const maxImpact = contributingFeatures.length > 0
    ? Math.max(...contributingFeatures.map((f) => f.absolute_impact || Math.abs(f.contribution || 0)), 0.1)
    : 1.0;

  // Automatically generate notable input / risk factor observations
  const generateNotableObservations = (fd) => {
    if (!fd) return [];
    const observations = [];

    // Elevated blood pressure
    const bp = Number(fd.trestbps);
    if (bp >= 140) {
      observations.push({
        type: 'warning',
        text: `Elevated resting blood pressure (${bp} mm Hg) — model-associated contribution.`,
      });
    } else if (bp < 120) {
      observations.push({
        type: 'favorable',
        text: `Optimal resting blood pressure range (${bp} mm Hg).`,
      });
    }

    // Cholesterol
    const chol = Number(fd.chol);
    if (chol >= 240) {
      observations.push({
        type: 'warning',
        text: `Elevated total cholesterol level (${chol} mg/dl) — input value requiring attention.`,
      });
    } else if (chol < 200) {
      observations.push({
        type: 'favorable',
        text: `Desirable serum cholesterol level (${chol} mg/dl).`,
      });
    }

    // Exercise Angina
    if (Number(fd.exang) === 1) {
      observations.push({
        type: 'warning',
        text: 'Exercise-induced angina reported during stress test.',
      });
    } else {
      observations.push({
        type: 'favorable',
        text: 'Absence of exercise-induced angina during exertion.',
      });
    }

    // ST Depression (Oldpeak)
    const op = Number(fd.oldpeak);
    if (op >= 1.5) {
      observations.push({
        type: 'warning',
        text: `Higher ST depression observed (${op.toFixed(1)} mm) relative to baseline.`,
      });
    } else if (op <= 0.5) {
      observations.push({
        type: 'favorable',
        text: `Minimal or absent exercise-induced ST depression (${op.toFixed(1)} mm).`,
      });
    }

    // Chest pain type
    if (Number(fd.cp) === 4) {
      observations.push({
        type: 'warning',
        text: 'Asymptomatic presentation pattern (often statistically correlated with elevated risk).',
      });
    }

    // Fluoroscopy vessels
    const ca = Number(fd.ca);
    if (ca > 0) {
      observations.push({
        type: 'warning',
        text: `${ca} major coronary vessel(s) visualized under fluoroscopy.`,
      });
    } else {
      observations.push({
        type: 'favorable',
        text: 'Clear fluoroscopy (0 major vessels colored).',
      });
    }

    // Thalassemia
    const thal = Number(fd.thal);
    if (thal === 7) {
      observations.push({
        type: 'warning',
        text: 'Reversible perfusion defect noted on Thallium imaging.',
      });
    } else if (thal === 3) {
      observations.push({
        type: 'favorable',
        text: 'Normal blood flow perfusion on Thallium scan.',
      });
    }

    // Fasting Blood Sugar
    if (Number(fd.fbs) === 0) {
      observations.push({
        type: 'favorable',
        text: 'Fasting blood sugar within standard reference range (≤ 120 mg/dl).',
      });
    } else {
      observations.push({
        type: 'warning',
        text: 'Elevated fasting blood sugar (> 120 mg/dl).',
      });
    }

    return observations;
  };

  const notableObservations = generateNotableObservations(formData);

  const handleDownloadPdf = () => {
    generatePdfReport({
      formData,
      result,
      timestamp: new Date(),
    });
  };

  return (
    <div className="prediction-result-wrapper" id="prediction-result-section">
      {/* Top Header & Actions */}
      <div className="result-header-row">
        <div>
          <h2 className="result-title">Model Risk Assessment Results</h2>
          <p className="result-subtitle">
            Machine learning analysis powered by calibrated L2-Regularized Logistic Regression
          </p>
        </div>

        <div className="result-header-actions">
          {onLaunchWhatIf && (
            <button
              type="button"
              onClick={() => onLaunchWhatIf(formData)}
              className="btn-secondary btn-what-if"
              id="btn-launch-what-if"
              title="Simulate modifying this patient's clinical inputs in What-If Simulator"
            >
              <span style={{ marginRight: '6px' }}>⚡</span>
              What-If Simulator
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="btn-primary btn-pdf"
            id="btn-download-pdf-report"
            title="Download clinical assessment report as a printable PDF"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Report
          </button>

          {onReset && (
            <button type="button" onClick={onReset} className="btn-secondary btn-reset">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              New Assessment
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Medical & Educational Disclaimer Banner */}
      <div className="disclaimer-banner" role="alert">
        <div className="disclaimer-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="disclaimer-content">
          <strong>Important Medical &amp; Academic Notice:</strong>
          <p>
            This application is developed strictly for <em>academic and educational demonstration</em> purposes. 
            The calculated probability and risk bands are statistical outputs from an L2-regularized Logistic Regression model 
            and must <strong>NOT</strong> be considered a clinical medical diagnosis, prognosis, or substitute for professional medical consultation.
          </p>
        </div>
      </div>

      {/* Primary Prediction Card */}
      <div className="model-cards-grid single-model-layout">
        <div className="model-card single-card">
          <div className="model-card-header">
            <div className="card-header-left">
              <div className="card-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <h3 className="card-header-title">Cardiac Risk Probability</h3>
                <span className="card-header-subtitle">Logistic Regression Predict Proba</span>
              </div>
            </div>
            <span className={`status-pill ${riskBadgeClass}`}>
              {riskLabel}
            </span>
          </div>

          <div className="probability-display">
            <span className="prob-number">{prob.toFixed(1)}</span>
            <span className="prob-unit">%</span>
          </div>
          <p className="prob-caption">Predicted probability of cardiovascular disease presence</p>

          <RiskBar probability={prob} />

          <div className="model-meta">
            <div className="meta-row">
              <span className="meta-label">Model Pipeline:</span>
              <span className="meta-value">StandardScaler (Z-Score) + L2 Logistic Regression</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Binary Classification:</span>
              <span className="meta-value">
                Class {lr.prediction} ({lr.prediction === 1 ? 'Positive / Heart Disease Indicated' : 'Negative / Absence'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 5: Risk Factor Summary */}
      {notableObservations.length > 0 && (
        <div className="risk-factor-summary-card">
          <div className="card-sub-header">
            <div className="card-sub-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="card-sub-title">Risk Factor Summary (Notable Observations)</h3>
            </div>
            <span className="card-sub-hint">Neutral observation of key patient inputs</span>
          </div>

          <div className="observations-list">
            {notableObservations.map((obs, idx) => (
              <div key={idx} className={`observation-pill ${obs.type === 'warning' ? 'obs-warning' : 'obs-favorable'}`}>
                <span className="obs-symbol">{obs.type === 'warning' ? '⚠' : '✓'}</span>
                <span className="obs-text">{obs.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature 2: "Why this prediction?" (Explain My Prediction) */}
      <div className="explain-prediction-card">
        <div className="card-sub-header">
          <div className="card-sub-title-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className="card-sub-title">Why Was This Risk Predicted?</h3>
          </div>
          <span className="card-sub-hint">
            Calculated via: standardized feature (z) × logistic regression coefficient (w)
          </span>
        </div>

        <div className="explain-columns-grid">
          {/* Factors Increasing Risk Score */}
          <div className="explain-col">
            <div className="explain-col-header header-increasing">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <h4>Factors Increasing Model Score (+ Risk)</h4>
            </div>

            <div className="explain-factors-list">
              {increasingFactors.length === 0 ? (
                <p className="no-factors-msg">No prominent risk-increasing factors identified.</p>
              ) : (
                increasingFactors.slice(0, 5).map((factor, i) => (
                  <div key={factor.feature_key || i} className="factor-row factor-increasing">
                    <div className="factor-header">
                      <span className="factor-name">{factor.feature_name}</span>
                      <span className="factor-score">+{factor.contribution.toFixed(4)}</span>
                    </div>
                    <p className="factor-desc">{factor.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Factors Decreasing Risk Score */}
          <div className="explain-col">
            <div className="explain-col-header header-decreasing">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <h4>Factors Decreasing Model Score (Protective)</h4>
            </div>

            <div className="explain-factors-list">
              {decreasingFactors.length === 0 ? (
                <p className="no-factors-msg">No prominent protective factors identified.</p>
              ) : (
                decreasingFactors.slice(0, 5).map((factor, i) => (
                  <div key={factor.feature_key || i} className="factor-row factor-decreasing">
                    <div className="factor-header">
                      <span className="factor-name">{factor.feature_name}</span>
                      <span className="factor-score">{factor.contribution.toFixed(4)}</span>
                    </div>
                    <p className="factor-desc">{factor.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="explain-disclaimer-note">
          * Note: Model contributions reflect statistical associations within the trained Logistic Regression model and do not imply clinical causation.
        </p>
      </div>

      {/* Feature 3: Feature Contribution Horizontal Bar Chart */}
      {contributingFeatures.length > 0 && (
        <div className="contribution-chart-card">
          <div className="card-sub-header">
            <div className="card-sub-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3 className="card-sub-title">Feature Contribution Chart</h3>
            </div>
            <span className="card-sub-hint">
              Sorted by absolute impact (|w_i · z_i|), strongest contributors first
            </span>
          </div>

          <div className="horizontal-bars-container">
            {contributingFeatures.map((item, idx) => {
              const isRisk = item.direction === 'increases_risk';
              const percent = Math.min(100, Math.round(((item.absolute_impact || 0) / maxImpact) * 100));

              return (
                <div key={item.feature_key || idx} className="chart-bar-row">
                  <div className="chart-bar-label-col">
                    <span className="chart-bar-name">{item.feature_name}</span>
                    <span className="chart-bar-raw">
                      (val: {typeof item.raw_value === 'number' ? (Number.isInteger(item.raw_value) ? item.raw_value : item.raw_value.toFixed(1)) : item.raw_value})
                    </span>
                  </div>

                  <div className="chart-bar-visual-col">
                    <div className="chart-track">
                      <div
                        className={`chart-bar-fill ${isRisk ? 'bar-positive' : 'bar-negative'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="chart-bar-val-col">
                    <span className={`chart-val-badge ${isRisk ? 'val-positive' : 'val-negative'}`}>
                      {item.contribution > 0 ? `+${item.contribution.toFixed(3)}` : item.contribution.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
