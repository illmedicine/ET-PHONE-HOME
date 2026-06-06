# Frontend Quick Start

Get the ET-Phone-Home frontend running in 5 minutes.

## Quick Setup

### 1. Configure Firebase

```bash
cp js/config.template.js js/config.js
```

Edit `js/config.js` and fill in your Firebase credentials:
- Get from https://console.firebase.google.com/ → Project Settings

### 2. Test Locally

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Node.js:**
```bash
npx http-server
```

**PHP:**
```bash
php -S localhost:8000
```

Open browser: `http://localhost:8000`

### 3. Deploy to GitHub Pages

```bash
# Clone your GitHub Pages repo
git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io
cd YOUR_USERNAME.github.io

# Copy frontend files
cp -r ET-PHONE-HOME/frontend/* .

# Configure credentials
cp js/config.template.js js/config.js
# Edit js/config.js with your Firebase config

# Commit and push
git add .
git commit -m "Add ET-Phone-Home frontend"
git push

# Access at: https://YOUR_USERNAME.github.io
```

### 4. Test Frontend

1. Open the frontend in browser
2. Check browser console for any errors
3. Try recording an audio message
4. Enter a device ID: `freenove-001`
5. Click "Upload to Device"
6. Check Firebase Console for uploaded file

## File Structure

```
frontend/
├── index.html              # Main UI
├── README.md              # Full documentation
├── FIREBASE_SETUP.md      # Firebase configuration guide
├── QUICK_START.md         # This file
├── .gitignore             # Git ignore rules
├── css/
│   └── style.css          # Styling (dark theme)
├── js/
│   ├── config.js          # Firebase config (YOUR config goes here)
│   ├── config.template.js # Template to copy from
│   ├── media.js           # Audio/video recording & compression
│   ├── uploader.js        # Firebase upload & signaling
│   └── app.js             # Main app orchestration
└── assets/                # Future: Images, icons, etc.
```

## Key Files Explained

| File | Purpose |
|------|---------|
| `index.html` | UI with tabs for audio/video/alerts |
| `config.js` | Firebase credentials (YOU fill this in) |
| `media.js` | MediaCapture class for recording |
| `uploader.js` | MediaUploader class for Firebase ops |
| `app.js` | Event handlers and UI coordination |

## Common Issues

### "Firebase configuration not set"
→ Edit `js/config.js` with your Firebase credentials

### "No audio/video devices found"
→ Give browser permission to access microphone/camera

### "Device validation failed"
→ Create the device in Firebase Console under `devices/{deviceId}`

### CORS errors
→ Check Firebase Storage rules allow the domain

## Firebase Test Devices

Create these test devices in Firebase Console for testing:

**Realtime Database → Create these entries:**

```json
{
  "devices": {
    "freenove-001": {
      "status": "connected",
      "lastSeen": 1686144000000,
      "location": "kitchen",
      "messages": {}
    },
    "freenove-002": {
      "status": "connected",
      "lastSeen": 1686144000000,
      "location": "garage",
      "messages": {}
    }
  },
  "messages": {}
}
```

Then use `freenove-001` or `freenove-002` in the UI.

## Testing Audio/Video Upload

### Audio Test

1. Click "Audio Message" tab
2. Click "Start Recording"
3. Say something (2-5 seconds)
4. Click "Stop Recording"
5. (Optional) Click "Play Preview"
6. Enter Device ID: `freenove-001`
7. Click "Upload to Device"
8. Watch progress bar
9. Check Firebase Console → Storage for file

### Video Test

1. Click "Video Message" tab
2. Allow camera access
3. Click "Start Recording"
4. Record 2-5 seconds
5. Click "Stop Recording"
6. (Optional) Click "Play Preview"
7. Enter Device ID: `freenove-001`
8. Click "Upload to Device"
9. Monitor upload progress

## Verify Upload

After uploading:

1. **Check Firebase Storage:**
   - Go to Console → Storage
   - Look for `audio-messages/freenove-001/msg_*.webm`

2. **Check Firebase Database:**
   - Go to Console → Realtime Database
   - Look for `messages/{messageId}/status`

3. **Check Alerts Tab:**
   - Should show "uploaded" status
   - Updates as ESP32 processes message

## Next Steps

1. ✅ Frontend is deployed and working
2. 📱 [Setup ESP32 firmware](../firmware/README.md)
3. 🔗 Connect ESP32 to WiFi and Firebase
4. 🎙️ Send test messages from frontend
5. 🎉 Verify playback on ESP32

## Support

- Frontend docs: `README.md`
- Firebase guide: `FIREBASE_SETUP.md`
- Main project: `../README.md`

---

**Ready to build the ESP32 firmware?** Start with `../firmware/README.md`
