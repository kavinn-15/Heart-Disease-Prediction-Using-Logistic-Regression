import React from 'react';

/**
 * Animated risk progress meter displaying probability in color bands:
 * 0-30% Low (Green) | 30-70% Moderate (Amber) | 70-100% High (Red)
 */
export default function RiskBar({ probability = 0 }) {
  // Clamp between 0 and 100
  const clampedProb = Math.min(Math.max(Number(probability) || 0, 0), 100);

  let bandLabel = 'Low Risk Band';
  let bandClass = 'band-low';
  let badgeColor = '#10b981';

  if (clampedProb >= 70) {
    bandLabel = 'High Risk Band';
    bandClass = 'band-high';
    badgeColor = '#ef4444';
  } else if (clampedProb >= 30) {
    bandLabel = 'Moderate Risk Band';
    bandClass = 'band-moderate';
    badgeColor = '#f59e0b';
  }

  return (
    <div className="risk-bar-container">
      <div className="risk-bar-header">
        <span className="risk-bar-label">Predicted Probability</span>
        <span className={`risk-band-badge ${bandClass}`}>
          {bandLabel} ({clampedProb.toFixed(1)}%)
        </span>
      </div>

      <div className="risk-bar-track">
        <div
          className={`risk-bar-fill ${bandClass}`}
          style={{ width: `${clampedProb}%` }}
          role="progressbar"
          aria-valuenow={clampedProb}
          aria-valuemin="0"
          aria-valuemax="100"
        />
        {/* Visual threshold tick markers */}
        <div className="risk-tick tick-30" title="30% Presentational Boundary" />
        <div className="risk-tick tick-70" title="70% Presentational Boundary" />
      </div>

      <div className="risk-bar-legend">
        <span>0% (Low)</span>
        <span>30%</span>
        <span>70%</span>
        <span>100% (High)</span>
      </div>

      <p className="risk-band-note">
        * Note: Color bands (0–30% Low, 30–70% Moderate, 70–100% High) are presentational visual aids and do not represent validated clinical thresholds.
      </p>
    </div>
  );
}
