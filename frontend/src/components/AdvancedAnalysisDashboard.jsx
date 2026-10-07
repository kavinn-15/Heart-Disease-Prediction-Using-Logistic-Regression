import React, { useState } from 'react';
import WhatIfSimulator from './WhatIfSimulator';
import SensitivityAnalysis from './SensitivityAnalysis';
import ThresholdAnalysis from './ThresholdAnalysis';
import RocExplorer from './RocExplorer';
import ConfusionMatrixExplorer from './ConfusionMatrixExplorer';
import CoefficientExplorer from './CoefficientExplorer';

export default function AdvancedAnalysisDashboard({ currentPatientData = null, initialSubTab = 'what-if' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  return (
    <div className="advanced-analysis-dashboard">
      {/* Sub-Navigation Tabs Bar */}
      <div className="advanced-subnav-bar">
        <div className="subnav-container">
          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'what-if' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('what-if')}
            id="subtab-what-if"
          >
            <span className="subnav-icon">⚡</span>
            <span>What-If Simulator</span>
          </button>

          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'sensitivity' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('sensitivity')}
            id="subtab-sensitivity"
          >
            <span className="subnav-icon">📊</span>
            <span>Sensitivity Analysis</span>
          </button>

          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'threshold' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('threshold')}
            id="subtab-threshold"
          >
            <span className="subnav-icon">🎯</span>
            <span>Threshold Analysis</span>
          </button>

          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'roc' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('roc')}
            id="subtab-roc"
          >
            <span className="subnav-icon">📈</span>
            <span>ROC Curve Explorer</span>
          </button>

          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'confusion-matrix' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('confusion-matrix')}
            id="subtab-confusion-matrix"
          >
            <span className="subnav-icon">🔲</span>
            <span>Confusion Matrix</span>
          </button>

          <button
            type="button"
            className={`subnav-btn ${activeSubTab === 'coefficients' ? 'subnav-active' : ''}`}
            onClick={() => setActiveSubTab('coefficients')}
            id="subtab-coefficients"
          >
            <span className="subnav-icon">⚖️</span>
            <span>Model Coefficients</span>
          </button>
        </div>
      </div>

      {/* Sub-view Panels */}
      <div className="advanced-subview-content">
        {activeSubTab === 'what-if' && (
          <WhatIfSimulator initialPatientData={currentPatientData} />
        )}

        {activeSubTab === 'sensitivity' && (
          <SensitivityAnalysis patientData={currentPatientData} />
        )}

        {activeSubTab === 'threshold' && <ThresholdAnalysis />}

        {activeSubTab === 'roc' && <RocExplorer />}

        {activeSubTab === 'confusion-matrix' && <ConfusionMatrixExplorer />}

        {activeSubTab === 'coefficients' && <CoefficientExplorer />}
      </div>
    </div>
  );
}
