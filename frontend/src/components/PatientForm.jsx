import React, { useState, useEffect } from 'react';

// Preset patient profiles matching canonical dataset encodings (cp: 1-4, thal: 3, 6, 7, slope: 1-3)
const PRESETS = {
  lowRisk: {
    age: 38,
    sex: 0,
    cp: 1, // Typical angina / low risk
    trestbps: 115,
    chol: 175,
    fbs: 0,
    restecg: 0,
    thalach: 172,
    exang: 0,
    oldpeak: 0.0,
    slope: 1, // Upsloping
    ca: 0,
    thal: 3, // Normal blood flow
  },
  highRisk: {
    age: 62,
    sex: 1,
    cp: 4, // Asymptomatic / highest cardiac risk
    trestbps: 155,
    chol: 290,
    fbs: 1,
    restecg: 2, // LV hypertrophy
    thalach: 120,
    exang: 1,
    oldpeak: 2.8,
    slope: 2, // Flat
    ca: 2,
    thal: 7, // Reversible defect
  },
};

const INITIAL_FORM = {
  age: '',
  sex: '1',
  cp: '1',
  trestbps: '',
  chol: '',
  fbs: '0',
  restecg: '0',
  thalach: '',
  exang: '0',
  oldpeak: '',
  slope: '1',
  ca: '0',
  thal: '3',
};

// Tooltip dictionary with documented clinical definitions
const TOOLTIPS = {
  age: 'Patient chronological age in years (valid range: 18 to 120).',
  sex: 'Biological sex at birth (Male: 1, Female: 0).',
  cp: 'Chest Pain Type: 1 = Typical angina, 2 = Atypical angina, 3 = Non-anginal, 4 = Asymptomatic (silent ischemia).',
  trestbps: 'Resting arterial blood pressure measured in mm Hg upon hospital admission.',
  chol: 'Serum total cholesterol in mg/dl. Clinically, ≥240 mg/dl is considered high risk.',
  fbs: 'Fasting blood sugar > 120 mg/dl indicator (0 = Normal ≤ 120, 1 = Elevated > 120).',
  restecg: 'Resting electrocardiographic results: 0 = Normal, 1 = ST-T wave abnormality, 2 = LV hypertrophy.',
  thalach: 'Maximum peak heart rate achieved during physical treadmill exercise stress testing (bpm).',
  exang: 'Exercise-induced angina: Indicates whether physical exertion produced ischemic chest pain.',
  oldpeak: 'ST depression induced by exercise relative to resting baseline ECG (measured in mm).',
  slope: 'Slope of peak exercise ST segment: 1 = Upsloping, 2 = Flat (elevated risk), 3 = Downsloping.',
  ca: 'Number of major coronary blood vessels (0–3) colored and visualized during fluoroscopy.',
  thal: 'Thallium scintigraphy stress test: 3 = Normal perfusion, 6 = Fixed defect, 7 = Reversible defect.',
};

