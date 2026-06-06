# Firebase Setup Quick Reference - ETPHONE

**Project:** ETPHONE | **ID:** etphone-d829e | **Region:** us-central1

## Pre-filled Values in config.js ✅

```javascript
authDomain: "etphone-d829e.firebaseapp.com"
projectId: "etphone-d829e"
storageBucket: "etphone-d829e.appspot.com"
databaseURL: "https://etphone-d829e.firebaseio.com"
messagingSenderId: "127946177550"
```

## TODO: Get These 2 Values from Firebase Console

| Value | Where | Copy To |
|-------|-------|---------|
| **Web API Key** | Console → Settings → Web API Key | `apiKey: "AIzaSy..."` |
| **Web App ID** | Console → Your apps → App ID | `appId: "1:127946177550:web:..."` |

Once filled in, your config.js is complete! ✅

## Firebase Setup Checklist

```
Step 1: [ ] Get API Key & App ID from Firebase Console
Step 2: [ ] Paste into frontend/js/config.js
Step 3: [ ] Go to Realtime Database
         [ ] Create Database
         [ ] Region: us-central1
         [ ] Mode: Test mode
Step 4: [ ] Copy Database Rules from FIREBASE_SETUP_ETPHONE.md
         [ ] Paste into Database → Rules tab
         [ ] Click Publish
Step 5: [ ] Create database structure:
         [ ] Add "devices" folder
         [ ] Add "messages" folder
Step 6: [ ] Go to Cloud Storage
         [ ] Create Storage bucket
         [ ] Region: us-central1
         [ ] Mode: Test mode
Step 7: [ ] Copy Storage Rules from FIREBASE_SETUP_ETPHONE.md
         [ ] Paste into Storage → Rules tab
         [ ] Click Publish
Step 8: [ ] Test from frontend:
         [ ] Open http://localhost:8000
         [ ] Try uploading audio message
         [ ] Check Firebase Console for file & message entry
Step 9: [ ] Deploy frontend:
         [ ] GitHub Pages (recommended)
         [ ] OR Firebase Hosting
Step 10:[ ] Done! Ready for ESP32 firmware
```

## Copy-Paste Blocks

### Database Rules
Go to: **Realtime Database → Rules**
Click "Edit rules" → Replace ALL → Paste this:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "status": { ".validate": "newData.isString()" },
        "lastSeen": { ".validate": "newData.isNumber()" },
        "location": { ".validate": "newData.isString()" },
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
        "id": { ".validate": "newData.isString()" },
        "type": { ".validate": "newData.isString() && (newData.val() === 'audio' || newData.val() === 'video')" },
        "targetDevice": { ".validate": "newData.isString()" },
        "status": { ".validate": "newData.isString()" },
        "downloadUrl": { ".validate": "newData.isString()" },
        "uploadedAt": { ".validate": "newData.isString()" },
        "metadata": { ".validate": "newData.hasChildren(['fileSize'])" },
        ".write": true,
        ".read": true
      }
    },
    ".read": false,
    ".write": false
  }
}
```

### Storage Rules
Go to: **Storage → Rules**
Click "Edit rules" → Replace ALL → Paste this:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio-messages/{deviceId}/{messageId} {
      allow read: if true;
      allow write: if request.resource.size < 512000;
    }
    match /video-messages/{deviceId}/{messageId} {
      allow read: if true;
      allow write: if request.resource.size < 2097152;
    }
    match /metadata/{deviceId}/{messageId} {
      allow read, write: if true;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Test Devices (Optional)

Create these in **Realtime Database** under `devices/`:

```
freenove-001
├─ status: "offline"
├─ lastSeen: 0
├─ location: "kitchen"
└─ messages: {}

freenove-002
├─ status: "offline"
├─ lastSeen: 0
├─ location: "garage"
└─ messages: {}
```

## Quick Test

1. Open frontend: `http://localhost:8000`
2. Record audio (2 sec)
3. Enter device: `freenove-001`
4. Click Upload
5. Check Firebase Console:
   - **Storage** → audio-messages/freenove-001/msg_*.webm (file exists?)
   - **Database** → devices/freenove-001/messages/ (message entry exists?)
   - **Database** → messages/msg_*/ (status: "uploaded"?)

## Firebase Console Shortcuts

| Task | Link |
|------|------|
| Project Overview | https://console.firebase.google.com/project/etphone-d829e |
| Realtime Database | https://console.firebase.google.com/project/etphone-d829e/database/etphone-d829e |
| Storage | https://console.firebase.google.com/project/etphone-d829e/storage/buckets |
| Project Settings | https://console.firebase.google.com/project/etphone-d829e/settings/general |

## Credentials Reference

```
Project Name: ETPHONE
Project ID: etphone-d829e
Project Number: 127946177550
Database URL: https://etphone-d829e.firebaseio.com
Storage Bucket: gs://etphone-d829e.appspot.com
Auth Domain: etphone-d829e.firebaseapp.com
```

---

**Done?** Next: [Build ESP32 Firmware](../firmware/README.md)
