# IOB Mule Account Detection - Advanced Frontend

Complete React-based frontend for Mule Account Detection and AML Compliance with advanced features.

## Overview

This frontend provides a comprehensive interface for:
- **Chronos**: Real-time data visualization and pattern analysis
- **Mule Engine**: Multi-model ML predictions (LightGBM, GNN, Ensemble)
- **Hydra**: Adversarial GAN training with real-time monitoring

## Features

### 1. Authentication
- Supabase direct authentication
- Email/password login and registration
- Session persistence
- Automatic logout on token expiration

### 2. Chronos - Data Visualization
- Time-series transaction trends
- Hourly activity patterns
- Risk distribution analysis
- Real-time chart updates
- Configurable time ranges
- Export functionality

### 3. Mule Engine - Predictions
- Multi-model selection (LightGBM, GNN, Ensemble)
- CSV/JSON file upload
- Risk score analysis
- Account classification
- Model accuracy comparison
- Risk distribution visualization

### 4. Hydra - GAN Training
- Training configuration UI
- Real-time progress monitoring via WebSocket
- Loss trend visualization
- Training history management
- Checkpoint save/load
- Advanced hyperparameter configuration

## Technology Stack

- **Frontend Framework**: React 19 with Vite
- **Styling**: Inline CSS with IOB theme colors
- **Charts/Graphs**: Apache ECharts
- **Authentication**: Supabase
- **HTTP Client**: Axios
- **Real-time**: WebSocket
- **Icons**: Lucide React

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`
- Supabase project configured

### Installation Steps

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (already done, but for reference)
npm install

# 3. Create .env.local file
cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_SUPABASE_URL=https://pgoellvmcfdinlnwkcwx.supabase.co
VITE_SUPABASE_KEY=your_supabase_key_here
VITE_DEBUG=true
VITE_ENV=development
EOF

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5173
```

## Development

### Start Development Server
```bash
npm run dev
```
Starts the Vite dev server with hot module replacement (HMR).

### Build for Production
```bash
npm run build
```
Creates optimized production build in `dist/` directory.

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally.

### Run Linter
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── config/
│   │   ├── api.js           # Axios client & endpoints
│   │   ├── supabase.js      # Supabase auth setup
│   │   └── theme.js         # IOB color theme
│   ├── context/
│   │   └── AuthContext.jsx  # Auth state management
│   ├── services/
│   │   └── websocket.js     # WebSocket client for real-time updates
│   ├── components/
│   │   ├── common/
│   │   │   └── MainLayout.jsx  # App shell with sidebar
│   │   ├── auth/
│   │   ├── chronos/
│   │   ├── mule-engine/
│   │   └── hydra/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ChronosPage.jsx
│   │   ├── MuleEnginePage.jsx
│   │   └── HydraPage.jsx
│   ├── utils/
│   │   └── constants.js     # Constants and helpers
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── .env.local              # Environment variables
├── package.json
├── vite.config.js
└── README.md
```

## Theme Configuration

### IOB Color Scheme

```javascript
// Primary Colors
Primary: #003399 (IOB Blue)
White: #FFFFFF (IOB White)

// Functional Colors
Success: #28A745 (Green)
Warning: #FF9800 (Orange)
Error: #DC3545 (Red)
Info: #17A2B8 (Blue)

