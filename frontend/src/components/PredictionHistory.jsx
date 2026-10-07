import React, { useState } from 'react';

export default function PredictionHistory({
  history = [],
  onLoadIntoForm,
  onDeleteItem,
  onClearAll,
  onSelectAssessment,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const cpLabels = { 1: 'Typical Angina', 2: 'Atypical Angina', 3: 'Non-Anginal', 4: 'Asymptomatic' };
  const thalLabels = { 3: 'Normal Blood Flow', 6: 'Fixed Defect', 7: 'Reversible Defect' };

  if (history.length === 0) {
    return (
      <div className="history-empty-state">
        <div className="history-empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="empty-title">No Assessment History Yet</h3>
        <p className="empty-desc">
          Past patient risk evaluations will be automatically saved here in your browser session for quick review, reloading, and comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="prediction-history-container">
      <div className="history-header-row">
        <div>
          <h2 className="section-title">Prediction History</h2>
          <p className="section-subtitle">
            {history.length} assessment{history.length === 1 ? '' : 's'} recorded locally in this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="btn-danger-outline"
          title="Clear all stored assessments"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Clear All History
        </button>
      </div>

      <div className="history-list">
        {history.map((item) => {
          const isQuick = item.predictionType === 'Quick Risk Check' || (!item.formData?.cp && (item.formData?.bp !== undefined || item.formData?.max_hr !== undefined));
          const prob = item.probability ?? 0;
          const isHigh = prob >= 70;
          const isMod = prob >= 30 && prob < 70;
          const badgeClass = isHigh ? 'status-danger' : isMod ? 'status-warning' : 'status-healthy';
          const isExpanded = expandedId === item.id;

          const dateFormatted = new Date(item.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <div key={item.id} className={`history-card ${isExpanded ? 'is-expanded' : ''}`}>
              <div className="history-card-main" onClick={() => toggleExpand(item.id)}>
                <div className="history-card-left">
                  <div className="history-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="18" y2="10" />
                    </svg>
                    <span>{dateFormatted}</span>
                    <span className={`type-tag-pill ${isQuick ? 'pill-quick' : 'pill-detailed'}`}>
                      {isQuick ? 'Quick Risk Check' : 'Detailed Assessment'}
                    </span>
                  </div>

                  <div className="history-patient-quick">
                    <span>Age: <strong>{item.formData?.age ?? '—'}</strong></span>
                    <span>•</span>
                    <span>Sex: <strong>{item.formData?.sex == 1 ? 'Male' : 'Female'}</strong></span>
                    <span>•</span>
                    <span>BP: <strong>{isQuick ? (item.formData?.bp ?? '—') : (item.formData?.trestbps ?? '—')}</strong></span>
                    <span>•</span>
                    <span>{isQuick ? `Max HR: ${item.formData?.max_hr ?? '—'}` : `Chol: ${item.formData?.chol ?? '—'}`}</span>
                  </div>
                </div>

                <div className="history-card-right">
                  <div className="history-prob-badge">
                    <span className="history-prob-val">{prob.toFixed(1)}%</span>
                    <span className={`status-pill ${badgeClass}`}>
                      {item.riskLevel || (isHigh ? 'High Risk' : isMod ? 'Moderate Risk' : 'Low Risk')}
                    </span>
                  </div>

                  <div className="history-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-action-sm btn-load"
                      title="Load these parameters back into the input form"
                      onClick={() => onLoadIntoForm(item.formData, isQuick ? 'quick' : 'detailed')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Load into Form
                    </button>

                    <button
                      type="button"
                      className="btn-action-sm btn-view"
                      title="View complete analysis results"
                      onClick={() => onSelectAssessment(item)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Result
                    </button>

                    <button
                      type="button"
                      className="btn-icon-danger"
                      title="Delete this record"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Parameters Drawer */}
              {isExpanded && (
                <div className="history-drawer">
                  {isQuick ? (
                    <>
                      <h4 className="drawer-title">Quick Risk Check Inputs (4 Measurements):</h4>
                      <div className="drawer-grid">
                        <div><span>Age:</span> <strong>{item.formData?.age} yrs</strong></div>
                        <div><span>Gender:</span> <strong>{item.formData?.sex == 1 ? 'Male' : 'Female'}</strong></div>
                        <div><span>Blood Pressure (BP):</span> <strong>{item.formData?.bp} mm Hg</strong></div>
                        <div><span>Heart Rate (Max HR):</span> <strong>{item.formData?.max_hr} bpm</strong></div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span>Pipeline:</span> <strong>Dedicated StandardScaler + Quick Logistic Regression</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="drawer-title">All 13 Clinical Inputs:</h4>
                      <div className="drawer-grid">
                        <div><span>Age:</span> <strong>{item.formData?.age} yrs</strong></div>
                        <div><span>Sex:</span> <strong>{item.formData?.sex == 1 ? 'Male' : 'Female'}</strong></div>
                        <div><span>Chest Pain:</span> <strong>{item.formData?.cp} ({cpLabels[item.formData?.cp] || ''})</strong></div>
                        <div><span>Resting BP:</span> <strong>{item.formData?.trestbps} mm Hg</strong></div>
                        <div><span>Cholesterol:</span> <strong>{item.formData?.chol} mg/dl</strong></div>
                        <div><span>FBS &gt; 120:</span> <strong>{item.formData?.fbs == 1 ? 'True' : 'False'}</strong></div>
                        <div><span>Resting ECG:</span> <strong>{item.formData?.restecg}</strong></div>
                        <div><span>Max HR:</span> <strong>{item.formData?.thalach} bpm</strong></div>
                        <div><span>Exercise Angina:</span> <strong>{item.formData?.exang == 1 ? 'Yes' : 'No'}</strong></div>
                        <div><span>ST Depression:</span> <strong>{Number(item.formData?.oldpeak).toFixed(1)} mm</strong></div>
                        <div><span>ST Slope:</span> <strong>{item.formData?.slope}</strong></div>
                        <div><span>Major Vessels:</span> <strong>{item.formData?.ca}</strong></div>
                        <div><span>Thalassemia:</span> <strong>{item.formData?.thal} ({thalLabels[item.formData?.thal] || ''})</strong></div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
