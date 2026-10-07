import React, { useState } from 'react';
import RiskBar from './RiskBar';
import { generatePdfReport } from '../utils/generatePdfReport';

export default function QuickPredictionResult({
  result,
  formData,
  onReset,
  onSwitchToDetailed,
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!result) return null;

  const prob = typeof result.probability === 'number' ? result.probability : 0;
  const percentage = typeof result.percentage === 'number' ? result.percentage : (prob * 100);
  const riskLevel = result.risk_level || (percentage >= 70 ? 'High Risk' : percentage >= 30 ? 'Moderate Risk' : 'Low Risk');
  const isHigh = percentage >= 70;
  const isMod = percentage >= 30 && percentage < 70;
  const riskBadgeClass = isHigh ? 'status-danger' : isMod ? 'status-warning' : 'status-healthy';

  const contributing = result.contributing_factors || [];
  const increasingFactors = contributing.filter((f) => f.direction === 'increases_risk');
  const decreasingFactors = contributing.filter((f) => f.direction !== 'increases_risk');

  // Max impact for relative chart bars
  const maxImpact = Math.max(...contributing.map((f) => Math.abs(f.contribution || 0)), 0.01);

  const handleDownloadPdf = () => {
    generatePdfReport({
      formData,
      result: {
        prediction_type: 'Quick Risk Check',
        model_name: result.model || 'Quick Logistic Regression',
        probability: percentage,
        risk_level: riskLevel,
        prediction: result.prediction,
        contributing_factors: contributing,
      },
      timestamp: new Date(),
    });
  };

  return (
    <div className="prediction-result-wrapper" id="quick-prediction-result-section">
      {/* Top Header & Actions */}
      <div className="result-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <h2 className="result-title" style={{ margin: 0 }}>Model Risk Assessment Results</h2>
            <span className="type-tag-pill pill-quick" style={{ fontSize: '0.76rem', padding: '0.2rem 0.65rem' }}>
              Quick Risk Check (4 Features)
            </span>
          </div>
          <p className="result-subtitle">
            Preliminary statistical risk estimate calculated by dedicated 4-feature L2 Logistic Regression.
          </p>
        </div>

        <div className="result-header-actions">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="btn-primary btn-pdf"
            id="btn-download-quick-pdf"
            title="Download Quick Risk Check assessment report as a printable PDF"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Report
          </button>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary btn-reset"
              id="btn-quick-new-assessment"
            >
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
          <strong>Educational model estimate only — not a medical diagnosis:</strong>
          <p>
            This application is developed strictly for <em>academic and educational demonstration</em> purposes.
            The estimated risk probability is a statistical output from a 4-feature Logistic Regression model
            and must <strong>NOT</strong> be considered a clinical medical diagnosis, prognosis, or substitute for professional medical consultation.
          </p>
        </div>
      </div>

      {/* Primary Prediction Card with RiskBar */}
      <div className="model-cards-grid single-model-layout">
        <div className="model-card single-card">
          <div className="model-card-header">
            <div className="card-header-left">
              <div className="card-header-icon" style={{ background: '#059669', color: '#ffffff' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <h3 className="card-header-title">Estimated Heart Risk Probability</h3>
                <span className="card-header-subtitle">Quick Logistic Regression (4 Basic Inputs)</span>
              </div>
            </div>
            <span className={`status-pill ${riskBadgeClass}`}>
              {riskLevel}
            </span>
          </div>

          <div className="probability-display">
            <span className="prob-number">{percentage.toFixed(1)}</span>
            <span className="prob-unit">%</span>
          </div>
          <p className="prob-caption">Model-estimated probability of cardiovascular disease based on 4 accessible measurements</p>

          <RiskBar probability={percentage} />

          <div className="model-meta">
            <div className="meta-row">
              <span className="meta-label">Model Pipeline:</span>
              <span className="meta-value">Dedicated Quick StandardScaler + 4-Feature L2 Logistic Regression (C=0.05)</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Patient Inputs:</span>
              <span className="meta-value">
                Age: {formData?.age} yrs &bull; Gender: {Number(formData?.sex) === 1 ? 'Male' : 'Female'} &bull; Blood Pressure: {formData?.bp} mm Hg &bull; Heart Rate: {formData?.max_hr} bpm
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Binary Classification:</span>
              <span className="meta-value">
                Class {result.prediction} ({result.prediction === 1 ? 'Positive / Elevated Risk Indicated' : 'Negative / Absence'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick vs Detailed Comparison Box */}
      <div className="quick-comparison-card">
        <div className="quick-comparison-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="quick-comparison-content">
          <h4 className="quick-comparison-title">Quick Risk Check vs. Detailed Assessment</h4>
          <p className="quick-comparison-text">
            Quick Risk Check uses 4 available measurements for a simpler assessment.
            Detailed Assessment uses 13 clinical parameters and may provide a more comprehensive model-based estimate.
          </p>
          {onSwitchToDetailed && (
            <button
              type="button"
              className="btn-switch-detailed"
              onClick={() => onSwitchToDetailed(formData)}
            >
              <span>Continue with Detailed Assessment (13 Parameters) &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Explain My Prediction: Factors Increasing vs Decreasing Risk */}
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
            The following shows how the trained model weights the standardized input features (w &times; z)
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
                increasingFactors.map((factor, i) => (
                  <div key={i} className="factor-row factor-increasing">
                    <div className="factor-header">
                      <span className="factor-name">{factor.feature_name}</span>
                      <span className="factor-score">+{Number(factor.contribution).toFixed(4)}</span>
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
                decreasingFactors.map((factor, i) => (
                  <div key={i} className="factor-row factor-decreasing">
                    <div className="factor-header">
                      <span className="factor-name">{factor.feature_name}</span>
                      <span className="factor-score">{Number(factor.contribution).toFixed(4)}</span>
                    </div>
                    <p className="factor-desc">{factor.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="explain-disclaimer-note">
          * Note: Model contributions reflect statistical associations within the trained Quick Logistic Regression model and do not imply direct clinical causation.
        </p>
      </div>

      {/* Feature Contribution Horizontal Bar Chart */}
      {contributing.length > 0 && (
        <div className="contribution-chart-card">
          <div className="card-sub-header">
            <div className="card-sub-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3 className="card-sub-title">Feature Contribution Chart (4 Measurements)</h3>
            </div>
            <span className="card-sub-hint">
              Sorted by absolute impact (|w &middot; z|), strongest contributors first
            </span>
          </div>

          <div className="horizontal-bars-container">
            {contributing.map((item, idx) => {
              const isRisk = item.direction === 'increases_risk';
              const percent = Math.min(100, Math.round((Math.abs(item.contribution || 0) / maxImpact) * 100));

              return (
                <div key={idx} className="chart-bar-row">
                  <div className="chart-bar-label-col">
                    <span className="chart-bar-name">{item.feature_name}</span>
                    <span className="chart-bar-raw">
                      (val: {item.patient_value})
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
                      {item.contribution > 0 ? `+${Number(item.contribution).toFixed(3)}` : Number(item.contribution).toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Details Accordion */}
      <div className="technical-accordion">
        <button
          type="button"
          className="accordion-toggle-btn"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
        >
          <span>How does this work? (Model Details &amp; Coefficients)</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: showTechnicalDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showTechnicalDetails && (
          <div className="technical-content">
            <p>
              This Quick model uses an independent Logistic Regression trained on 504,000 samples and evaluated on 126,000 held-out samples.
              All 4 features are preprocessed using a dedicated <code>StandardScaler</code> fitted solely on the training split:
            </p>
            <div className="tech-table">
              <div className="tech-row tech-head">
                <span>Feature</span>
                <span>Trained Weight (coef_)</span>
                <span>Standardized Value (Z)</span>
                <span>Linear Component (w * z)</span>
              </div>
              {contributing.map((f, i) => (
                <div key={i} className="tech-row">
                  <span><strong>{f.feature_name}</strong></span>
                  <span>{f.coefficient > 0 ? `+${f.coefficient.toFixed(4)}` : f.coefficient.toFixed(4)}</span>
                  <span>{Number(f.standardized_value).toFixed(3)}</span>
                  <span>{f.contribution > 0 ? `+${Number(f.contribution).toFixed(4)}` : Number(f.contribution).toFixed(4)}</span>
                </div>
              ))}
            </div>
            <p className="tech-subnote">
              Base Model Intercept (&beta;<sub>0</sub>): <code>{result.model_info?.intercept?.toFixed(4) || '-0.0744'}</code>.
              Final Logit score: <code>{result.logit?.toFixed(4) || '—'}</code>.
              Estimated Probability = <code>1 / (1 + e^(-Logit)) = {percentage.toFixed(1)}%</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
