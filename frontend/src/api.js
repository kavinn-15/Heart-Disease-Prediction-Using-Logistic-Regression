import axios from 'axios';

// Resolve API base URL with fallback to local Flask server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Check backend API health and model loading status
 */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Unable to connect to prediction server.',
      isNetworkError: !error.response,
    };
  }
};

/**
 * Fetch trained model evaluation metrics and dataset summary
 */
export const fetchModelMetrics = async () => {
  try {
    const response = await apiClient.get('/metrics');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Unable to retrieve model metrics from server.',
    };
  }
};

/**
 * Submit 13 patient parameters for risk prediction
 */
export const predictHeartDisease = async (formData) => {
  try {
    const response = await apiClient.post('/predict', formData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (!error.response) {
      return {
        success: false,
        errorType: 'NETWORK_ERROR',
        message:
          'Network Error: Cannot connect to the prediction backend server at ' +
          API_BASE_URL +
          '. Please ensure the Flask server is running.',
      };
    }

    if (error.response.status === 400) {
      return {
        success: false,
        errorType: 'VALIDATION_ERROR',
        message: error.response.data?.error || 'Validation error: Please review patient parameters.',
        fieldErrors: error.response.data?.errors || {},
      };
    }

    if (error.response.status === 503) {
      return {
        success: false,
        errorType: 'SERVICE_UNAVAILABLE',
        message: error.response.data?.error || 'Machine learning models are currently unavailable.',
      };
    }

    return {
      success: false,
      errorType: 'SERVER_ERROR',
      message: error.response.data?.error || 'An unexpected server error occurred during prediction.',
    };
  }
};

/**
 * Phase 2: What-If Risk Simulator
 * Submits baseline and modified patient data to compute comparative probabilities and deltas.
 */
export const simulateWhatIf = async (baseline, modified) => {
  try {
    const response = await apiClient.post('/api/what-if', { baseline, modified });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to compute What-If simulation.',
      fieldErrors: error.response?.data?.modified_errors || error.response?.data?.errors,
    };
  }
};

/**
 * Phase 2: Feature Sensitivity Analysis
 * Varies each of the 13 clinical features for the given patient profile.
 */
export const fetchSensitivityAnalysis = async (patientData) => {
  try {
    const response = await apiClient.post('/api/sensitivity', { patient: patientData });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to retrieve sensitivity analysis.',
    };
  }
};

/**
 * Phase 2: Prediction Threshold Analysis
 * Retrieves TP, TN, FP, FN, Accuracy, Precision, Recall, F1 for a given classification threshold.
 */
export const fetchThresholdAnalysis = async (threshold = 0.50) => {
  try {
    const response = await apiClient.get('/api/threshold-analysis', {
      params: { threshold },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to retrieve threshold analysis.',
    };
  }
};

/**
 * Phase 2: ROC Curve Explorer
 * Retrieves exact ROC curve points (TPR, FPR) and ROC-AUC score.
 */
export const fetchRocData = async () => {
  try {
    const response = await apiClient.get('/api/roc-data');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to retrieve ROC curve data.',
    };
  }
};

/**
 * Phase 2: Confusion Matrix Explorer
 * Retrieves dynamic confusion matrix counts and educational explanations.
 */
export const fetchConfusionMatrix = async (threshold = 0.50) => {
  try {
    const response = await apiClient.get('/api/confusion-matrix', {
      params: { threshold },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to retrieve confusion matrix.',
    };
  }
};

/**
 * Phase 2: Model Coefficient Explorer
 * Retrieves actual trained Logistic Regression coefficients and explanations.
 */
export const fetchModelCoefficients = async () => {
  try {
    const response = await apiClient.get('/api/model-coefficients');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || 'Failed to retrieve model coefficients.',
    };
  }
};

/**
 * Quick Risk Check: 4-Feature Logistic Regression Prediction
 * Submits age, sex, bp, max_hr to /api/quick-predict
 */
export const predictQuickHeartDisease = async (formData) => {
  try {
    const response = await apiClient.post('/api/quick-predict', formData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (!error.response) {
      return {
        success: false,
        errorType: 'NETWORK_ERROR',
        message:
          'Network Error: Cannot connect to the prediction backend server at ' +
          API_BASE_URL +
          '. Please ensure the Flask server is running.',
      };
    }

    if (error.response.status === 400) {
      return {
        success: false,
        errorType: 'VALIDATION_ERROR',
        message: error.response.data?.error || 'Validation error: Please review Quick Risk parameters.',
        fieldErrors: error.response.data?.errors || {},
      };
    }

    if (error.response.status === 503) {
      return {
        success: false,
        errorType: 'SERVICE_UNAVAILABLE',
        message: error.response.data?.error || 'Quick Risk Model is currently unavailable.',
      };
    }

    return {
      success: false,
      errorType: 'SERVER_ERROR',
      message: error.response.data?.error || 'An unexpected server error occurred during quick prediction.',
    };
  }
};

/**
 * Quick Risk Check: Retrieve 4-Feature Model Evaluation Metrics
 */
export const fetchQuickMetrics = async () => {
  try {
    const response = await apiClient.get('/api/quick-metrics');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Unable to retrieve Quick Model metrics from server.',
    };
  }
};

