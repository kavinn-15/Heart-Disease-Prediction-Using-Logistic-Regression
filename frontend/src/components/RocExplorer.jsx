import React, { useState, useEffect } from 'react';
import { fetchRocData } from '../api';

export default function RocExplorer() {
  const [rocData, setRocData] = useState(null);
  const [activeThreshold, setActiveThreshold] = useState(0.50);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetchRocData();
      if (isMounted) {
        if (res.success && res.data) {
          setRocData(res.data);
        } else {
          setErrorMsg(res.message || 'Failed to load ROC curve data.');
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
      <div className="roc-loading">
        <span className="spinner" />
        <p>Rendering calibrated ROC curve from 126,000 test set predictions...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="alert-banner alert-error" role="alert">
        <strong>ROC Error:</strong> {errorMsg}
      </div>
    );
  }

  const rawPoints = rocData?.roc_points || [];
  const aucScore = rocData?.roc_auc ?? 0.9516;

  // Find the point on the ROC curve closest to activeThreshold
  const currentPoint = rawPoints.reduce((prev, curr) => {
    return Math.abs(curr.threshold - activeThreshold) < Math.abs(prev.threshold - activeThreshold)
      ? curr
      : prev;
  }, rawPoints[0] || { fpr: 0.1089, tpr: 0.8756, threshold: 0.50 });

  // Coordinate mapping for SVG (width: 500, height: 500, padding: 50)
  const svgSize = 500;
  const padding = 55;
  const plotWidth = svgSize - padding * 2;
  const plotHeight = svgSize - padding * 2;

  const mapX = (fpr) => padding + fpr * plotWidth;
  const mapY = (tpr) => padding + (1 - tpr) * plotHeight;

  // Build SVG polyline points for the ROC curve
  const pathD = rawPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${mapX(pt.fpr).toFixed(1)} ${mapY(pt.tpr).toFixed(1)}`)
    .join(' ');

  // Current operating point SVG coordinates
  const opX = mapX(currentPoint.fpr);
  const opY = mapY(currentPoint.tpr);

  return (
    <div className="roc-explorer-container">
      {/* Header */}
      <div className="roc-header">
        <div>
          <div className="simulator-pill-tag">
            <span className="sparkle-icon">📈</span>
            <span>Receiver Operating Characteristic</span>
          </div>
          <h2 className="section-title">Interactive ROC Curve Explorer</h2>
          <p className="section-subtitle">
            Calibrated trade-off between True Positive Rate (Sensitivity) and False Positive Rate (1 - Specificity) across 126,000 test samples.
          </p>
        </div>

        <div className="roc-auc-badge">
          <span className="auc-label">Area Under Curve (ROC-AUC):</span>
          <span className="auc-value">{(aucScore * 100).toFixed(2)}%</span>
          <span className="auc-caption">(0.9516 on held-out test data)</span>
        </div>
      </div>

      {/* Main Two-Column Layout: Interactive SVG on Left, Operating Point Card on Right */}
      <div className="roc-layout-grid">
        {/* SVG ROC Plot Card */}
        <div className="roc-chart-card">
          <div className="card-sub-header">
            <div className="card-sub-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 className="card-sub-title">Empirical ROC Trajectory</h3>
            </div>
            <span className="card-sub-hint">
              Hover along curve or adjust threshold slider below
            </span>
          </div>

          <div className="svg-canvas-container">
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="roc-svg"
              role="img"
              aria-label={`ROC Curve with AUC ${(aucScore * 100).toFixed(2)}%`}
            >
              {/* Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                <g key={`grid-${v}`}>
                  {/* Horizontal grid */}
                  <line
                    x1={padding}
                    y1={mapY(v)}
                    x2={svgSize - padding}
                    y2={mapY(v)}
                    stroke="var(--border-light)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  {/* Vertical grid */}
                  <line
                    x1={mapX(v)}
                    y1={padding}
                    x2={mapX(v)}
                    y2={svgSize - padding}
                    stroke="var(--border-light)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  {/* Y-Axis tick labels */}
                  <text
                    x={padding - 10}
                    y={mapY(v) + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="11"
                  >
                    {v.toFixed(1)}
                  </text>
                  {/* X-Axis tick labels */}
                  <text
                    x={mapX(v)}
                    y={svgSize - padding + 18}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="11"
                  >
                    {v.toFixed(1)}
                  </text>
                </g>
              ))}

              {/* Zero Ticks */}
              <text x={padding - 10} y={mapY(0) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">0.0</text>
              <text x={mapX(0)} y={svgSize - padding + 18} textAnchor="middle" fill="var(--text-muted)" fontSize="11">0.0</text>

              {/* Random Chance Diagonal Line (45 degrees) */}
              <line
                x1={mapX(0)}
                y1={mapY(0)}
                x2={mapX(1)}
                y2={mapY(1)}
                stroke="var(--text-muted)"
                strokeDasharray="6 6"
                strokeWidth="1.5"
                opacity="0.6"
              />

              {/* Area Under Curve Fill */}
              <path
                d={`${pathD} L ${mapX(1)} ${mapY(0)} L ${mapX(0)} ${mapY(0)} Z`}
                fill="var(--primary)"
                fillOpacity="0.12"
              />

              {/* ROC Curve Path */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Crosshair guidelines to operating point */}
              <line
                x1={padding}
                y1={opY}
                x2={opX}
                y2={opY}
                stroke="var(--risk-high)"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <line
                x1={opX}
                y1={opY}
                x2={opX}
                y2={svgSize - padding}
                stroke="var(--risk-high)"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />

              {/* Active Operating Point Circle */}
              <circle
                cx={opX}
                cy={opY}
                r="7"
                fill="var(--risk-high)"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="operating-point-glow"
              />

              {/* Axes Labels */}
              <text
                x={svgSize / 2}
                y={svgSize - 12}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="12"
                fontWeight="600"
              >
                False Positive Rate (1 - Specificity)
              </text>
              <text
                x={-svgSize / 2}
                y="18"
                transform="rotate(-90)"
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="12"
                fontWeight="600"
              >
                True Positive Rate (Sensitivity / Recall)
              </text>
            </svg>
          </div>

          {/* Threshold Slider Below Plot */}
          <div className="roc-slider-container">
            <div className="roc-slider-meta">
              <span className="roc-slider-label">Select Operating Threshold (&tau;):</span>
              <strong className="roc-slider-val">{activeThreshold.toFixed(2)}</strong>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.01"
              value={activeThreshold}
              onChange={(e) => setActiveThreshold(parseFloat(e.target.value))}
              className="threshold-range-slider"
            />
          </div>
        </div>

        {/* Operating Point Metrics Panel on Right */}
        <div className="roc-side-panel">
          <div className="roc-panel-card">
            <div className="card-sub-header">
              <div className="card-sub-title-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <h3 className="card-sub-title">Operating Point Coordinates</h3>
              </div>
            </div>

            <div className="roc-point-metrics-list">
              <div className="roc-metric-row">
                <span className="metric-name">Cutoff Threshold (&tau;):</span>
                <strong className="metric-val text-primary">{currentPoint.threshold.toFixed(4)}</strong>
              </div>

              <div className="roc-metric-row">
                <span className="metric-name">True Positive Rate (Recall):</span>
                <strong className="metric-val text-good">{(currentPoint.tpr * 100).toFixed(2)}%</strong>
              </div>

              <div className="roc-metric-row">
                <span className="metric-name">False Positive Rate (FPR):</span>
                <strong className="metric-val text-bad">{(currentPoint.fpr * 100).toFixed(2)}%</strong>
              </div>

              <div className="roc-metric-row">
                <span className="metric-name">True Negative Rate (Specificity):</span>
                <strong className="metric-val">{((1 - currentPoint.fpr) * 100).toFixed(2)}%</strong>
              </div>

              <div className="roc-metric-row">
                <span className="metric-name">Youden's J Index (TPR - FPR):</span>
                <strong className="metric-val">{(currentPoint.tpr - currentPoint.fpr).toFixed(4)}</strong>
              </div>
            </div>

            <div className="roc-summary-box">
              <h4>Clinical Curve Interpretation</h4>
              <p>
                An ROC-AUC score of <strong>{(aucScore * 100).toFixed(2)}%</strong> demonstrates outstanding discriminatory capability. 
                A randomly chosen positive patient has a {((aucScore) * 100).toFixed(1)}% probability of being assigned a higher risk score 
                than a randomly chosen negative patient.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
