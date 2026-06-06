# Firebase Setup Guide for ET-Phone-Home

Complete guide to setting up Firebase backend for the asynchronous media paging system.

## Prerequisites

- Google Cloud Account (free tier eligible)
- Firebase CLI (optional, for advanced setup)
- A GitHub account (for GitHub Pages frontend)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name: `et-phone-home` (or your preferred name)
4. Uncheck "Enable Google Analytics" (optional)
5. Click "Create Project"
6. Wait for project provisioning (1-2 minutes)

## Step 2: Get Project Credentials

1. In Firebase Console, click the gear icon → "Project Settings"
2. Click "Service Accounts" tab
3. Click "Generate New Private Key" (keep this secure!)
4. Copy the following values to `frontend/js/config.js`:
   - `apiKey` → from "Web API Key"
   - `authDomain` → `{projectId}.firebaseapp.com`
   - `projectId` → from service account JSON
   - `storageBucket` → `{projectId}.appspot.com`
   - `databaseURL` → `https://{projectId}.firebaseio.com`
   - `messagingSenderId` → from service account JSON
   - `appId` → from "Web App ID"

Alternative (easier):
1. Go to Project Settings → General tab
2. Look for "Firebase SDK snippet" section
3. Select "Config" option
4. Copy the `firebaseConfig` object directly

## Step 3: Enable Realtime Database

1. In Firebase Console, go to "Realtime Database" (left sidebar)
2. Click "Create Database"
3. Choose region: US (or closest to you)
4. Start in **Test Mode** (for development)
5. Click "Enable"

This creates a database at `https://{projectId}.firebaseio.com`

## Step 4: Configure Database Rules

1. In Realtime Database, click "Rules" tab
2. Replace with these rules (test/dev):

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".validate": "newData.hasChildren(['status', 'lastSeen'])",
        "status": {
          ".validate": "newData.isString()"
        },
        "lastSeen": {
          ".validate": "newData.isNumber()"
        },
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['type', 'downloadUrl'])",
            ".write": true,
            ".read": true
          }
        },
        ".write": false,
        ".read": true
      }
    },
    "messages": {
      "$messageId": {
        ".validate": "newData.hasChildren(['type', 'targetDevice', 'status'])",
        ".write": true,
        ".read": true
      }
    },
    ".read": false,
    ".write": false
  }
}
```

3. Click "Publish"

**Production Rules** (after initial testing):

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "status": { ".validate": "newData.isString()" },
        "lastSeen": { ".validate": "newData.isNumber()" },
        "messages": {
          "$messageId": {
            ".write": "root.child('devices').child($deviceId).child('auth_token').val() === auth.uid",
            ".read": "root.child('devices').child($deviceId).child('auth_token').val() === auth.uid"
          }
        },
        ".read": true,
        ".write": false
      }
    },
    "messages": {
      "$messageId": {
        ".write": "auth != null",
        ".read": "auth != null"
      }
    }
  }
}
```

## Step 5: Enable Cloud Storage

1. Go to "Storage" (left sidebar)
2. Click "Get Started"
3. Choose region: US (or closest)
4. Keep "Start in test mode"
5. Click "Done"

This creates a bucket at `gs://{projectId}.appspot.com`

## Step 6: Configure Storage Rules

