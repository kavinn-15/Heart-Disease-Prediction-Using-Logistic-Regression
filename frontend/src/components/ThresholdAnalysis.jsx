import React, { useState, useEffect } from 'react';
import { fetchThresholdAnalysis } from '../api';

const QUICK_THRESHOLDS = [0.30, 0.40, 0.50, 0.60, 0.70];

export default function ThresholdAnalysis() {
  const [selectedThreshold, setSelectedThreshold] = useState(0.50);
  const [thresholdData, setThresholdData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadThreshold = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetchThresholdAnalysis(selectedThreshold);
      if (isMounted) {
        if (res.success && res.data) {
          setThresholdData(res.data);
        } else {
          setErrorMsg(res.message || 'Failed to load threshold analysis data.');
        }
        setIsLoading(false);
      }
    };

    loadThreshold();
    return () => {
      isMounted = false;
    };
  }, [selectedThreshold]);

  const metrics = thresholdData?.metrics || {};
  const totalSamples = thresholdData?.total_test_samples || 126000;
  const tn = metrics.tn ?? 61938;
  const fp = metrics.fp ?? 7571;
  const fn = metrics.fn ?? 7026;
  const tp = metrics.tp ?? 49465;

  const accuracy = (metrics.accuracy ?? 0.8842) * 100;
  const precision = (metrics.precision ?? 0.8673) * 100;
  const recall = (metrics.recall ?? 0.8756) * 100;
  const f1 = (metrics.f1 ?? 0.8714) * 100;

  const allThresholds = thresholdData?.all_thresholds || [];

  return (
    <div className="threshold-container">
      {/* Header */}
      <div className="threshold-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">🎯</span>
            <span>Classification Decision Trade-off</span>
          </div>
          <h2 className="section-title">Prediction Threshold Analysis</h2>
          <p className="section-subtitle">
            Explore how modifying the decision cutoff (threshold &tau;) impacts clinical sensitivity (recall) versus specificity and precision on 126,000 held-out test patients.
          </p>
        </div>

        <div className="threshold-tag-badge">
          <span>Operating Cutoff: &tau; = {selectedThreshold.toFixed(2)}</span>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="disclaimer-banner education-banner" role="note">
        <div className="disclaimer-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="disclaimer-content">
          <strong>Model Invariance Note:</strong>
          <p>
            Modifying the classification threshold changes the decision rule (<code>P(Presence) &ge; &tau; &rarr; Positive</code>) 
            and shifts the trade-off between False Positives and False Negatives. 
            The underlying Logistic Regression model weights and calibrated predicted probabilities remain identical and are <strong>NOT</strong> retrained.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-error" role="alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Threshold Slider & Quick Selectors */}
      <div className="threshold-controls-card">
        <div className="threshold-slider-row">
          <div className="slider-label-col">
            <label htmlFor="threshold-slider" className="slider-title">
              Decision Threshold (&tau;): <strong>{selectedThreshold.toFixed(2)}</strong>
            </label>
            <span className="slider-hint">
              Patients with P &ge; {(selectedThreshold * 100).toFixed(0)}% are classified as Positive (Cardiac Risk Indicated)
            </span>
          </div>

          <div className="slider-input-col">
            <input
              id="threshold-slider"
              type="range"
              min="0.10"
              max="0.90"
              step="0.02"
              value={selectedThreshold}
              onChange={(e) => setSelectedThreshold(parseFloat(e.target.value))}
              className="threshold-range-slider"
            />
            <div className="slider-ticks">
              <span>0.10 (High Sensitivity)</span>
              <span>0.50 (Standard)</span>
              <span>0.90 (High Specificity)</span>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="quick-thresholds-row">
          <span className="quick-label">Standard Operating Points:</span>
          <div className="quick-buttons-group">
            {QUICK_THRESHOLDS.map((th) => (
              <button
                key={th}
                type="button"
                className={`btn-th-preset ${Math.abs(selectedThreshold - th) < 0.01 ? 'btn-th-active' : ''}`}
                onClick={() => setSelectedThreshold(th)}
              >
                &tau; = {th.toFixed(2)} {th === 0.50 && '(Default)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics KPI Cards */}
      <div className="metrics-kpi-grid">
        <div className="metric-kpi-card highlight-card">
          <span className="kpi-label">F1-Score</span>
          <span className="kpi-value">{f1.toFixed(2)}%</span>
          <span className="kpi-subtext">Harmonic mean of precision &amp; recall</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Recall (Sensitivity)</span>
          <span className="kpi-value">{recall.toFixed(2)}%</span>
          <span className="kpi-subtext">Detected {(tp).toLocaleString()} of {(tp + fn).toLocaleString()} true positives</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Precision (PPV)</span>
          <span className="kpi-value">{precision.toFixed(2)}%</span>
          <span className="kpi-subtext">Positive predictive accuracy</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Accuracy</span>
          <span className="kpi-value">{accuracy.toFixed(2)}%</span>
          <span className="kpi-subtext">Overall correct classifications</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">False Negatives (FN)</span>
          <span className={`kpi-value ${fn > 15000 ? 'text-bad' : 'text-neutral'}`}>
            {fn.toLocaleString()}
          </span>
          <span className="kpi-subtext">Missed positive risk cases</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">False Positives (FP)</span>
          <span className={`kpi-value ${fp > 15000 ? 'text-bad' : 'text-neutral'}`}>
            {fp.toLocaleString()}
          </span>
          <span className="kpi-subtext">False alarms (over-diagnosed)</span>
        </div>
      </div>

      {/* Two Column Grid: Dynamic Confusion Matrix & Trade-off Insights */}
      <div className="threshold-grid-two">
        {/* Dynamic Confusion Matrix for this threshold */}
        <div className="threshold-card">
          <div className="perf-card-header">
            <h3 className="perf-card-title">Confusion Matrix at &tau; = {selectedThreshold.toFixed(2)}</h3>
            <span className="perf-card-subtitle">{totalSamples.toLocaleString()} held-out test evaluations</span>
          </div>

          <div className="confusion-matrix-table">
            <div className="cm-header-row">
              <span className="cm-corner" />
              <span className="cm-col-label">Predicted Absence (0)</span>
              <span className="cm-col-label">Predicted Presence (1)</span>
            </div>

            <div className="cm-data-row">
              <span className="cm-row-label">Actual Absence (0)</span>
              <div className="cm-cell cm-tn">
                <span className="cm-count">{tn.toLocaleString()}</span>
                <span className="cm-caption">True Negative (TN)</span>
                <span className="cm-percent">{((tn / totalSamples) * 100).toFixed(1)}%</span>
              </div>
              <div className="cm-cell cm-fp">
                <span className="cm-count">{fp.toLocaleString()}</span>
                <span className="cm-caption">False Positive (FP)</span>
                <span className="cm-percent">{((fp / totalSamples) * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="cm-data-row">
              <span className="cm-row-label">Actual Presence (1)</span>
              <div className="cm-cell cm-fn">
                <span className="cm-count">{fn.toLocaleString()}</span>
                <span className="cm-caption">False Negative (FN)</span>
                <span className="cm-percent">{((fn / totalSamples) * 100).toFixed(1)}%</span>
              </div>
              <div className="cm-cell cm-tp">
                <span className="cm-count">{tp.toLocaleString()}</span>
                <span className="cm-caption">True Positive (TP)</span>
                <span className="cm-percent">{((tp / totalSamples) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Trade-off Guidance Card */}
        <div className="threshold-card">
          <div className="perf-card-header">
            <h3 className="perf-card-title">Threshold Decision Trade-off Analysis</h3>
            <span className="perf-card-subtitle">Statistical trade-off behavior</span>
          </div>

          <div className="tradeoff-analysis-content">
            <div className="tradeoff-item">
              <div className="tradeoff-icon-col icon-low">
                <span>&darr;</span>
              </div>
              <div>
                <h4>Lower Threshold (&tau; &lt; 0.50): Prioritize High Recall</h4>
                <p>
                  Optimizes for screening sensitivity. Fewer cardiac cases are missed (low False Negatives: {fn.toLocaleString()}), 
                  at the cost of increased false alarms (False Positives: {fp.toLocaleString()}).
                </p>
              </div>
            </div>

            <div className="tradeoff-item">
              <div className="tradeoff-icon-col icon-balanced">
                <span>&harr;</span>
              </div>
              <div>
                <h4>Default Threshold (&tau; = 0.50): Maximum F1 Balance</h4>
                <p>
                  Balances Precision ({precision.toFixed(1)}%) and Recall ({recall.toFixed(1)}%), 
                  providing optimal generalizability (F1 = {f1.toFixed(1)}%) across the test population.
                </p>
              </div>
            </div>

            <div className="tradeoff-item">
              <div className="tradeoff-icon-col icon-high">
                <span>&uarr;</span>
              </div>
              <div>
                <h4>Higher Threshold (&tau; &gt; 0.50): Prioritize High Precision</h4>
                <p>
                  Minimizes false alarms (False Positives: {fp.toLocaleString()}), ensuring that predicted positive patients have very high probability, 
                  at the risk of missing milder or borderline presentations (False Negatives: {fn.toLocaleString()}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
