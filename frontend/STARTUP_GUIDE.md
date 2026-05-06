# Frontend Startup Guide

Complete step-by-step guide to run the IOB Mule Account Detection Frontend.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] Backend API running on `http://localhost:8000`
- [ ] Supabase project created and configured

## Quick Start (5 minutes)

```bash
# 1. Navigate to frontend directory
cd /media/yagaven_25/coding/Projects/IOB-CyberNova/frontend

# 2. Install dependencies (if not done)
npm install

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5173
```

## Step-by-Step Setup

### Step 1: Verify Dependencies

```bash
cd frontend

# Check if dependencies are installed
npm list

# Should show: axios, echarts, supabase, react-router-dom, etc.
```

### Step 2: Verify Environment Configuration

```bash
# Check .env.local file exists
ls -la .env.local

# Should show:
# VITE_API_URL=http://localhost:8000
# VITE_WS_URL=ws://localhost:8000
# VITE_SUPABASE_URL=https://pgoellvmcfdinlnwkcwx.supabase.co
# VITE_SUPABASE_KEY=...
```

### Step 3: Start Backend API

In a **new terminal**:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Should show:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

### Step 4: Start Frontend Dev Server

In a **new terminal**:

```bash
cd frontend
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

### Step 5: Test in Browser

1. Open `http://localhost:5173` in your browser
2. You should see the IOB Bank login page
3. Test login with demo credentials:
   - Email: `demo@iobbank.com`
   - Password: `demo@123456`

## Accessing Different Pages

After successful login, you can access:

| Page | URL | Feature |
|------|-----|---------|
| Dashboard | http://localhost:5173/dashboard | System overview |
| Chronos | http://localhost:5173/chronos | Data visualization |
| Mule Engine | http://localhost:5173/mule-engine | ML predictions |
| Hydra | http://localhost:5173/hydra | GAN training |

## Common Commands

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

## Troubleshooting

### Issue: Port 5173 already in use

```bash
# Use different port
npm run dev -- --port 5174

# Or kill the process using port 5173
lsof -i :5173
kill -9 <PID>
```

### Issue: "Cannot connect to API"

1. Check backend is running:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. Check API URL in `.env.local`:
   ```bash
   VITE_API_URL=http://localhost:8000
   ```

3. Check CORS configuration in backend:
   ```python
   # backend/app/main.py
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
   ```

### Issue: Supabase authentication fails

1. Verify Supabase credentials in `.env.local`
2. Check Supabase project is active
3. Test Supabase connection:
   ```bash
   # Open browser console and run:
   import { supabase } from './config/supabase'
   supabase.auth.getUser()
   ```

### Issue: WebSocket connection fails

1. Check backend WebSocket support:
   ```bash
   curl -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
        ws://localhost:8000/api/v1/gan/ws/training/test
   ```

2. Verify WS_URL in `.env.local`:
   ```
   VITE_WS_URL=ws://localhost:8000
   ```

### Issue: Charts not rendering

1. Check browser console for errors
2. Verify ECharts is installed:
   ```bash
   npm list echarts
   ```

3. Clear browser cache and reload

## Testing Features

### Test Authentication

1. Go to login page
2. Click "Demo Login" button
3. Should be redirected to dashboard

### Test Data Visualization (Chronos)

1. Go to Chronos page
2. Select different time ranges (24H, 7D, 30D, 90D)
3. Select different metrics
4. Charts should update automatically

### Test Predictions (Mule Engine)

1. Go to Mule Engine page
2. Select a model (LightGBM, GNN, or Ensemble)
3. Upload a CSV file (create test file or use sample data)
4. Should show prediction results

### Test GAN Training (Hydra)

1. Go to Hydra page
2. Configure training parameters
3. Click "Start Training"
4. Should show real-time progress updates

## Performance Monitoring

### Check Build Size

```bash
npm run build

# Output should show:
# dist/index.html                0.45 kB
# dist/assets/index-*.css        3.35 kB
# dist/assets/index-*.js      1,634.51 kB (before gzip)
#                               518 kB (gzipped)
```

### Monitor Network Traffic

1. Open DevTools (F12)
2. Go to Network tab
3. Perform actions and monitor:
   - API request latency
   - Bundle sizes
   - WebSocket connections

### Monitor Memory Usage

1. Open DevTools (F12)
2. Go to Performance tab
3. Record session and analyze:
   - Memory usage
   - Long tasks
   - Rendering performance

## File Locations

```
/media/yagaven_25/coding/Projects/IOB-CyberNova/
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # Entry point
│   │   ├── index.css           # Global styles
│   │   ├── config/
│   │   │   ├── api.js          # API configuration
│   │   │   ├── supabase.js     # Auth setup
│   │   │   └── theme.js        # IOB theme colors
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ChronosPage.jsx
│   │   │   ├── MuleEnginePage.jsx
│   │   │   └── HydraPage.jsx
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── MainLayout.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── services/
│   │       └── websocket.js
│   ├── .env.local              # Environment variables
│   ├── package.json
│   └── FRONTEND_README.md      # This file
│
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── api/
│   │   │   ├── gan_routes.py
│   │   │   ├── ml_routes.py
│   │   │   └── db_routes.py
│   │   └── services/
│   │       ├── gan_training.py
│   │       └── ml_models.py
│   ├── .env                    # Backend config
│   ├── requirements.txt
│   └── run.sh
```

## Next Steps

1. **Explore Dashboard**: Get overview of system status
2. **Try Chronos**: Visualize transaction data and patterns
3. **Run Predictions**: Upload data and get ML predictions
4. **Train GAN**: Start adversarial training with real-time monitoring

## Additional Resources

- **Frontend README**: `frontend/FRONTEND_README.md`
- **Example Guide**: `backend/EXAMPLE-GAN-ENDPOINTS.md`
- **Backend Docs**: `backend/README_ENDPOINTS.md`
- **API Documentation**: Check `/api/v1/docs` when backend is running

## Support & Issues

### Check Logs

```bash
# Frontend logs (browser console)
F12 or Ctrl+Shift+I

# Backend logs
# Terminal where backend is running

# System logs
tail -f /var/log/syslog
```

### Get Help

1. Check error messages in browser console
2. Review backend logs for API errors
3. Verify all services are running
4. Check environment configuration

## Production Deployment

When ready for production:

```bash
# 1. Build optimized version
npm run build

# 2. Deploy dist/ folder to hosting service
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Any static hosting service

# 3. Update environment variables for production
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_KEY=your_production_key
```

## Monitoring & Maintenance

### Regular Checks

- [ ] Backend API health: `GET /api/v1/health`
- [ ] Frontend load time: < 2 seconds
- [ ] Chart rendering: < 500ms
- [ ] WebSocket connection: Working for GAN training

### Performance Targets

- Page load: < 2 seconds
- Time to interactive: < 3 seconds
- Chart rendering: < 500ms
- Bundle size (gzipped): < 600 KB

---

**Last Updated**: January 2024
**Version**: 1.0.0
