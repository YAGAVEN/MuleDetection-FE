/**
 * Constants and utility functions
 */

export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const TRAINING_STATUS = {
  IDLE: 'idle',
  TRAINING: 'training',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const MODEL_NAMES = {
  LIGHTGBM: 'lightgbm',
  GNN: 'gnn',
  ENSEMBLE: 'ensemble',
};

/**
 * Format risk score as percentage
 */
export const formatRiskScore = (score) => {
  return `${(score * 100).toFixed(1)}%`;
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  return num?.toLocaleString() || '0';
};

/**
 * Format date to readable format
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (current, total) => {
  if (!total) return 0;
  return (current / total) * 100;
};

/**
 * Get risk level from score
 */
export const getRiskLevel = (score) => {
  if (score >= 0.9) return RISK_LEVELS.CRITICAL;
  if (score >= 0.7) return RISK_LEVELS.HIGH;
  if (score >= 0.5) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
};

/**
 * Format time remaining
 */
export const formatTimeRemaining = (seconds) => {
  if (!seconds || seconds <= 0) return '< 1 minute';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours > 1 ? 's' : ''}`;
};
