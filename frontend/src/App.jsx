import React, { useState, useEffect } from 'react';
import PatientForm from './components/PatientForm';
import PredictionResult from './components/PredictionResult';
import QuickPatientForm from './components/QuickPatientForm';
import QuickPredictionResult from './components/QuickPredictionResult';
import PredictionHistory from './components/PredictionHistory';
import ModelPerformance from './components/ModelPerformance';
import AdvancedAnalysisDashboard from './components/AdvancedAnalysisDashboard';
import { checkHealth, predictHeartDisease, predictQuickHeartDisease } from './api';
import './styles/App.css';

const HISTORY_STORAGE_KEY = 'cardio_prediction_history_v2';
const THEME_STORAGE_KEY = 'cardio_theme_preference_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState('assessment'); // 'assessment' | 'history' | 'performance' | 'advanced'
  const [assessmentMode, setAssessmentMode] = useState('detailed'); // 'detailed' | 'quick'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  });

  const [backendHealth, setBackendHealth] = useState({ checked: false, isOnline: false });
  const [predictionResult, setPredictionResult] = useState(null);
  const [lastSubmittedFormData, setLastSubmittedFormData] = useState(null);
  const [formInitialValues, setFormInitialValues] = useState(null);
  const [quickFormInitialValues, setQuickFormInitialValues] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [serverFieldErrors, setServerFieldErrors] = useState({});

  // Prediction History loaded from localStorage
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Check backend server status on mount
  useEffect(() => {
    let isMounted = true;
    const verifyBackend = async () => {
      const res = await checkHealth();
      if (isMounted) {
        setBackendHealth({
          checked: true,
          isOnline: res.success && Boolean(res.data?.models_loaded),
        });
      }
    };
    verifyBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save history item with clear predictionType identification
  const saveToHistory = (formData, resData, predictionType = 'Detailed Assessment') => {
    const isQuick = predictionType === 'Quick Risk Check';
    const prob = isQuick
      ? (typeof resData.percentage === 'number' ? resData.percentage : ((resData.probability ?? 0) * 100))
      : (resData?.logistic_regression?.probability ?? 0);
    const riskLevel = isQuick
      ? (resData.risk_level || 'Moderate Risk')
      : (resData?.logistic_regression?.risk_level || 'Moderate Risk');

    const newItem = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      predictionType,
      formData: { ...formData },
      probability: prob,
      riskLevel,
      prediction: isQuick ? resData.prediction : (resData?.logistic_regression?.prediction ?? 0),
      result: resData,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save assessment history to localStorage:', err);
      }
      return updated;
    });
  };

  // 13-Feature Detailed Prediction
  const handlePredict = async (payload) => {
    setIsLoading(true);
    setErrorMessage(null);
    setServerFieldErrors({});

    const result = await predictHeartDisease(payload);
    setIsLoading(false);

    if (result.success) {
      setPredictionResult(result.data);
      setLastSubmittedFormData(payload);
      saveToHistory(payload, result.data, 'Detailed Assessment');

      // Smooth scroll to results
      setTimeout(() => {
        const el = document.getElementById('prediction-result-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors) {
        setServerFieldErrors(result.fieldErrors);
      }
    }
  };

  // 4-Feature Quick Risk Prediction
  const handleQuickPredict = async (payload) => {
    setIsLoading(true);
    setErrorMessage(null);
    setServerFieldErrors({});

    const result = await predictQuickHeartDisease(payload);
    setIsLoading(false);

    if (result.success) {
      setPredictionResult(result.data);
      setLastSubmittedFormData(payload);
      saveToHistory(payload, result.data, 'Quick Risk Check');

      // Smooth scroll to quick results
      setTimeout(() => {
        const el = document.getElementById('quick-prediction-result-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      setErrorMessage(result.message);
      if (result.fieldErrors) {
        setServerFieldErrors(result.fieldErrors);
      }
    }
  };

  const handleReset = () => {
    setPredictionResult(null);
    setLastSubmittedFormData(null);
    setErrorMessage(null);
    setServerFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Seamless transition from Quick Check to Detailed Assessment
  const handleSwitchToDetailed = (quickData) => {
    setFormInitialValues({
      age: quickData?.age || 52,
      sex: Number(quickData?.sex ?? 1),
      trestbps: quickData?.bp || 130,
      thalach: quickData?.max_hr || 150,
      cp: 4,
      chol: 240,
      fbs: 0,
      restecg: 0,
      exang: 0,
      oldpeak: 1.0,
      slope: 2,
      ca: 0,
      thal: 3,
    });
    setAssessmentMode('detailed');
    setPredictionResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Actions for Prediction History
  const handleLoadHistoryIntoForm = (formData, mode = 'detailed') => {
    if (mode === 'quick' || (!formData?.cp && (formData?.bp !== undefined || formData?.max_hr !== undefined))) {
      setAssessmentMode('quick');
      setQuickFormInitialValues(formData);
    } else {
      setAssessmentMode('detailed');
      setFormInitialValues(formData);
    }
    setActiveTab('assessment');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleSelectHistoryAssessment = (item) => {
    const isQuick = item.predictionType === 'Quick Risk Check' || (!item.formData?.cp && (item.formData?.bp !== undefined || item.formData?.max_hr !== undefined));
    setAssessmentMode(isQuick ? 'quick' : 'detailed');
    setPredictionResult(item.result);
    setLastSubmittedFormData(item.formData);
    setActiveTab('assessment');
    setTimeout(() => {
      const targetId = isQuick ? 'quick-prediction-result-section' : 'prediction-result-section';
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteHistoryItem = (id) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to delete all stored assessment records?')) {
      setHistory([]);
      try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="app-wrapper">
      {/* Navigation Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand" onClick={() => setActiveTab('assessment')} role="button" tabIndex={0}>
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <h1 className="brand-title">CardioPredict ML</h1>
              <span className="brand-tag">Dual-Engine L2 Logistic Regression • V2.1</span>
            </div>
          </div>

          <div className="header-controls">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              id="theme-toggle-btn"
            >
              {theme === 'light' ? (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="theme-toggle-text">Dark</span>
                </>
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span className="theme-toggle-text">Light</span>
                </>
              )}
            </button>

            {/* API Health Status Badge */}
            <div className="header-badge" title="API Connectivity Status">
              <span className={`status-dot ${backendHealth.checked && !backendHealth.isOnline ? 'dot-error' : ''}`} />
              <span>
                {backendHealth.checked
                  ? backendHealth.isOnline
                    ? 'Dual Models Online'
                    : 'Backend Disconnected'
                  : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="header-nav-tabs">
          <div className="nav-tabs-container">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'assessment' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('assessment')}
              id="tab-new-assessment"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Patient Assessment</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('history')}
              id="tab-history"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Prediction History</span>
              {history.length > 0 && <span className="tab-counter-badge">{history.length}</span>}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'performance' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('performance')}
              id="tab-performance"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Model Performance</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'advanced' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('advanced')}
              id="tab-advanced-analysis"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Advanced ML Analysis</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Dashboard */}
      <main className="main-content">
        {/* Tab 1: Patient Assessment View */}
        {activeTab === 'assessment' && (
          <>
            {/* Hero Section */}
            <section className="hero-section">
              <h2 className="hero-title">Cardiovascular Disease Risk Prediction</h2>
              <p className="hero-subtitle">
                Select your preferred assessment mode below to evaluate heart disease risk using our calibrated L2 Logistic Regression models.
              </p>
            </section>

            {/* Prediction Mode Selector Cards */}
            <section className="assessment-mode-selector">
              <div className="mode-selector-heading">
                <span className="mode-badge">SELECT PREDICTION MODE</span>
                <h3 className="mode-title">How would you like to assess risk?</h3>
                <p className="mode-desc">
                  Choose between our accessible 4-measurement preliminary check or our comprehensive 13-parameter clinical evaluation.
                </p>
              </div>

              <div className="mode-cards-grid">
                {/* Option 1: Detailed Assessment */}
                <div
                  className={`mode-card ${assessmentMode === 'detailed' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setAssessmentMode('detailed');
                    setPredictionResult(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mode-card-badge">CLINICAL PRECISION</div>
                  <h4 className="mode-card-title">DETAILED ASSESSMENT</h4>
                  <div className="mode-card-feature">13 clinical parameters</div>
                  <p className="mode-card-desc">
                    More detailed model-based assessment including ECG, fluoroscopy vessels, chest pain classification, and ST segment analysis.
                  </p>
                  <button
                    type="button"
                    className={`btn-mode-select ${assessmentMode === 'detailed' ? 'btn-mode-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssessmentMode('detailed');
                      setPredictionResult(null);
                    }}
                    id="btn-start-detailed"
                  >
                    {assessmentMode === 'detailed' ? 'Selected: Detailed Assessment' : 'Start Detailed Assessment'}
                  </button>
                </div>

                {/* Option 2: Quick Risk Check */}
                <div
                  className={`mode-card ${assessmentMode === 'quick' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setAssessmentMode('quick');
                    setPredictionResult(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mode-card-badge mode-badge-quick">FAST &amp; ACCESSIBLE</div>
                  <h4 className="mode-card-title">QUICK RISK CHECK</h4>
                  <div className="mode-card-feature">4 basic measurements</div>
                  <p className="mode-card-desc">
                    Simple and accessible assessment using only Age, Gender, Blood Pressure (BP), and Heart Rate (Max HR). Ideal when full lab tests are unavailable.
                  </p>
                  <button
                    type="button"
                    className={`btn-mode-select ${assessmentMode === 'quick' ? 'btn-mode-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssessmentMode('quick');
                      setPredictionResult(null);
                    }}
                    id="btn-start-quick"
                  >
                    {assessmentMode === 'quick' ? 'Selected: Quick Risk Check' : 'Start Quick Risk Check'}
                  </button>
                </div>
              </div>
            </section>

            {/* Global API Error Alert */}
            {errorMessage && (
              <div className="alert-banner alert-error" role="alert">
                <div className="alert-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <strong>Action Required:</strong> {errorMessage}
                </div>
              </div>
            )}

            {/* Mode 1: Detailed 13-Input Form */}
            {assessmentMode === 'detailed' && (
              <>
                <PatientForm
                  onSubmit={handlePredict}
                  isLoading={isLoading}
                  serverErrors={serverFieldErrors}
                  initialValues={formInitialValues}
                />

                {predictionResult && predictionResult.logistic_regression && (
                  <PredictionResult
                    result={predictionResult}
                    formData={lastSubmittedFormData}
                    onReset={handleReset}
                    onLaunchWhatIf={(patientData) => {
                      setLastSubmittedFormData(patientData);
                      setActiveTab('advanced');
                    }}
                  />
                )}
              </>
            )}

            {/* Mode 2: Quick 4-Input Form */}
            {assessmentMode === 'quick' && (
              <>
                <QuickPatientForm
                  onSubmit={handleQuickPredict}
                  isLoading={isLoading}
                  serverErrors={serverFieldErrors}
                  initialValues={quickFormInitialValues}
                />

                {predictionResult && (predictionResult.model === 'Quick Logistic Regression' || predictionResult.contributing_factors) && (
                  <QuickPredictionResult
                    result={predictionResult}
                    formData={lastSubmittedFormData}
                    onReset={handleReset}
                    onSwitchToDetailed={handleSwitchToDetailed}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Tab 2: Prediction History View */}
        {activeTab === 'history' && (
          <PredictionHistory
            history={history}
            onLoadIntoForm={handleLoadHistoryIntoForm}
            onSelectAssessment={handleSelectHistoryAssessment}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
          />
        )}

        {/* Tab 3: Model Performance View */}
        {activeTab === 'performance' && <ModelPerformance />}

        {/* Tab 4: Advanced ML Analysis View (Phase 2) */}
        {activeTab === 'advanced' && (
          <AdvancedAnalysisDashboard currentPatientData={lastSubmittedFormData} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          <strong>CardioPredict ML • Version 2.1</strong> &bull; Dual-Engine Heart Disease Risk Assessment
        </p>
        <p className="footer-disclaimer">
          Academic and educational demonstration project. All probabilities and risk bands are statistical model outputs (L2 Logistic Regression on UCI Heart Disease dataset) and do NOT constitute a clinical diagnosis or medical recommendation.
        </p>
      </footer>
    </div>
  );
}