1. In Storage, click "Rules" tab
2. Replace with these rules (test/dev):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio-messages/{deviceId}/{allPaths=**} {
      allow read, write: if true;
    }
    match /video-messages/{deviceId}/{allPaths=**} {
      allow read, write: if true;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish"

**Production Rules** (with auth):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio-messages/{deviceId}/{fileName} {
      allow read: if deviceId in request.auth.token.devices;
      allow write: if request.auth != null && request.resource.size < 512000;
    }
    match /video-messages/{deviceId}/{fileName} {
      allow read: if deviceId in request.auth.token.devices;
      allow write: if request.auth != null && request.resource.size < 2097152;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Step 7: Initialize Database Structure

Option A: Use Firebase Console

1. Go to Realtime Database
2. Click "+" next to the root to add data:

```
devices
├─ freenove-001
│  ├─ status: "offline"
│  ├─ lastSeen: 0
│  ├─ location: "kitchen"
│  └─ messages (empty object)
├─ freenove-002
│  ├─ status: "offline"
│  ├─ lastSeen: 0
│  ├─ location: "garage"
│  └─ messages (empty object)

messages (empty)
```

Option B: Use Firebase CLI

Create `firebase-init.json`:

```json
{
  "devices": {
    "freenove-001": {
      "status": "offline",
      "lastSeen": 0,
      "location": "kitchen",
      "messages": {}
    },
    "freenove-002": {
      "status": "offline",
      "lastSeen": 0,
      "location": "garage",
      "messages": {}
    }
  },
  "messages": {}
}
```

Then run:
```bash
firebase database:set / firebase-init.json --project et-phone-home
```

## Step 8: Test Connection

1. Create `frontend/test-firebase.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js"></script>
</head>
<body>
    <h1>Firebase Connection Test</h1>
    <p>Check browser console...</p>
    <script src="js/config.js"></script>
    <script>
        initializeFirebase().then(success => {
            if (success) {
                const db = getDatabase();
                db.ref('devices').once('value').then(snapshot => {
                    console.log("✓ Database connected!");
                    console.log("Devices:", snapshot.val());
                }).catch(err => {
                    console.error("✗ Database error:", err);
                });
            }
        });
    </script>
</body>
</html>
```

2. Open in browser and check console for connection status

## Step 9: Configure ESP32 to Connect

In ESP32 firmware, use these Firebase paths:

```cpp
#define FIREBASE_HOST "et-phone-home.firebaseio.com"
#define FIREBASE_AUTH "YOUR_API_KEY"

// Subscribe to device message queue
String path = "devices/freenove-001/messages";

// Update device status
String status_path = "devices/freenove-001/status";
```

## Step 10: Deploy Frontend

### Option A: GitHub Pages

1. Create repo: `YOUR_USERNAME.github.io`
2. Clone locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io
   ```
3. Copy `frontend/` contents to repo root
4. Push to GitHub:
   ```bash
   git add .
   git commit -m "Initial ET-Phone-Home frontend"
   git push origin main
   ```
5. Access at `https://YOUR_USERNAME.github.io`

### Option B: Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project
# Set public directory to ./frontend
# Don't configure as SPA
firebase deploy
```

Access at `https://et-phone-home.firebaseapp.com`

## Security Checklist

- [ ] Firebase credentials removed from client code (use `.env` for local development)
- [ ] Storage rules restrict access to authenticated users (production)
- [ ] Database rules validate data structure
- [ ] HTTPS enforced (automatic with Firebase Hosting)
- [ ] CORS properly configured for cross-origin requests
- [ ] Device authentication tokens stored securely
- [ ] API keys rotated regularly

## Troubleshooting

### "Firebase is not defined"
- Ensure Firebase CDN scripts load in correct order
- Check browser console for 404 errors on Firebase SDK

### "Permission denied" on database/storage
- Verify rules are published
- Check authentication status
- Test with relaxed rules first (test mode)

### "No devices found"
- Verify database structure matches expected paths
- Check Realtime Database rules allow reads

### Upload fails silently
- Check Storage rules allow writes
- Verify bucket path is correct
- Check browser console for errors

## Firebase Free Tier Limits

- **Storage**: 1 GB per month free, then $0.18/GB
- **Database**: 100 concurrent connections, 1 GB stored data
- **Bandwidth**: 1 GB/month included

See [Firebase Pricing](https://firebase.google.com/pricing) for details.

## Next Steps

1. Deploy frontend (GitHub Pages or Firebase Hosting)
2. Configure ESP32 firmware with Firebase credentials
3. Test message upload from frontend
4. Verify device receives message and plays it
5. Monitor delivery status in Alerts tab

## Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Cloud Storage Docs](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
