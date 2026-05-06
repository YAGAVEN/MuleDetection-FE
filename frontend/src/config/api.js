/**
 * API Configuration
 * Axios client with auth interceptors and backend endpoints
 */

import axios from 'axios';

// API Configuration from environment
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  ENDPOINTS: {
    // Health & Info
    HEALTH: '/api/v1/health',

    // Database Routes
    DB: {
      TRANSACTIONS: '/api/v1/db/transactions',
      ACCOUNTS: '/api/v1/db/accounts',
      ANALYTICS: '/api/v1/db/analytics',
      DATA_STATS: '/api/v1/db/data-stats',
      PATTERNS: '/api/v1/db/patterns',
    },

    // ML Model Routes
    ML: {
      PREDICT: '/api/v1/ml/predict',
      PREDICT_BATCH: '/api/v1/ml/predict-batch',
      MODELS: '/api/v1/ml/models',
      METRICS: '/api/v1/ml/metrics',
      FEATURES: '/api/v1/ml/features',
    },

    // GAN Training Routes
    GAN: {
      TRAIN_START: '/api/v1/gan/train/start',
      TRAIN_PROGRESS: '/api/v1/gan/train/progress',
      TRAIN_METRICS: '/api/v1/gan/train/metrics',
      GENERATE_SYNTHETIC: '/api/v1/gan/generate/synthetic',
      AUGMENT_INFO: '/api/v1/gan/generate/augment-info',
      STREAMING_INIT: '/api/v1/gan/streaming/init',
      STREAMING_BATCH: '/api/v1/gan/streaming/batch',
      STREAMING_STATUS: '/api/v1/gan/streaming/status',
      CHECKPOINT_SAVE: '/api/v1/gan/checkpoint/save',
      SESSIONS: '/api/v1/gan/sessions',
      HEALTH: '/api/v1/gan/health',
      CONFIG_DEFAULT: '/api/v1/gan/config/default',
    },
  },
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper functions for API calls
export const api = {
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
};

export default apiClient;
