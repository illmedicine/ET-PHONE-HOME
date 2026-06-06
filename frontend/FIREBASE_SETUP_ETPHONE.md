# Firebase Setup for ETPHONE Project

**Project Details:**
- Project Name: `ETPHONE`
- Project ID: `etphone-d829e`
- Project Number: `127946177550`
- Region: `US (us-central1)` recommended

## Step 1: Get Remaining Credentials

Your `frontend/js/config.js` is pre-configured with most values. You only need to fill in 2 fields:

### Get Web API Key

1. Go to [Firebase Console](https://console.firebase.google.com/) → Select **ETPHONE** project
2. Click ⚙️ (Settings) → **Project settings**
3. Go to **General** tab
4. Scroll to **Your apps** section
5. Look for the Web app (may show as a code snippet `<script>`)
6. Copy the value from:
   ```javascript
   "apiKey": "YOUR_WEB_API_KEY_HERE"
   ```
7. Paste into `frontend/js/config.js`:
   ```javascript
   apiKey: "AIzaSy...",  // Replace with copied value
   ```

### Get Web App ID

1. Same Firebase Console location
2. In **Your apps** section, find the Web app configuration
3. Copy the `appId` value:
   ```javascript
   "appId": "1:127946177550:web:a1b2c3d4e5f6g7h8"
   ```
4. Paste into `frontend/js/config.js`:
   ```javascript
   appId: "1:127946177550:web:..."  // Replace with copied value
   ```

**After pasting both values, your config.js should look like:**

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDsxXuqJW8z-q1KZj5K7B8L9M0N1O2P3Q4",
    authDomain: "etphone-d829e.firebaseapp.com",
    projectId: "etphone-d829e",
    storageBucket: "etphone-d829e.appspot.com",
    databaseURL: "https://etphone-d829e.firebaseio.com",
    messagingSenderId: "127946177550",
    appId: "1:127946177550:web:a1b2c3d4e5f6g7h8"
};
```

## Step 2: Enable Realtime Database

1. Firebase Console → **ETPHONE** project
2. Left sidebar → **Build** → **Realtime Database**
3. Click **Create Database**
4. Region: **United States (us-central1)** (or closest to you)
5. Start mode: **Test mode** (for development)
6. Click **Create**

Your database URL is: `https://etphone-d829e.firebaseio.com`

## Step 3: Configure Database Rules

1. Firebase Console → **Realtime Database** → **Rules** tab
2. **Replace all existing content** with:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "status": {
          ".validate": "newData.isString()"
        },
        "lastSeen": {
          ".validate": "newData.isNumber()"
        },
        "location": {
          ".validate": "newData.isString()"
        },
        "messages": {
          "$messageId": {
            ".write": true,
            ".read": true,
            ".validate": "newData.hasChildren(['type', 'downloadUrl', 'metadata'])"
          }
        },
        ".read": true,
        ".write": false
      }
    },
    "messages": {
      "$messageId": {
        "id": {
          ".validate": "newData.isString()"
        },
        "type": {
          ".validate": "newData.isString() && (newData.val() === 'audio' || newData.val() === 'video')"
        },
        "targetDevice": {
          ".validate": "newData.isString()"
        },
        "status": {
          ".validate": "newData.isString()"
        },
        "downloadUrl": {
          ".validate": "newData.isString()"
        },
        "uploadedAt": {
          ".validate": "newData.isString()"
        },
        "metadata": {
          ".validate": "newData.hasChildren(['fileSize'])"
        },
        ".write": true,
        ".read": true
      }
    },
    ".read": false,
    ".write": false
  }
}
```

3. Click **Publish**

## Step 4: Initialize Database Structure

1. Firebase Console → **Realtime Database**
2. Click **+** (plus icon) next to the root folder
3. Add key: `devices` (leave empty for now)
4. Click **Add**
5. Repeat: Add key `messages` (leave empty)

**Expected structure:**
```
root
├── devices/
│   └── (empty - will populate when devices connect)
└── messages/
    └── (empty - will populate when messages uploaded)
```

**Or create test devices:**

1. Click **+** next to `devices`
2. Add key: `freenove-001`
3. In that folder, add:
   - `status` (string): `"offline"`
   - `lastSeen` (number): `0`
   - `location` (string): `"kitchen"`
   - `messages` (object): leave empty

Repeat for `freenove-002`, `freenove-003` etc.

## Step 5: Enable Cloud Storage

1. Firebase Console → **Build** → **Storage**
2. Click **Get started**
3. Region: **us-central1** (or closest)
4. Start mode: **Test mode**
5. Click **Done**

Your storage bucket is: `gs://etphone-d829e.appspot.com`

## Step 6: Configure Storage Rules

