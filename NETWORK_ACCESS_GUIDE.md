# Network Access Configuration Guide

## 🌐 Your Network Setup

**Your Machine IP**: `172.16.31.158`

## ✅ Changes Made

### 1. Backend Configuration
- **File**: `backend/src/index.ts`
  - Changed server to listen on `0.0.0.0` (all network interfaces)
  - Added network access log message

- **File**: `backend/.env`
  - Updated `FRONTEND_URL` to `http://172.16.31.158:5173`
  - This allows CORS requests from network devices

### 2. Frontend Configuration
- **File**: `frontend/package.json`
  - Updated dev script to include `--host` flag

- **File**: `frontend/.env`
  - Updated `VITE_API_URL` to `http://172.16.31.158:3000/api`
  - Frontend now connects to backend via network IP

## 🚀 How to Start

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
MarketingWiz API running on http://localhost:3000
Network access: http://172.16.31.158:3000
```

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.4.21  ready in 321 ms

➜  Local:   http://localhost:5173/
➜  Network: http://172.16.31.158:5173/
```

## 📱 Access from Other Devices

### On the Same Computer
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

### From Other Devices (Phone, Tablet, Another Computer)
- Frontend: `http://172.16.31.158:5173`
- Backend: `http://172.16.31.158:3000`

## 🔧 Troubleshooting

### "Failed to fetch" Error
1. **Check both servers are running**
   - Backend should show "Network access: http://172.16.31.158:3000"
   - Frontend should show "Network: http://172.16.31.158:5173"

2. **Check firewall**
   ```bash
   # Allow ports 3000 and 5173
   sudo ufw allow 3000
   sudo ufw allow 5173
   ```

3. **Verify IP address hasn't changed**
   ```bash
   hostname -I | awk '{print $1}'
   ```
   If different, update `.env` files with new IP

4. **Check devices are on same network**
   - Both devices must be connected to the same WiFi/LAN

### CORS Errors
- Make sure `FRONTEND_URL` in `backend/.env` matches the network URL
- Restart backend after changing `.env` files

### Can't Connect from Phone
1. Make sure phone is on same WiFi network
2. Try disabling phone's VPN if enabled
3. Check if router has AP isolation enabled (disable it)

## 🔄 Switching Back to Localhost

If you want to switch back to localhost-only mode:

### Backend `.env`
```env
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000/api
```

### Backend `src/index.ts`
```typescript
app.listen(PORT, () => {
  console.log(`MarketingWiz API running on http://localhost:${PORT}`);
  void seedSuperAdmin();
  void runFirefliesSync();
});
```

Then restart both servers.

## 📝 Notes

- **Security**: Network mode exposes your dev server to local network. Safe for home/office, avoid on public WiFi.
- **IP Changes**: If your machine's IP changes (DHCP), update the `.env` files.
- **Performance**: Network access may be slightly slower than localhost.
- **Hot Reload**: Works the same on network as localhost.

## ✨ Benefits

✅ Test on real mobile devices
✅ Share with team members on same network
✅ Test responsive design on actual phones/tablets
✅ Demo to stakeholders without deployment
✅ Debug mobile-specific issues

## 🎯 Quick Test

1. Open `http://172.16.31.158:5173` on your phone's browser
2. You should see the login page
3. Try logging in - it should work!

If you see "Failed to fetch", check the troubleshooting section above.
