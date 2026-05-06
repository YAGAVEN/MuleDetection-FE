/**
 * IOB-Themed Color Palette & Theme Configuration
 * Indian Overseas Bank White & Blue Theme with Context-Aware Adaptations
 */

export const iobTheme = {
  colors: {
    // Primary IOB Colors
    primary: {
      main: '#003399', // IOB Blue
      light: '#1a47b5',
      dark: '#00246b',
      contrast: '#FFFFFF',
    },
    secondary: {
      main: '#FFFFFF', // IOB White
      light: '#f5f5f5',
      dark: '#e0e0e0',
      contrast: '#003399',
    },

    // Functional Colors
    success: '#28A745',
    warning: '#FF9800',
    error: '#DC3545',
    info: '#17A2B8',

    // Context-Specific Colors
    chronos: {
      primary: '#003399',
      secondary: '#1a47b5',
      accent: '#0052cc',
      background: '#f8f9fa',
      chart1: '#003399',
      chart2: '#1a47b5',
      chart3: '#0052cc',
      chart4: '#003d99',
      positive: '#28A745',
      negative: '#DC3545',
    },

    muleEngine: {
      primary: '#003399',
      safe: '#28A745',
      risky: '#FF6B35',
      suspicious: '#FF9800',
      background: '#f8f9fa',
      model1: '#003399', // LightGBM
      model2: '#1a47b5', // GNN
      model3: '#0052cc', // Ensemble
    },

    hydra: {
      primary: '#003399',
      training: '#9C27B0',
      completed: '#4CAF50',
      failed: '#f44336',
      background: '#f8f9fa',
      progress: '#2196F3',
    },

    // Neutral
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  typography: {
    fontFamily: {
      sans: '"Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
      mono: '"Fira Code", "Courier New", monospace',
    },
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
};

export const getThemeByPage = (page) => {
  switch (page) {
    case 'chronos':
      return iobTheme.colors.chronos;
    case 'mule-engine':
      return iobTheme.colors.muleEngine;
    case 'hydra':
      return iobTheme.colors.hydra;
    default:
      return {
        primary: iobTheme.colors.primary.main,
        secondary: iobTheme.colors.secondary.main,
      };
  }
};