export default function PatientForm({
  onSubmit,
  isLoading,
  serverErrors = {},
  initialValues = null,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [clientErrors, setClientErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);

  // If initialValues are passed (e.g., loaded from history), populate form
  useEffect(() => {
    if (initialValues) {
      setFormData({
        age: String(initialValues.age ?? ''),
        sex: String(initialValues.sex ?? '1'),
        cp: String(initialValues.cp ?? '1'),
        trestbps: String(initialValues.trestbps ?? ''),
        chol: String(initialValues.chol ?? ''),
        fbs: String(initialValues.fbs ?? '0'),
        restecg: String(initialValues.restecg ?? '0'),
        thalach: String(initialValues.thalach ?? ''),
        exang: String(initialValues.exang ?? '0'),
        oldpeak: String(initialValues.oldpeak ?? ''),
        slope: String(initialValues.slope ?? '1'),
        ca: String(initialValues.ca ?? '0'),
        thal: String(initialValues.thal ?? '3'),
      });
      const allTouched = Object.keys(INITIAL_FORM).reduce((acc, k) => ({ ...acc, [k]: true }), {});
      setTouched(allTouched);
    }
  }, [initialValues]);

  // Validate form client-side
  const validate = (data) => {
    const errors = {};

    // Age
    if (!data.age && data.age !== 0) {
      errors.age = 'Age is required (18–120)';
    } else {
      const ageNum = Number(data.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        errors.age = 'Age must be between 18 and 120 years';
      }
    }

    // Trestbps (Resting BP)
    if (!data.trestbps && data.trestbps !== 0) {
      errors.trestbps = 'Resting Blood Pressure is required';
    } else {
      const bpNum = Number(data.trestbps);
      if (isNaN(bpNum) || bpNum < 50 || bpNum > 260) {
        errors.trestbps = 'Blood Pressure must be between 50 and 260 mm Hg';
      }
    }

    // Chol (Cholesterol)
    if (!data.chol && data.chol !== 0) {
      errors.chol = 'Cholesterol is required';
    } else {
      const cholNum = Number(data.chol);
      if (isNaN(cholNum) || cholNum < 80 || cholNum > 650) {
        errors.chol = 'Cholesterol must be between 80 and 650 mg/dl';
      }
    }

    // Thalach (Max Heart Rate)
    if (!data.thalach && data.thalach !== 0) {
      errors.thalach = 'Maximum Heart Rate is required';
    } else {
      const hrNum = Number(data.thalach);
      if (isNaN(hrNum) || hrNum < 50 || hrNum > 250) {
        errors.thalach = 'Max HR must be between 50 and 250 bpm';
      }
    }

    // Oldpeak (ST depression)
    if (!data.oldpeak && data.oldpeak !== 0 && data.oldpeak !== '0') {
      errors.oldpeak = 'ST Depression is required';
    } else {
      const opNum = Number(data.oldpeak);
      if (isNaN(opNum) || opNum < 0 || opNum > 10.0) {
        errors.oldpeak = 'ST Depression must be between 0.0 and 10.0 mm';
      }
    }

    return errors;
  };

  useEffect(() => {
    const errs = validate(formData);
    setClientErrors(errs);
  }, [formData]);

  // Calculate 13-step completion count & percentage
  const totalFields = 13;
  const completedFields = Object.keys(INITIAL_FORM).filter((k) => {
    const val = formData[k];
    return val !== '' && val !== null && val !== undefined && !clientErrors[k];
  }).length;
  const progressPercent = Math.round((completedFields / totalFields) * 100);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const loadPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setFormData({
        age: String(preset.age),
        sex: String(preset.sex),
        cp: String(preset.cp),
        trestbps: String(preset.trestbps),
        chol: String(preset.chol),
        fbs: String(preset.fbs),
        restecg: String(preset.restecg),
        thalach: String(preset.thalach),
        exang: String(preset.exang),
        oldpeak: String(preset.oldpeak),
        slope: String(preset.slope),
        ca: String(preset.ca),
        thal: String(preset.thal),
      });
      const allTouched = Object.keys(INITIAL_FORM).reduce((acc, k) => ({ ...acc, [k]: true }), {});
      setTouched(allTouched);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allTouched = Object.keys(INITIAL_FORM).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);

    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      return;
    }

    // Format numbers for API payload
    const payload = {
      age: Number(formData.age),
      sex: Number(formData.sex),
      cp: Number(formData.cp),
      trestbps: Number(formData.trestbps),
      chol: Number(formData.chol),
      fbs: Number(formData.fbs),
      restecg: Number(formData.restecg),
      thalach: Number(formData.thalach),
      exang: Number(formData.exang),
      oldpeak: Number(formData.oldpeak),
      slope: Number(formData.slope),
      ca: Number(formData.ca),
      thal: Number(formData.thal),
    };

    onSubmit(payload);
  };

  const isFormValid = Object.keys(clientErrors).length === 0;

  // Helper to get active error for a field
  const getFieldError = (field) => {
    return serverErrors[field] || (touched[field] ? clientErrors[field] : null);
  };

  const renderTooltipBtn = (field) => (
    <span
      className="tooltip-anchor"
      onMouseEnter={() => setActiveTooltip(field)}
      onMouseLeave={() => setActiveTooltip(null)}
      onClick={() => setActiveTooltip((prev) => (prev === field ? null : field))}
      title="Click for clinical explanation"
      role="button"
      tabIndex={0}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {activeTooltip === field && (
        <span className="tooltip-bubble" role="tooltip">
          {TOOLTIPS[field]}
        </span>
      )}
    </span>
  );

  return (
    <form className="patient-form-container" onSubmit={handleSubmit} noValidate>
      {/* Form Header */}
      <div className="form-header-row">
        <div>
          <h2 className="section-title">Patient Clinical Parameters</h2>
          <p className="section-subtitle">
            Input the 13 clinical biomarkers from the standard UCI Heart Disease protocol.
          </p>
        </div>

        {/* Quick presets */}
        <div className="preset-buttons">
          <span className="preset-label">Quick Samples:</span>
          <button
            type="button"
            className="btn-chip chip-low"
            onClick={() => loadPreset('lowRisk')}
            title="Load healthy baseline patient profile"
          >
            Sample: Low Risk
          </button>
          <button
            type="button"
            className="btn-chip chip-high"
            onClick={() => loadPreset('highRisk')}
            title="Load elevated cardiac risk patient profile"
          >
            Sample: High Risk
          </button>
        </div>
      </div>

      {/* 13-Step Input Progress Indicator */}
      <div className="form-progress-box">
        <div className="progress-info-row">
          <span className="progress-label">Input Completion Progress</span>
          <span className="progress-count">
            <strong>{completedFields}</strong> of {totalFields} fields completed ({progressPercent}%)
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className={`progress-bar-fill ${completedFields === totalFields ? 'fill-complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="form-grid">
        {/* 1. Age */}
        <div className={`form-group ${getFieldError('age') ? 'has-error' : ''}`}>
          <label htmlFor="input-age" className="form-label">
            <span>1. Age <span className="field-unit">(years)</span></span>
            {renderTooltipBtn('age')}
          </label>
          <input
            type="number"
            id="input-age"
            name="age"
            min="18"
            max="120"
            step="1"
            placeholder="e.g. 54"
            className="form-input"
            value={formData.age}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {getFieldError('age') && <span className="field-error-msg">{getFieldError('age')}</span>}
        </div>

        {/* 2. Biological Sex */}
        <div className={`form-group ${getFieldError('sex') ? 'has-error' : ''}`}>
          <label htmlFor="select-sex" className="form-label">
            <span>2. Biological Sex</span>
            {renderTooltipBtn('sex')}
          </label>
          <select
            id="select-sex"
            name="sex"
            className="form-select"
            value={formData.sex}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="1">Male</option>
            <option value="0">Female</option>
          </select>
          {getFieldError('sex') && <span className="field-error-msg">{getFieldError('sex')}</span>}
        </div>

        {/* 3. Chest Pain Type (cp: 1-4) */}
        <div className={`form-group ${getFieldError('cp') ? 'has-error' : ''}`}>
          <label htmlFor="select-cp" className="form-label">
            <span>3. Chest Pain Type <span className="field-unit">(CP)</span></span>
            {renderTooltipBtn('cp')}
          </label>
          <select
            id="select-cp"
            name="cp"
            className="form-select"
            value={formData.cp}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="1">1: Typical Angina</option>
            <option value="2">2: Atypical Angina</option>
            <option value="3">3: Non-Anginal Pain</option>
            <option value="4">4: Asymptomatic</option>
          </select>
          {getFieldError('cp') && <span className="field-error-msg">{getFieldError('cp')}</span>}
        </div>

        {/* 4. Resting Blood Pressure (trestbps) */}
        <div className={`form-group ${getFieldError('trestbps') ? 'has-error' : ''}`}>
          <label htmlFor="input-trestbps" className="form-label">
            <span>4. Resting Blood Pressure <span className="field-unit">(mm Hg)</span></span>
            {renderTooltipBtn('trestbps')}
          </label>
          <input
            type="number"
            id="input-trestbps"
            name="trestbps"
            min="50"
            max="260"
            step="1"
            placeholder="e.g. 130"
            className="form-input"
            value={formData.trestbps}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {getFieldError('trestbps') && <span className="field-error-msg">{getFieldError('trestbps')}</span>}
        </div>

        {/* 5. Serum Cholesterol (chol) */}
        <div className={`form-group ${getFieldError('chol') ? 'has-error' : ''}`}>
          <label htmlFor="input-chol" className="form-label">
            <span>5. Serum Cholesterol <span className="field-unit">(mg/dl)</span></span>
            {renderTooltipBtn('chol')}
          </label>
          <input
            type="number"
            id="input-chol"
            name="chol"
            min="80"
            max="650"
            step="1"
            placeholder="e.g. 240"
            className="form-input"
            value={formData.chol}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {getFieldError('chol') && <span className="field-error-msg">{getFieldError('chol')}</span>}
        </div>

        {/* 6. Fasting Blood Sugar (fbs) */}
        <div className={`form-group ${getFieldError('fbs') ? 'has-error' : ''}`}>
          <label htmlFor="select-fbs" className="form-label">
            <span>6. Fasting Blood Sugar &gt; 120</span>
            {renderTooltipBtn('fbs')}
          </label>
          <select
            id="select-fbs"
            name="fbs"
            className="form-select"
            value={formData.fbs}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="0">False: ≤ 120 mg/dl (0)</option>
            <option value="1">True: &gt; 120 mg/dl (1)</option>
          </select>
          {getFieldError('fbs') && <span className="field-error-msg">{getFieldError('fbs')}</span>}
        </div>

        {/* 7. Resting ECG (restecg) */}
        <div className={`form-group ${getFieldError('restecg') ? 'has-error' : ''}`}>
          <label htmlFor="select-restecg" className="form-label">
            <span>7. Resting ECG Results</span>
            {renderTooltipBtn('restecg')}
          </label>
          <select
            id="select-restecg"
            name="restecg"
            className="form-select"
            value={formData.restecg}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="0">0: Normal</option>
            <option value="1">1: ST-T Wave Abnormality</option>
            <option value="2">2: Left Ventricular Hypertrophy</option>
          </select>
          {getFieldError('restecg') && <span className="field-error-msg">{getFieldError('restecg')}</span>}
        </div>

        {/* 8. Maximum Heart Rate (thalach) */}
        <div className={`form-group ${getFieldError('thalach') ? 'has-error' : ''}`}>
          <label htmlFor="input-thalach" className="form-label">
            <span>8. Maximum Heart Rate <span className="field-unit">(bpm)</span></span>
            {renderTooltipBtn('thalach')}
          </label>
          <input
            type="number"
            id="input-thalach"
            name="thalach"
            min="50"
            max="250"
            step="1"
            placeholder="e.g. 150"
            className="form-input"
            value={formData.thalach}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {getFieldError('thalach') && <span className="field-error-msg">{getFieldError('thalach')}</span>}
        </div>

        {/* 9. Exercise-Induced Angina (exang) */}
        <div className={`form-group ${getFieldError('exang') ? 'has-error' : ''}`}>
          <label htmlFor="select-exang" className="form-label">
            <span>9. Exercise Induced Angina</span>
            {renderTooltipBtn('exang')}
          </label>
          <select
            id="select-exang"
            name="exang"
            className="form-select"
            value={formData.exang}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="0">0: No (Absent)</option>
            <option value="1">1: Yes (Present)</option>
          </select>
          {getFieldError('exang') && <span className="field-error-msg">{getFieldError('exang')}</span>}
        </div>

        {/* 10. ST Depression (oldpeak) */}
        <div className={`form-group ${getFieldError('oldpeak') ? 'has-error' : ''}`}>
          <label htmlFor="input-oldpeak" className="form-label">
            <span>10. ST Depression <span className="field-unit">(oldpeak mm)</span></span>
            {renderTooltipBtn('oldpeak')}
          </label>
          <input
            type="number"
            id="input-oldpeak"
            name="oldpeak"
            min="0"
            max="10"
            step="0.1"
            placeholder="e.g. 1.4"
            className="form-input"
            value={formData.oldpeak}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {getFieldError('oldpeak') && <span className="field-error-msg">{getFieldError('oldpeak')}</span>}
        </div>

        {/* 11. Slope of Peak ST (slope: 1-3) */}
        <div className={`form-group ${getFieldError('slope') ? 'has-error' : ''}`}>
          <label htmlFor="select-slope" className="form-label">
            <span>11. Slope of Peak Exercise ST</span>
            {renderTooltipBtn('slope')}
          </label>
          <select
            id="select-slope"
            name="slope"
            className="form-select"
            value={formData.slope}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="1">1: Upsloping</option>
            <option value="2">2: Flat</option>
            <option value="3">3: Downsloping</option>
          </select>
          {getFieldError('slope') && <span className="field-error-msg">{getFieldError('slope')}</span>}
        </div>

        {/* 12. Number of Major Vessels (ca: 0-3) */}
        <div className={`form-group ${getFieldError('ca') ? 'has-error' : ''}`}>
          <label htmlFor="select-ca" className="form-label">
            <span>12. Major Vessels Fluoroscopy <span className="field-unit">(CA)</span></span>
            {renderTooltipBtn('ca')}
          </label>
          <select
            id="select-ca"
            name="ca"
            className="form-select"
            value={formData.ca}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="0">0 Vessels Colored</option>
            <option value="1">1 Vessel Colored</option>
            <option value="2">2 Vessels Colored</option>
            <option value="3">3 Vessels Colored</option>
          </select>
          {getFieldError('ca') && <span className="field-error-msg">{getFieldError('ca')}</span>}
        </div>

        {/* 13. Thalassemia (thal: 3, 6, 7) */}
        <div className={`form-group ${getFieldError('thal') ? 'has-error' : ''}`}>
          <label htmlFor="select-thal" className="form-label">
            <span>13. Thalassemia Status <span className="field-unit">(Thal)</span></span>
            {renderTooltipBtn('thal')}
          </label>
          <select
            id="select-thal"
            name="thal"
            className="form-select"
            value={formData.thal}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="3">3: Normal Blood Flow</option>
            <option value="6">6: Fixed Defect</option>
            <option value="7">7: Reversible Defect</option>
          </select>
          {getFieldError('thal') && <span className="field-error-msg">{getFieldError('thal')}</span>}
        </div>
      </div>

      {/* Submit Action */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary btn-submit"
          disabled={!isFormValid || isLoading}
          id="btn-predict-submit"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              <span>Analyzing Clinical Parameters...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span>Calculate Risk Prediction</span>
            </>
          )}
        </button>

        {!isFormValid && (
          <span className="form-validation-hint">
            * Please resolve highlighted field requirements ({completedFields}/13 completed).
          </span>
        )}
      </div>
    </form>
  );
}
