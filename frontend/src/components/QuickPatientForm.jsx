import React, { useState, useEffect } from 'react';

// Observed dataset ranges from UCI Heart dataset:
// Age: 29 - 77 (supported range: 18 - 120)
// BP: 94 - 200 mm Hg (supported range: 50 - 260)
// Max HR: 71 - 202 bpm (supported range: 50 - 250)
const VALIDATION_LIMITS = {
  age: { min: 18, max: 120, label: 'Age', unit: 'years' },
  sex: { allowed: [0, 1], label: 'Gender' },
  bp: { min: 50, max: 260, label: 'Blood Pressure (BP)', unit: 'mm Hg' },
  max_hr: { min: 50, max: 250, label: 'Heart Rate (Max HR)', unit: 'bpm' },
};

const PRESETS = {
  typical_low: {
    label: 'Sample: Low Risk',
    data: { age: 38, sex: 0, bp: 115, max_hr: 175 },
  },
  typical_elevated: {
    label: 'Sample: Elevated Risk',
    data: { age: 62, sex: 1, bp: 155, max_hr: 120 },
  },
};

export default function QuickPatientForm({
  onSubmit,
  isLoading = false,
  serverErrors = {},
  initialValues = null,
}) {
  const [formData, setFormData] = useState({
    age: '45',
    sex: '1',
    bp: '125',
    max_hr: '155',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        age: String(initialValues.age ?? '45'),
        sex: String(initialValues.sex ?? '1'),
        bp: String(initialValues.bp ?? initialValues.trestbps ?? '125'),
        max_hr: String(initialValues.max_hr ?? initialValues.thalach ?? '155'),
      });
    }
  }, [initialValues]);

  const validateField = (field, value) => {
    if (value === '' || value === null || value === undefined) {
      return `${VALIDATION_LIMITS[field]?.label || field} is required.`;
    }

    const numVal = Number(value);
    if (isNaN(numVal)) {
      return 'Please enter a valid numeric value.';
    }

    const limits = VALIDATION_LIMITS[field];
    if (limits && (numVal < limits.min || numVal > limits.max)) {
      return `Enter a value within the supported dataset range (${limits.min} – ${limits.max} ${limits.unit || ''}).`;
    }

    return null;
  };

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleApplyPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    if (p) {
      setFormData({
        age: String(p.data.age),
        sex: String(p.data.sex),
        bp: String(p.data.bp),
        max_hr: String(p.data.max_hr),
      });
      setErrors({});
      setTouched({});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    let hasError = false;

    Object.keys(VALIDATION_LIMITS).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) {
        newErrors[key] = err;
        hasError = true;
      }
    });

    setErrors(newErrors);
    setTouched({ age: true, sex: true, bp: true, max_hr: true });

    if (!hasError && onSubmit) {
      onSubmit({
        age: Number(formData.age),
        sex: Number(formData.sex),
        bp: Number(formData.bp),
        max_hr: Number(formData.max_hr),
      });
    }
  };

  return (
    <form className="patient-form-container" onSubmit={handleSubmit} noValidate>
      {/* Form Header */}
      <div className="form-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="type-tag-pill pill-quick" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
              Quick Risk Check
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>4 Basic Measurements</span>
          </div>
          <h2 className="section-title">Quick Heart Risk Check</h2>
          <p className="section-subtitle">
            Preliminary, accessible assessment using only 4 easily obtainable non-invasive parameters.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="preset-buttons">
          <span className="preset-label">Quick Samples:</span>
          <button
            type="button"
            className="btn-chip chip-low"
            onClick={() => handleApplyPreset('typical_low')}
            title="Load sample low risk values"
          >
            {PRESETS.typical_low.label}
          </button>
          <button
            type="button"
            className="btn-chip chip-high"
            onClick={() => handleApplyPreset('typical_elevated')}
            title="Load sample elevated risk values"
          >
            {PRESETS.typical_elevated.label}
          </button>
        </div>
      </div>

      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Field 1: Age */}
        <div className={`form-group ${(errors.age || serverErrors.age) ? 'has-error' : ''}`}>
          <label htmlFor="quick-age" className="form-label">
            <span>1. Age <span className="field-unit">(years)</span></span>
          </label>
          <input
            id="quick-age"
            name="age"
            type="number"
            min="18"
            max="120"
            step="1"
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            onBlur={() => handleBlur('age')}
            className="form-input"
            placeholder="e.g. 52"
            required
          />
          {(errors.age || serverErrors.age) && (
            <span className="field-error-msg">{errors.age || serverErrors.age}</span>
          )}
          <span className="field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Supported range: 18 – 120 yrs (dataset observed: 29 – 77)
          </span>
        </div>

        {/* Field 2: Gender / Sex */}
        <div className={`form-group ${(errors.sex || serverErrors.sex) ? 'has-error' : ''}`}>
          <label className="form-label">
            <span>2. Gender <span className="field-unit">(Sex)</span></span>
          </label>
          <div className="gender-toggle-group">
            <label className={`gender-option ${Number(formData.sex) === 1 ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="quick-sex"
                value="1"
                checked={Number(formData.sex) === 1}
                onChange={() => handleChange('sex', '1')}
              />
              <span className="gender-label">Male (1)</span>
            </label>
            <label className={`gender-option ${Number(formData.sex) === 0 ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="quick-sex"
                value="0"
                checked={Number(formData.sex) === 0}
                onChange={() => handleChange('sex', '0')}
              />
              <span className="gender-label">Female (0)</span>
            </label>
          </div>
          {(errors.sex || serverErrors.sex) && (
            <span className="field-error-msg">{errors.sex || serverErrors.sex}</span>
          )}
          <span className="field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Encoded as 1 for Male, 0 for Female in dataset
          </span>
        </div>

        {/* Field 3: Blood Pressure (BP) */}
        <div className={`form-group ${(errors.bp || serverErrors.bp) ? 'has-error' : ''}`}>
          <label htmlFor="quick-bp" className="form-label">
            <span>3. Blood Pressure <span className="field-unit">(BP, mm Hg)</span></span>
          </label>
          <input
            id="quick-bp"
            name="bp"
            type="number"
            min="50"
            max="260"
            step="1"
            value={formData.bp}
            onChange={(e) => handleChange('bp', e.target.value)}
            onBlur={() => handleBlur('bp')}
            className="form-input"
            placeholder="e.g. 130"
            required
          />
          {(errors.bp || serverErrors.bp) && (
            <span className="field-error-msg">{errors.bp || serverErrors.bp}</span>
          )}
          <span className="field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Supported range: 50 – 260 mm Hg (dataset observed: 94 – 200)
          </span>
        </div>

        {/* Field 4: Heart Rate (Max HR) */}
        <div className={`form-group ${(errors.max_hr || serverErrors.max_hr) ? 'has-error' : ''}`}>
          <label htmlFor="quick-max-hr" className="form-label">
            <span>4. Heart Rate <span className="field-unit">(Max HR, bpm)</span></span>
          </label>
          <input
            id="quick-max-hr"
            name="max_hr"
            type="number"
            min="50"
            max="250"
            step="1"
            value={formData.max_hr}
            onChange={(e) => handleChange('max_hr', e.target.value)}
            onBlur={() => handleBlur('max_hr')}
            className="form-input"
            placeholder="e.g. 150"
            required
          />
          {(errors.max_hr || serverErrors.max_hr) && (
            <span className="field-error-msg">{errors.max_hr || serverErrors.max_hr}</span>
          )}
          <span className="field-hint" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Peak exercise heart rate (supported: 50 – 250 bpm, observed: 71 – 202)
          </span>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button
          type="submit"
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
          disabled={isLoading}
          id="quick-predict-btn"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              <span>Calculating Quick Risk...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Calculate Quick Risk</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