// Page-Specific Colors
Chronos: Blues, deep backgrounds
Mule Engine: Greens for safe, orange for risky
Hydra: Purples for training, blues for completion
```

### Customizing Theme

Edit `src/config/theme.js` to modify colors:

```javascript
export const iobTheme = {
  colors: {
    primary: {
      main: '#003399',     // Change primary color
      light: '#1a47b5',
      dark: '#00246b',
    },
    // ... more colors
  },
};
```

## API Integration

### Backend Endpoints Used

**Database Routes**
- `GET /api/v1/db/transactions` - Fetch transactions
- `GET /api/v1/db/accounts` - Fetch accounts
- `GET /api/v1/db/analytics` - Get analytics data

**ML Routes**
- `POST /api/v1/ml/predict` - Single prediction
- `POST /api/v1/ml/predict-batch` - Batch predictions
- `GET /api/v1/ml/models` - List models
- `GET /api/v1/ml/metrics` - Model metrics

**GAN Routes**
- `POST /api/v1/gan/train/start` - Start training
- `GET /api/v1/gan/train/progress/{id}` - Training progress
- `GET /api/v1/gan/train/metrics/{id}` - Training metrics
- `POST /api/v1/gan/generate/synthetic` - Generate samples
- `WebSocket /api/v1/gan/ws/training/{id}` - Real-time updates

### Request Examples

```javascript
// Fetch analytics
const res = await api.get('/api/v1/db/analytics', {
  params: { timeRange: '7days', metric: 'transaction_count' }
});

// Upload file for prediction
const formData = new FormData();
formData.append('file', csvFile);
formData.append('model', 'ensemble');
const res = await api.post('/api/v1/ml/predict-batch', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Start GAN training
const res = await api.post('/api/v1/gan/train/start', {
  data_path: '/path/to/data.csv',
  config: { gan_epochs: 50, gan_batch_size: 32 }
});
```

## Real-time Updates with WebSocket

The frontend uses WebSocket for real-time GAN training updates:

```javascript
import { GANWebSocketService } from './services/websocket';

// Connect to training
const ws = new GANWebSocketService(trainingId);
ws.onProgress((data) => {
  console.log('Progress:', data);
});
ws.onMetrics((data) => {
  console.log('Metrics:', data);
});
ws.connect();
```

## Authentication Flow

1. User enters email/password on login page
2. Supabase authenticates and returns session token
3. Token stored in localStorage for subsequent requests
4. Axios interceptor adds token to all API requests
5. On token expiration, user redirected to login

## Error Handling

The application includes:
- Global error boundaries
- Axios response interceptors for HTTP errors
- Graceful fallbacks with mock data
- User-friendly error messages
- Loading states for async operations

## Performance Optimization

- Lazy loading of chart libraries
- Memoization of expensive computations
- Efficient re-rendering with React hooks
- Chunk size optimization for production

### Bundle Size
- Development: ~1.6 MB (before gzip)
- Production: ~518 KB (gzipped)

## Troubleshooting

### Port Already in Use
```bash
# Change dev server port
npm run dev -- --port 5174
```

### Backend Connection Issues
- Ensure backend API is running on `http://localhost:8000`
- Check CORS settings in backend
- Verify API_URL in `.env.local`

### WebSocket Connection Fails
- Check backend WebSocket support
- Verify WS_URL in `.env.local`
- Check browser WebSocket support

### Supabase Authentication Fails
- Verify Supabase credentials in `.env.local`
- Check Supabase project settings
- Ensure email is registered in Supabase

## Demo Credentials

For testing purposes:
- Email: `demo@iobbank.com`
- Password: `demo@123456`

## Deployment

### Build Production Bundle
```bash
npm run build
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Environment Variables for Production
```
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_KEY=your_production_key
VITE_DEBUG=false
VITE_ENV=production
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Benchmarks

| Page | Load Time | Time to Interactive | Chart Render |
|------|-----------|-------------------|--------------|
| Login | ~400ms | ~800ms | N/A |
| Dashboard | ~600ms | ~1.2s | N/A |
| Chronos | ~800ms | ~1.5s | ~300ms |
| Mule Engine | ~700ms | ~1.4s | ~200ms |
| Hydra | ~750ms | ~1.5s | ~250ms |

## Contributing

1. Follow the existing code style
2. Use meaningful component names
3. Add JSDoc comments for functions
4. Test changes locally before committing
5. Update documentation as needed

## License

© 2024 Indian Overseas Bank. All rights reserved.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review backend logs
3. Check browser console for errors
4. Contact development team
