import React, { useState, useEffect } from 'react';
import { fetchConfusionMatrix } from '../api';

const QUICK_THRESHOLDS = [0.30, 0.40, 0.50, 0.60, 0.70];

export default function ConfusionMatrixExplorer() {
  const [threshold, setThreshold] = useState(0.50);
  const [matrixData, setMatrixData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetchConfusionMatrix(threshold);
      if (isMounted) {
        if (res.success && res.data) {
          setMatrixData(res.data);
        } else {
          setErrorMsg(res.message || 'Failed to load confusion matrix data.');
        }
        setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [threshold]);

  const counts = matrixData?.counts || { tn: 61938, fp: 7571, fn: 7026, tp: 49465 };
  const metrics = matrixData?.metrics || { accuracy: 0.8842, precision: 0.8673, recall: 0.8756, f1: 0.8714 };
  const explanations = matrixData?.explanations || {};
  const total = counts.tn + counts.fp + counts.fn + counts.tp;

  const tnPct = ((counts.tn / total) * 100).toFixed(1);
  const fpPct = ((counts.fp / total) * 100).toFixed(1);
  const fnPct = ((counts.fn / total) * 100).toFixed(1);
  const tpPct = ((counts.tp / total) * 100).toFixed(1);

  return (
    <div className="cm-explorer-container">
      {/* Header */}
      <div className="cm-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">🔲</span>
            <span>Contingency Matrix &amp; Error Taxonomy</span>
          </div>
          <h2 className="section-title">Confusion Matrix Explorer</h2>
          <p className="section-subtitle">
            Inspect correct classifications and error distributions on 126,000 held-out test patients as the decision threshold &tau; varies.
          </p>
        </div>

        <div className="threshold-tag-badge">
          <span>Decision Cutoff: &tau; = {threshold.toFixed(2)}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-error" role="alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Threshold Controller Bar */}
      <div className="threshold-controls-card">
        <div className="threshold-slider-row">
          <div className="slider-label-col">
            <label htmlFor="cm-threshold-slider" className="slider-title">
              Classification Threshold: <strong>&tau; = {threshold.toFixed(2)}</strong>
            </label>
            <span className="slider-hint">
              Dynamically shifts boundaries between True/False Positives and True/False Negatives
            </span>
          </div>

          <div className="slider-input-col">
            <input
              id="cm-threshold-slider"
              type="range"
              min="0.10"
              max="0.90"
              step="0.02"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="threshold-range-slider"
            />
          </div>
        </div>

        <div className="quick-thresholds-row">
          <span className="quick-label">Operating Presets:</span>
          <div className="quick-buttons-group">
            {QUICK_THRESHOLDS.map((th) => (
              <button
                key={th}
                type="button"
                className={`btn-th-preset ${Math.abs(threshold - th) < 0.01 ? 'btn-th-active' : ''}`}
                onClick={() => setThreshold(th)}
              >
                &tau; = {th.toFixed(2)} {th === 0.50 && '(Default)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contingency 2x2 Table */}
      <div className="cm-main-card">
        <div className="perf-card-header">
          <h3 className="perf-card-title">Contingency Matrix (Held-out Test Cohort)</h3>
          <span className="perf-card-subtitle">{total.toLocaleString()} patient evaluations</span>
        </div>

        <div className="confusion-matrix-table cm-matrix-large">
          <div className="cm-header-row">
            <span className="cm-corner">Actual \ Predicted</span>
            <span className="cm-col-label">
              Predicted Negative (0)
              <span className="cm-col-sub">&lt; {threshold.toFixed(2)}</span>
            </span>
            <span className="cm-col-label">
              Predicted Positive (1)
              <span className="cm-col-sub">&ge; {threshold.toFixed(2)}</span>
            </span>
          </div>

          {/* Actual Negative Row */}
          <div className="cm-data-row">
            <span className="cm-row-label">
              Actual Negative (0)
              <span className="cm-row-sub">Absence ({(counts.tn + counts.fp).toLocaleString()})</span>
            </span>

            {/* TN Cell */}
            <div className="cm-cell cm-tn cm-interactive-cell">
              <span className="cm-count">{counts.tn.toLocaleString()}</span>
              <span className="cm-caption">True Negative (TN)</span>
              <span className="cm-percent">{tnPct}% of test set</span>
              <span className="cm-cell-tag tag-correct">Correct &bull; Specificity</span>
            </div>

            {/* FP Cell */}
            <div className="cm-cell cm-fp cm-interactive-cell">
              <span className="cm-count">{counts.fp.toLocaleString()}</span>
              <span className="cm-caption">False Positive (FP)</span>
              <span className="cm-percent">{fpPct}% of test set</span>
              <span className="cm-cell-tag tag-error">Type I Error &bull; False Alarm</span>
            </div>
          </div>

          {/* Actual Positive Row */}
          <div className="cm-data-row">
            <span className="cm-row-label">
              Actual Positive (1)
              <span className="cm-row-sub">Presence ({(counts.fn + counts.tp).toLocaleString()})</span>
            </span>

            {/* FN Cell */}
            <div className="cm-cell cm-fn cm-interactive-cell">
              <span className="cm-count">{counts.fn.toLocaleString()}</span>
              <span className="cm-caption">False Negative (FN)</span>
              <span className="cm-percent">{fnPct}% of test set</span>
              <span className="cm-cell-tag tag-error">Type II Error &bull; Missed Risk</span>
            </div>

            {/* TP Cell */}
            <div className="cm-cell cm-tp cm-interactive-cell">
              <span className="cm-count">{counts.tp.toLocaleString()}</span>
              <span className="cm-caption">True Positive (TP)</span>
              <span className="cm-percent">{tpPct}% of test set</span>
              <span className="cm-cell-tag tag-correct">Correct &bull; Sensitivity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="metrics-kpi-grid">
        <div className="metric-kpi-card highlight-card">
          <span className="kpi-label">Accuracy</span>
          <span className="kpi-value">{((metrics.accuracy ?? 0.8842) * 100).toFixed(2)}%</span>
          <span className="kpi-subtext">(TN + TP) / Total</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Precision (PPV)</span>
          <span className="kpi-value">{((metrics.precision ?? 0.8673) * 100).toFixed(2)}%</span>
          <span className="kpi-subtext">TP / (TP + FP)</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">Recall (Sensitivity)</span>
          <span className="kpi-value">{((metrics.recall ?? 0.8756) * 100).toFixed(2)}%</span>
          <span className="kpi-subtext">TP / (TP + FN)</span>
        </div>

        <div className="metric-kpi-card">
          <span className="kpi-label">F1-Score</span>
          <span className="kpi-value">{((metrics.f1 ?? 0.8714) * 100).toFixed(2)}%</span>
          <span className="kpi-subtext">Harmonic Mean</span>
        </div>
      </div>

      {/* Educational Concept Cards */}
      <div className="cm-explanations-grid">
        <div className="cm-explain-card card-tp">
          <div className="explain-badge badge-green">True Positive (TP)</div>
          <p className="explain-text">
            {explanations.true_positive || 'Correctly predicted positive case where the patient has heart disease presence.'}
          </p>
          <span className="explain-count-tag">{(counts.tp).toLocaleString()} patients ({tpPct}%)</span>
        </div>

        <div className="cm-explain-card card-tn">
          <div className="explain-badge badge-blue">True Negative (TN)</div>
          <p className="explain-text">
            {explanations.true_negative || 'Correctly predicted negative case where the patient does not have heart disease.'}
          </p>
          <span className="explain-count-tag">{(counts.tn).toLocaleString()} patients ({tnPct}%)</span>
        </div>

        <div className="cm-explain-card card-fp">
          <div className="explain-badge badge-amber">False Positive (FP)</div>
          <p className="explain-text">
            {explanations.false_positive || 'Negative patient erroneously classified as positive (Type I error / False Alarm).'}
          </p>
          <span className="explain-count-tag">{(counts.fp).toLocaleString()} patients ({fpPct}%)</span>
        </div>

        <div className="cm-explain-card card-fn">
          <div className="explain-badge badge-red">False Negative (FN)</div>
          <p className="explain-text">
            {explanations.false_negative || 'Positive patient erroneously classified as negative (Type II error / Missed Risk).'}
          </p>
          <span className="explain-count-tag">{(counts.fn).toLocaleString()} patients ({fnPct}%)</span>
        </div>
      </div>
    </div>
  );
}
