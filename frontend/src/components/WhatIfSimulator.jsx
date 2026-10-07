import React, { useState, useEffect, useRef } from 'react';
import { simulateWhatIf } from '../api';
import RiskBar from './RiskBar';

const DEFAULT_PATIENT = {
  age: 58,
  sex: 1,
  cp: 4,
  trestbps: 140,
  chol: 240,
  fbs: 0,
  restecg: 1,
  thalach: 150,
  exang: 1,
  oldpeak: 2.0,
  slope: 2,
  ca: 2,
  thal: 7,
};

const PRESETS = {
  moderate: {
    name: '58yo Asymptomatic (Moderate/High)',
    data: {
      age: 58,
      sex: 1,
      cp: 4,
      trestbps: 140,
      chol: 240,
      fbs: 0,
      restecg: 1,
      thalach: 150,
      exang: 1,
      oldpeak: 2.0,
      slope: 2,
      ca: 2,
      thal: 7,
    },
  },
  lowRisk: {
    name: '38yo Healthy Athlete (Low Risk)',
    data: {
      age: 38,
      sex: 0,
      cp: 1,
      trestbps: 115,
      chol: 175,
      fbs: 0,
      restecg: 0,
      thalach: 172,
      exang: 0,
      oldpeak: 0.0,
      slope: 1,
      ca: 0,
      thal: 3,
    },
  },
  seniorHigh: {
    name: '64yo Multi-vessel Disease (High Risk)',
    data: {
      age: 64,
      sex: 1,
      cp: 4,
      trestbps: 160,
      chol: 285,
      fbs: 1,
      restecg: 2,
      thalach: 115,
      exang: 1,
      oldpeak: 3.2,
      slope: 2,
      ca: 3,
      thal: 7,
    },
  },
};

