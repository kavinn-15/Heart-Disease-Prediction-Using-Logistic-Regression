import React, { useState, useEffect } from 'react';
import { fetchModelCoefficients } from '../api';

export default function CoefficientExplorer() {
  const [coeffData, setCoeffData] = useState(null);
  const [sortBy, setSortBy] = useState('magnitude'); // 'magnitude' | 'direction' | 'name'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'base_only'
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetchModelCoefficients();
      if (isMounted) {
        if (res.success && res.data) {
          setCoeffData(res.data);
        } else {
          setErrorMsg(res.message || 'Failed to load model coefficients.');
        }
        setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="coefficients-loading">
        <span className="spinner" />
        <p>Loading trained Logistic Regression weights from model.coef_...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="alert-banner alert-error" role="alert">
        <strong>Error:</strong> {errorMsg}
      </div>
    );
  }

  const rawCoeffs = coeffData?.coefficients || [];
  const intercept = coeffData?.intercept ?? -0.0697;
  const scalerNote = coeffData?.scaler_note || '';

  // Filter
  const filtered = rawCoeffs.filter((item) => {
    if (filterMode === 'base_only') return !item.is_derived;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'magnitude') {
      return b.absolute_coefficient - a.absolute_coefficient;
    }
    if (sortBy === 'direction') {
      return b.coefficient - a.coefficient;
    }
    if (sortBy === 'name') {
      return a.feature_name.localeCompare(b.feature_name);
    }
    return 0;
  });

  const maxAbs = Math.max(...rawCoeffs.map((c) => c.absolute_coefficient), 0.1);

  return (
    <div className="coefficients-container">
      {/* Header */}
      <div className="coefficients-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">⚖️</span>
            <span>Mathematical Model Parameters</span>
          </div>
          <h2 className="section-title">Logistic Regression Coefficient Explorer</h2>
          <p className="section-subtitle">
            Inspect the exact mathematical weights (w_i) optimized via L2-regularized maximum likelihood estimation.
          </p>
        </div>

        <div className="intercept-badge">
          <span className="badge-title">Model Intercept (&beta;0):</span>
          <span className="badge-value">{intercept > 0 ? `+${intercept.toFixed(4)}` : intercept.toFixed(4)}</span>
        </div>
      </div>

      {/* Mandatory Standardized Scaling Explanation Notice */}
      <div className="disclaimer-banner education-banner" role="note">
        <div className="disclaimer-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="disclaimer-content">
          <strong>Standardized Representation Notice:</strong>
          <p>
            {scalerNote ||
              'This visualization shows how the trained Logistic Regression model weights standardized input features. Because all features are scaled using StandardScaler (Z-score normalization), coefficient magnitudes represent the change in log-odds per standard deviation unit change, rather than direct unstandardized clinical units.'}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="coefficients-controls-card">
        <div className="controls-group">
          <span className="control-label">Sort Features:</span>
          <div className="pill-toggle-group">
            <button
              type="button"
              className={`pill-btn ${sortBy === 'magnitude' ? 'pill-active' : ''}`}
              onClick={() => setSortBy('magnitude')}
            >
              Absolute Magnitude (|w|)
            </button>
            <button
              type="button"
              className={`pill-btn ${sortBy === 'direction' ? 'pill-active' : ''}`}
              onClick={() => setSortBy('direction')}
            >
              Positive &rarr; Negative
            </button>
            <button
              type="button"
              className={`pill-btn ${sortBy === 'name' ? 'pill-active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              Alphabetical Name
            </button>
          </div>
        </div>

        <div className="controls-group">
          <span className="control-label">Feature Scope:</span>
          <div className="pill-toggle-group">
            <button
              type="button"
              className={`pill-btn ${filterMode === 'all' ? 'pill-active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All 16 Model Features
            </button>
            <button
              type="button"
              className={`pill-btn ${filterMode === 'base_only' ? 'pill-active' : ''}`}
              onClick={() => setFilterMode('base_only')}
            >
              13 Clinical Inputs Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Coefficient Horizontal Bars Chart */}
      <div className="coefficients-chart-card">
        <div className="card-sub-header">
          <div className="card-sub-title-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h3 className="card-sub-title">Feature Weight Visualizer</h3>
          </div>
          <div className="legend-pills">
            <span className="legend-item"><span className="legend-dot dot-positive" /> + Risk Weight (Positive Log-Odds)</span>
            <span className="legend-item"><span className="legend-dot dot-negative" /> - Protective Weight (Negative Log-Odds)</span>
          </div>
        </div>

        <div className="coeff-bars-list">
          {sorted.map((item, idx) => {
            const isPos = item.coefficient > 0;
            const percent = Math.min(100, Math.round((item.absolute_coefficient / maxAbs) * 100));

            return (
              <div key={item.feature_key} className="coeff-bar-row">
                {/* Feature Label Column */}
                <div className="coeff-label-col">
                  <div className="coeff-name-row">
                    <span className="coeff-feature-name">{item.feature_name}</span>
                    {item.is_derived && <span className="derived-badge">Engineered Term</span>}
                  </div>
                  <span className="coeff-feature-desc">{item.description}</span>
                </div>

                {/* Visual Bar Track Column */}
                <div className="coeff-bar-col">
                  <div className="coeff-track">
                    <div
                      className={`coeff-fill ${isPos ? 'fill-positive' : 'fill-negative'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Exact Value Column */}
                <div className="coeff-value-col">
                  <span className={`coeff-val-badge ${isPos ? 'val-badge-positive' : 'val-badge-negative'}`}>
                    {item.coefficient > 0 ? `+${item.coefficient.toFixed(4)}` : item.coefficient.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
