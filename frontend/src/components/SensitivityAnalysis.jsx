import React, { useState, useEffect } from 'react';
import { fetchSensitivityAnalysis } from '../api';

const DEFAULT_PATIENT = {
  age: 55,
  sex: 1,
  cp: 2,
  trestbps: 130,
  chol: 220,
  fbs: 0,
  restecg: 0,
  thalach: 150,
  exang: 0,
  oldpeak: 1.0,
  slope: 2,
  ca: 1,
  thal: 3,
};

export default function SensitivityAnalysis({ patientData = null }) {
  const [currentPatient, setCurrentPatient] = useState(() => {
    return patientData ? { ...DEFAULT_PATIENT, ...patientData } : { ...DEFAULT_PATIENT };
  });

  const [sensitivityData, setSensitivityData] = useState(null);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState('cp'); // Default selected feature
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (patientData) {
      setCurrentPatient({ ...DEFAULT_PATIENT, ...patientData });
    }
  }, [patientData]);

  useEffect(() => {
    let isMounted = true;
    const loadSensitivity = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetchSensitivityAnalysis(currentPatient);
      if (isMounted) {
        if (res.success && res.data) {
          setSensitivityData(res.data);
          // Default selected feature to highest sensitivity swing
          if (res.data.features_sensitivity?.length > 0) {
            setSelectedFeatureKey(res.data.features_sensitivity[0].feature_key);
          }
        } else {
          setErrorMsg(res.message || 'Failed to compute sensitivity analysis.');
        }
        setIsLoading(false);
      }
    };

    loadSensitivity();
    return () => {
      isMounted = false;
    };
  }, [currentPatient]);

  if (isLoading) {
    return (
      <div className="sensitivity-loading">
        <span className="spinner" />
        <p>Computing sensitivity gradients across 13 clinical dimensions...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="alert-banner alert-error" role="alert">
        <strong>Sensitivity Error:</strong> {errorMsg}
      </div>
    );
  }

  const featuresList = sensitivityData?.features_sensitivity || [];
  const baseProb = sensitivityData?.baseline_probability ?? 0;
  const maxSwing = featuresList.length > 0 ? Math.max(...featuresList.map((f) => f.sensitivity_swing), 1.0) : 100;

  const selectedFeature = featuresList.find((f) => f.feature_key === selectedFeatureKey) || featuresList[0];

  return (
    <div className="sensitivity-container">
      {/* Header */}
      <div className="sensitivity-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">📊</span>
            <span>Univariate Perturbation Gradients</span>
          </div>
          <h2 className="section-title">Feature Sensitivity Analysis</h2>
          <p className="section-subtitle">
            Evaluates how cardiac risk probability shifts when each of the 13 clinical features is systematically varied across its valid clinical spectrum while holding all other 12 patient features constant.
          </p>
        </div>

        <div className="sensitivity-baseline-badge">
          <span className="badge-title">Patient Baseline Risk:</span>
          <span className="badge-value">{baseProb.toFixed(1)}%</span>
        </div>
      </div>

      {/* Main Two-Column Layout: Ranking on Left, Deep-Dive on Right */}
      <div className="sensitivity-layout-grid">
        {/* Left Column: Sensitivity Impact Ranking */}
        <div className="sensitivity-card ranking-card">
          <div className="card-sub-header">
            <div className="card-sub-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <h3 className="card-sub-title">Sensitivity Impact Ranking</h3>
            </div>
            <span className="card-sub-hint">
              Ranked by max probability swing (&Delta; P_max - P_min)
            </span>
          </div>

          <div className="ranking-table-container">
            {featuresList.map((item, idx) => {
              const isSelected = item.feature_key === selectedFeatureKey;
              const barPercent = Math.min(100, Math.round((item.sensitivity_swing / maxSwing) * 100));

              return (
                <div
                  key={item.feature_key}
                  className={`ranking-row ${isSelected ? 'row-selected' : ''}`}
                  onClick={() => setSelectedFeatureKey(item.feature_key)}
                  role="button"
                  tabIndex={0}
                  title={`Click to inspect ${item.feature_name} sensitivity curve`}
                >
                  <div className="ranking-rank-num">#{idx + 1}</div>

                  <div className="ranking-info-col">
                    <div className="ranking-name-row">
                      <span className="ranking-name">{item.feature_name}</span>
                      <span className="ranking-swing-tag">
                        &plusmn;{item.sensitivity_swing.toFixed(1)}% swing
                      </span>
                    </div>

                    <div className="ranking-bar-track">
                      <div
                        className="ranking-bar-fill"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>

                    <div className="ranking-meta-row">
                      <span>Val: {item.current_value} {item.unit}</span>
                      <span>Range: {item.min_probability.toFixed(1)}% &rarr; {item.max_probability.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Feature Detailed Curve & Variations */}
        {selectedFeature && (
          <div className="sensitivity-card detail-card">
            <div className="card-sub-header">
              <div className="card-sub-title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <h3 className="card-sub-title">
                  {selectedFeature.feature_name} &bull; Probability Curve
                </h3>
              </div>
              <span className="card-sub-hint">
                All other 12 inputs fixed at patient baseline
              </span>
            </div>

            {/* Feature KPI Summary Header */}
            <div className="detail-kpi-row">
              <div className="detail-kpi-box">
                <span className="kpi-mini-label">Current Value</span>
                <span className="kpi-mini-val">{selectedFeature.current_value} {selectedFeature.unit}</span>
              </div>
              <div className="detail-kpi-box">
                <span className="kpi-mini-label">Min Model Risk</span>
                <span className="kpi-mini-val text-good">{selectedFeature.min_probability.toFixed(1)}%</span>
              </div>
              <div className="detail-kpi-box">
                <span className="kpi-mini-label">Max Model Risk</span>
                <span className="kpi-mini-val text-bad">{selectedFeature.max_probability.toFixed(1)}%</span>
              </div>
              <div className="detail-kpi-box">
                <span className="kpi-mini-label">Max Swing</span>
                <span className="kpi-mini-val text-primary">&Delta; {selectedFeature.sensitivity_swing.toFixed(1)}%</span>
              </div>
            </div>

            {/* Interactive SVG Bar/Curve Chart */}
            <div className="chart-canvas-wrapper">
              <div className="curve-chart-container">
                {selectedFeature.points.map((pt, i) => {
                  const isBase = pt.is_current;
                  const deltaSign = pt.delta > 0 ? `+${pt.delta.toFixed(1)}` : `${pt.delta.toFixed(1)}`;
                  const isHigher = pt.probability > baseProb;

                  return (
                    <div key={i} className={`curve-point-col ${isBase ? 'point-is-baseline' : ''}`}>
                      {/* Bar visualization */}
                      <div className="curve-bar-col">
                        <span className="point-prob-label">{pt.probability.toFixed(1)}%</span>
                        <div className="curve-bar-track">
                          <div
                            className={`curve-bar-pillar ${isBase ? 'pillar-baseline' : isHigher ? 'pillar-higher' : 'pillar-lower'}`}
                            style={{ height: `${Math.max(8, pt.probability)}%` }}
                          />
                        </div>
                      </div>

                      {/* X-axis Label & Delta */}
                      <div className="point-x-meta">
                        <strong className="point-val-label">{pt.label}</strong>
                        {isBase ? (
                          <span className="point-base-tag">Current</span>
                        ) : (
                          <span className={`point-delta-tag ${pt.delta > 0 ? 'delta-tag-up' : 'delta-tag-down'}`}>
                            {deltaSign}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="points-table-wrapper">
              <table className="sensitivity-table">
                <thead>
                  <tr>
                    <th>Test Parameter Value</th>
                    <th>Model Probability</th>
                    <th>Change vs Current</th>
                    <th>Effect Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFeature.points.map((pt, idx) => (
                    <tr key={idx} className={pt.is_current ? 'table-row-baseline' : ''}>
                      <td>
                        <strong>{pt.label}</strong> {pt.is_current && <span className="cell-base-pill">Current</span>}
                      </td>
                      <td>
                        <span className="cell-prob">{pt.probability.toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className={`cell-delta ${pt.delta > 0 ? 'text-bad' : pt.delta < 0 ? 'text-good' : 'text-neutral'}`}>
                          {pt.delta > 0 ? `+${pt.delta.toFixed(1)}% pts` : `${pt.delta.toFixed(1)}% pts`}
                        </span>
                      </td>
                      <td>
                        {pt.delta > 0 ? (
                          <span className="dir-badge dir-up">&uarr; Increases Risk</span>
                        ) : pt.delta < 0 ? (
                          <span className="dir-badge dir-down">&darr; Decreases Risk (Protective)</span>
                        ) : (
                          <span className="dir-badge dir-neutral">&harr; Baseline Value</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