export default function WhatIfSimulator({ initialPatientData = null }) {
  const [baselineData, setBaselineData] = useState(() => {
    return initialPatientData ? { ...DEFAULT_PATIENT, ...initialPatientData } : { ...DEFAULT_PATIENT };
  });
  const [modifiedData, setModifiedData] = useState(() => {
    return initialPatientData ? { ...DEFAULT_PATIENT, ...initialPatientData } : { ...DEFAULT_PATIENT };
  });

  const [simulationResult, setSimulationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const debounceTimerRef = useRef(null);

  // If initialPatientData prop changes (e.g. from Assessment tab), update
  useEffect(() => {
    if (initialPatientData) {
      setBaselineData({ ...DEFAULT_PATIENT, ...initialPatientData });
      setModifiedData({ ...DEFAULT_PATIENT, ...initialPatientData });
    }
  }, [initialPatientData]);

  // Run simulation whenever baseline or modified inputs change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      setErrorMsg(null);
      const res = await simulateWhatIf(baselineData, modifiedData);
      setIsCalculating(false);

      if (res.success) {
        setSimulationResult(res.data);
      } else {
        setErrorMsg(res.message);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [baselineData, modifiedData]);

  const handleFieldChange = (field, val) => {
    setModifiedData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleResetToBaseline = () => {
    setModifiedData({ ...baselineData });
  };

  const handleApplyAsBaseline = () => {
    setBaselineData({ ...modifiedData });
  };

  const handleLoadPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    if (p) {
      setBaselineData({ ...p.data });
      setModifiedData({ ...p.data });
    }
  };

  const delta = simulationResult?.delta || {};
  const baseProb = simulationResult?.baseline?.probability ?? 0;
  const modProb = simulationResult?.modified?.probability ?? 0;
  const deltaPoints = delta?.probability_points ?? 0;
  const changedList = delta?.changed_features || [];

  const isDecreased = deltaPoints < -0.05;
  const isIncreased = deltaPoints > 0.05;

  return (
    <div className="what-if-container">
      {/* Header */}
      <div className="simulator-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">⚡</span>
            <span>Real-time Counterfactual Simulator</span>
          </div>
          <h2 className="section-title">What-If Clinical Risk Simulator</h2>
          <p className="section-subtitle">
            Modify one or multiple clinical parameters to see real-time probability shifts computed by the actual L2 Logistic Regression model and StandardScaler pipeline.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="simulator-presets-group">
          <span className="presets-label">Load Profile:</span>
          <button
            type="button"
            className="btn-preset"
            onClick={() => handleLoadPreset('moderate')}
            title="Load moderate risk profile"
          >
            Moderate Risk
          </button>
          <button
            type="button"
            className="btn-preset"
            onClick={() => handleLoadPreset('lowRisk')}
            title="Load low risk profile"
          >
            Low Risk
          </button>
          <button
            type="button"
            className="btn-preset"
            onClick={() => handleLoadPreset('seniorHigh')}
            title="Load high risk profile"
          >
            High Risk
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-error" role="alert">
          <strong>Simulation Warning:</strong> {errorMsg}
        </div>
      )}

      {/* Primary Comparison KPI Bar */}
      <div className="comparison-kpi-card">
        <div className="comparison-kpi-grid">
          {/* Baseline KPI */}
          <div className="kpi-panel baseline-panel">
            <span className="panel-badge badge-baseline">Baseline Patient</span>
            <div className="panel-prob-row">
              <span className="panel-prob-val">{baseProb.toFixed(1)}%</span>
              <span className={`status-pill ${baseProb >= 70 ? 'status-danger' : baseProb >= 30 ? 'status-warning' : 'status-healthy'}`}>
                {simulationResult?.baseline?.risk_level || (baseProb >= 70 ? 'High Risk' : baseProb >= 30 ? 'Moderate Risk' : 'Low Risk')}
              </span>
            </div>
            <RiskBar probability={baseProb} />
          </div>

          {/* Delta Indicator */}
          <div className="kpi-delta-panel">
            <div className={`delta-circle ${isDecreased ? 'delta-good' : isIncreased ? 'delta-bad' : 'delta-neutral'}`}>
              <span className="delta-symbol">
                {isDecreased ? '↓' : isIncreased ? '↑' : '↔'}
              </span>
            </div>
            <div className="delta-numbers">
              <span className={`delta-value ${isDecreased ? 'text-good' : isIncreased ? 'text-bad' : 'text-neutral'}`}>
                {deltaPoints > 0 ? `+${deltaPoints.toFixed(1)}` : deltaPoints.toFixed(1)}%
              </span>
              <span className="delta-label">
                {isDecreased ? 'Reduced Risk' : isIncreased ? 'Elevated Risk' : 'No Significant Change'}
              </span>
            </div>
            {isCalculating && <span className="calculating-indicator">Calculating...</span>}
          </div>

          {/* Modified KPI */}
          <div className="kpi-panel modified-panel">
            <span className="panel-badge badge-modified">What-If Scenario</span>
            <div className="panel-prob-row">
              <span className="panel-prob-val">{modProb.toFixed(1)}%</span>
              <span className={`status-pill ${modProb >= 70 ? 'status-danger' : modProb >= 30 ? 'status-warning' : 'status-healthy'}`}>
                {simulationResult?.modified?.risk_level || (modProb >= 70 ? 'High Risk' : modProb >= 30 ? 'Moderate Risk' : 'Low Risk')}
              </span>
            </div>
            <RiskBar probability={modProb} />
          </div>
        </div>

        {/* Changed parameters summary chips */}
        {changedList.length > 0 && (
          <div className="changed-chips-row">
            <span className="chips-title">Active Modifications ({changedList.length}):</span>
            <div className="chips-container">
              {changedList.map((ch) => (
                <span key={ch.feature_key} className="changed-chip">
                  <strong>{ch.feature_name}:</strong> {ch.baseline_value} &rarr; {ch.modified_value}
                  {ch.diff !== null && (
                    <span className="chip-diff">
                      ({ch.diff > 0 ? `+${ch.diff}` : ch.diff})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="simulator-actions-bar">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetToBaseline}
            disabled={changedList.length === 0}
            id="btn-reset-simulator"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset to Baseline
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyAsBaseline}
            disabled={changedList.length === 0}
            id="btn-apply-as-baseline"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Set Current Values as Baseline
          </button>
        </div>
      </div>

      {/* Interactive Feature Adjustment Grid */}
      <div className="simulator-controls-card">
        <div className="card-sub-header">
          <div className="card-sub-title-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h3 className="card-sub-title">Interactive Parameter Adjustments (13 Features)</h3>
          </div>
          <span className="card-sub-hint">
            Modified parameters are highlighted with an accent border
          </span>
        </div>

        <div className="simulator-grid">
          {/* 1. Age */}
          <div className={`sim-control-box ${Number(modifiedData.age) !== Number(baselineData.age) ? 'control-modified' : ''}`}>
            <div className="sim-control-label-row">
              <label htmlFor="sim-age" className="sim-label">Age</label>
              <span className="sim-curr-val">{modifiedData.age} yrs</span>
            </div>
            <input
              id="sim-age"
              type="range"
              min="20"
              max="90"
              step="1"
              value={modifiedData.age}
              onChange={(e) => handleFieldChange('age', Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-base-tag">Baseline: {baselineData.age} yrs</div>
          </div>

          {/* 2. Sex */}
          <div className={`sim-control-box ${Number(modifiedData.sex) !== Number(baselineData.sex) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-sex" className="sim-label">Biological Sex</label>
            <select
              id="sim-sex"
              value={modifiedData.sex}
              onChange={(e) => handleFieldChange('sex', Number(e.target.value))}
              className="sim-select"
            >
              <option value="1">Male (1)</option>
              <option value="0">Female (0)</option>
            </select>
            <div className="sim-base-tag">Baseline: {Number(baselineData.sex) === 1 ? 'Male' : 'Female'}</div>
          </div>

          {/* 3. Chest Pain Type */}
          <div className={`sim-control-box ${Number(modifiedData.cp) !== Number(baselineData.cp) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-cp" className="sim-label">Chest Pain Type</label>
            <select
              id="sim-cp"
              value={modifiedData.cp}
              onChange={(e) => handleFieldChange('cp', Number(e.target.value))}
              className="sim-select"
            >
              <option value="1">1: Typical Angina</option>
              <option value="2">2: Atypical Angina</option>
              <option value="3">3: Non-Anginal Pain</option>
              <option value="4">4: Asymptomatic (High Risk)</option>
            </select>
            <div className="sim-base-tag">Baseline: Type {baselineData.cp}</div>
          </div>

          {/* 4. Resting BP */}
          <div className={`sim-control-box ${Number(modifiedData.trestbps) !== Number(baselineData.trestbps) ? 'control-modified' : ''}`}>
            <div className="sim-control-label-row">
              <label htmlFor="sim-trestbps" className="sim-label">Resting Blood Pressure</label>
              <span className="sim-curr-val">{modifiedData.trestbps} mm Hg</span>
            </div>
            <input
              id="sim-trestbps"
              type="range"
              min="90"
              max="200"
              step="2"
              value={modifiedData.trestbps}
              onChange={(e) => handleFieldChange('trestbps', Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-base-tag">Baseline: {baselineData.trestbps} mm Hg</div>
          </div>

          {/* 5. Cholesterol */}
          <div className={`sim-control-box ${Number(modifiedData.chol) !== Number(baselineData.chol) ? 'control-modified' : ''}`}>
            <div className="sim-control-label-row">
              <label htmlFor="sim-chol" className="sim-label">Serum Cholesterol</label>
              <span className="sim-curr-val">{modifiedData.chol} mg/dl</span>
            </div>
            <input
              id="sim-chol"
              type="range"
              min="120"
              max="450"
              step="5"
              value={modifiedData.chol}
              onChange={(e) => handleFieldChange('chol', Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-base-tag">Baseline: {baselineData.chol} mg/dl</div>
          </div>

          {/* 6. Fasting Blood Sugar */}
          <div className={`sim-control-box ${Number(modifiedData.fbs) !== Number(baselineData.fbs) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-fbs" className="sim-label">Fasting Blood Sugar</label>
            <select
              id="sim-fbs"
              value={modifiedData.fbs}
              onChange={(e) => handleFieldChange('fbs', Number(e.target.value))}
              className="sim-select"
            >
              <option value="0">Normal (≤ 120 mg/dl)</option>
              <option value="1">Elevated (&gt; 120 mg/dl)</option>
            </select>
            <div className="sim-base-tag">Baseline: {Number(baselineData.fbs) === 1 ? '> 120' : '≤ 120'}</div>
          </div>

          {/* 7. Resting ECG */}
          <div className={`sim-control-box ${Number(modifiedData.restecg) !== Number(baselineData.restecg) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-restecg" className="sim-label">Resting ECG</label>
            <select
              id="sim-restecg"
              value={modifiedData.restecg}
              onChange={(e) => handleFieldChange('restecg', Number(e.target.value))}
              className="sim-select"
            >
              <option value="0">0: Normal</option>
              <option value="1">1: ST-T Wave Abnormality</option>
              <option value="2">2: Left Ventricular Hypertrophy</option>
            </select>
            <div className="sim-base-tag">Baseline: Code {baselineData.restecg}</div>
          </div>

          {/* 8. Max Heart Rate */}
          <div className={`sim-control-box ${Number(modifiedData.thalach) !== Number(baselineData.thalach) ? 'control-modified' : ''}`}>
            <div className="sim-control-label-row">
              <label htmlFor="sim-thalach" className="sim-label">Maximum Heart Rate</label>
              <span className="sim-curr-val">{modifiedData.thalach} bpm</span>
            </div>
            <input
              id="sim-thalach"
              type="range"
              min="70"
              max="210"
              step="2"
              value={modifiedData.thalach}
              onChange={(e) => handleFieldChange('thalach', Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-base-tag">Baseline: {baselineData.thalach} bpm</div>
          </div>

          {/* 9. Exercise Angina */}
          <div className={`sim-control-box ${Number(modifiedData.exang) !== Number(baselineData.exang) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-exang" className="sim-label">Exercise-Induced Angina</label>
            <select
              id="sim-exang"
              value={modifiedData.exang}
              onChange={(e) => handleFieldChange('exang', Number(e.target.value))}
              className="sim-select"
            >
              <option value="0">No (0)</option>
              <option value="1">Yes (1)</option>
            </select>
            <div className="sim-base-tag">Baseline: {Number(baselineData.exang) === 1 ? 'Yes' : 'No'}</div>
          </div>

          {/* 10. ST Depression (Oldpeak) */}
          <div className={`sim-control-box ${Number(modifiedData.oldpeak) !== Number(baselineData.oldpeak) ? 'control-modified' : ''}`}>
            <div className="sim-control-label-row">
              <label htmlFor="sim-oldpeak" className="sim-label">ST Depression (Oldpeak)</label>
              <span className="sim-curr-val">{Number(modifiedData.oldpeak).toFixed(1)} mm</span>
            </div>
            <input
              id="sim-oldpeak"
              type="range"
              min="0.0"
              max="6.0"
              step="0.1"
              value={modifiedData.oldpeak}
              onChange={(e) => handleFieldChange('oldpeak', Number(e.target.value))}
              className="sim-slider"
            />
            <div className="sim-base-tag">Baseline: {Number(baselineData.oldpeak).toFixed(1)} mm</div>
          </div>

          {/* 11. Slope */}
          <div className={`sim-control-box ${Number(modifiedData.slope) !== Number(baselineData.slope) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-slope" className="sim-label">Peak ST Slope</label>
            <select
              id="sim-slope"
              value={modifiedData.slope}
              onChange={(e) => handleFieldChange('slope', Number(e.target.value))}
              className="sim-select"
            >
              <option value="1">1: Upsloping (Protective)</option>
              <option value="2">2: Flat (Elevated Risk)</option>
              <option value="3">3: Downsloping</option>
            </select>
            <div className="sim-base-tag">Baseline: Slope {baselineData.slope}</div>
          </div>

          {/* 12. Major Vessels (CA) */}
          <div className={`sim-control-box ${Number(modifiedData.ca) !== Number(baselineData.ca) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-ca" className="sim-label">Fluoroscopy Major Vessels (CA)</label>
            <select
              id="sim-ca"
              value={modifiedData.ca}
              onChange={(e) => handleFieldChange('ca', Number(e.target.value))}
              className="sim-select"
            >
              <option value="0">0 Major Vessels</option>
              <option value="1">1 Major Vessel</option>
              <option value="2">2 Major Vessels</option>
              <option value="3">3 Major Vessels</option>
            </select>
            <div className="sim-base-tag">Baseline: {baselineData.ca} vessels</div>
          </div>

          {/* 13. Thalassemia */}
          <div className={`sim-control-box ${Number(modifiedData.thal) !== Number(baselineData.thal) ? 'control-modified' : ''}`}>
            <label htmlFor="sim-thal" className="sim-label">Thallium Stress Test (Thal)</label>
            <select
              id="sim-thal"
              value={modifiedData.thal}
              onChange={(e) => handleFieldChange('thal', Number(e.target.value))}
              className="sim-select"
            >
              <option value="3">3: Normal Perfusion</option>
              <option value="6">6: Fixed Perfusion Defect</option>
              <option value="7">7: Reversible Defect (High Risk)</option>
            </select>
            <div className="sim-base-tag">Baseline: Code {baselineData.thal}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