1. Firebase Console → **Storage** → **Rules** tab
2. **Replace all existing content** with:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Audio messages: device-scoped access
    match /audio-messages/{deviceId}/{messageId} {
      allow read: if true;
      allow write: if request.resource.size < 512000; // 500 KB
    }
    
    // Video messages: device-scoped access
    match /video-messages/{deviceId}/{messageId} {
      allow read: if true;
      allow write: if request.resource.size < 2097152; // 2 MB
    }
    
    // Metadata (if stored as files)
    match /metadata/{deviceId}/{messageId} {
      allow read, write: if true;
    }
    
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

## Step 7: Create Storage Buckets Structure

Storage auto-creates directories on first file. But you can pre-create the structure:

1. Firebase Console → **Storage**
2. Create these folders by uploading a test file (later delete it):
   - `audio-messages/freenove-001/`
   - `audio-messages/freenove-002/`
   - `video-messages/freenove-001/`
   - `video-messages/freenove-002/`
   - `metadata/`

Or just ignore this step - folders auto-create when files are uploaded.

## Step 8: Test Connection

1. Open `frontend/index.html` locally:
   ```bash
   cd frontend
   python -m http.server 8000
   # Open http://localhost:8000
   ```

2. Open browser **Console** (F12 → Console tab)

3. You should see:
   ```
   Firebase initialized successfully
   ```

4. Try recording a short audio message:
   - Click "Audio Message" tab
   - Click "Start Recording"
   - Say something (2-3 seconds)
   - Click "Stop Recording"
   - Enter device: `freenove-001`
   - Click "Upload to Device"

5. Check Firebase Console → **Storage**:
   - Should see file in: `audio-messages/freenove-001/msg_*.webm`

6. Check Firebase Console → **Realtime Database**:
   - Should see entries in: `messages/{messageId}/...`
   - Should see device queue in: `devices/freenove-001/messages/{messageId}`

## Step 9: Deploy Frontend

### Option A: GitHub Pages (Recommended for quick start)

1. Create repo: `https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io`

2. Clone it:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io
   cd YOUR_USERNAME.github.io
   ```

3. Copy frontend files:
   ```bash
   cp -r ET-PHONE-HOME/frontend/* .
   ```

4. Commit and push:
   ```bash
   git add .
   git commit -m "Add ET-Phone-Home frontend with Firebase integration"
   git push origin main
   ```

5. Access at: `https://YOUR_USERNAME.github.io`

### Option B: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login:
   ```bash
   firebase login
   ```

3. Initialize:
   ```bash
   firebase init hosting
   ```
   - Select **ETPHONE** project
   - Public directory: `frontend`
   - Configure as SPA: **N**

4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

5. Access at: `https://etphone-d829e.web.app`

## Step 10: Verify Everything Works

### From Frontend

1. Go to your deployed frontend URL
2. Record audio/video message
3. Enter device: `freenove-001`
4. Click upload
5. Watch progress bar

### From Firebase Console

1. **Storage** → Check `audio-messages/freenove-001/` for uploaded file
2. **Realtime Database** → Check:
   - `devices/freenove-001/messages/` → should have message entry
   - `messages/msg_*/` → should have status: "uploaded"

## Troubleshooting

### "Firebase not initialized" / "Configuration not set"
- Verify you filled in `apiKey` and `appId` in config.js
- Check browser console for error messages
- Verify config.js syntax (no missing commas)

### "Permission denied" on upload
- Check Storage rules are published
- Verify file size < limits (500KB audio, 2MB video)
- Try clearing browser cache

### "No devices found" on device validation
- Create test devices in Realtime Database
- Or skip device validation during testing

### Database not responding
- Verify Realtime Database is created
- Check database URL is correct in config.js
- Check database rules are published

## Firebase Project URLs

| Service | URL |
|---------|-----|
| **Console** | https://console.firebase.google.com/project/etphone-d829e |
| **Realtime DB** | https://console.firebase.google.com/project/etphone-d829e/database/etphone-d829e/data |
| **Storage** | https://console.firebase.google.com/project/etphone-d829e/storage/buckets/etphone-d829e.appspot.com |
| **Database URL** | https://etphone-d829e.firebaseio.com |
| **Storage Bucket** | gs://etphone-d829e.appspot.com |

## Security Checklist

- [ ] Firebase credentials filled in config.js
- [ ] Database rules published
- [ ] Storage rules published
- [ ] Test devices created in Realtime Database
- [ ] Frontend deployed (GitHub Pages or Firebase Hosting)
- [ ] Test upload from frontend
- [ ] Verify file in Storage
- [ ] Verify message in Database

## Next Steps

1. ✅ Firebase project configured
2. ✅ Database and Storage ready
3. ⏭️ [Setup ESP32 Firmware](../firmware/README.md)
4. ⏭️ Build and flash firmware to Freenove kit
5. ⏭️ Connect ESP32 to WiFi and test message delivery
6. ⏭️ Verify end-to-end playback

---

**Your Firebase is ready!** Proceed to [ESP32 Firmware Setup](../firmware/README.md)
