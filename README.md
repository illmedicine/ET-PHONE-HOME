# ET-Phone-Home Frontend

Static GitHub Pages frontend for the asynchronous media paging system. Enables users to capture, compress, and upload audio/video messages to paired ESP32-S3 devices.

## Features

- **Audio Recording**: Capture mono voice messages (16-22.05kHz, <500KB)
- **Video Recording**: Capture video clips (240×240 or 320×240, <2MB, high compression)
- **Client-Side Compression**: All media optimized before upload to ensure deterministic delivery
- **Firebase Integration**: 
  - Storage for media payloads
  - Realtime Database for device signaling
  - Real-time delivery status tracking
- **Device Discovery**: List and target available ESP32 devices
- **Captions**: Add text overlays/metadata to messages

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Pages (Static HTML/JS/CSS)                          │
│  ├─ index.html         (UI structure)                       │
│  ├─ css/style.css      (Dark theme styling)                 │
│  └─ js/                                                     │
│     ├─ config.js       (Firebase configuration)             │
│     ├─ media.js        (Audio/video capture & compression)  │
│     ├─ uploader.js     (Firebase Storage & signaling)       │
│     └─ app.js          (Main orchestration)                 │
└─────────────────────────────────────────────────────────────┘
         │
         │ (HTTPS)
         ├──→ Firebase Storage (media upload)
         └──→ Firebase Realtime DB (device signaling)
              │
              └──→ ESP32-S3 (monitors queue, downloads, plays)
```

## Setup

### 1. Configure Firebase

Edit `js/config.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Get these values from [Firebase Console](https://console.firebase.google.com/).

### 2. Firebase Database Structure

The frontend expects the following Realtime Database structure:

```
devices/
  ├─ {deviceId}/
  │  ├─ status: "connected" | "offline"
  │  ├─ lastSeen: timestamp
  │  └─ messages/
  │     └─ {messageId}: { type, downloadUrl, metadata, status }
  └─ {deviceId}/...

messages/
  ├─ {messageId}/
  │  ├─ type: "audio" | "video"
  │  ├─ targetDevice: "{deviceId}"
  │  ├─ status: "pending" | "uploaded" | "acknowledged" | "played"
  │  ├─ downloadUrl: "..."
  │  ├─ uploadedAt: timestamp
  │  └─ metadata: { caption, fileSize, duration }
  └─ {messageId}/...
```

### 3. Firebase Storage Structure

Media files are organized by type and device:

```
gs://YOUR_PROJECT.appspot.com/
├─ audio-messages/
│  └─ {deviceId}/
│     └─ msg_{timestamp}_{id}.webm
└─ video-messages/
   └─ {deviceId}/
      └─ msg_{timestamp}_{id}.webm
```

### 4. Deploy to GitHub Pages

Create a GitHub repository and configure GitHub Pages:

1. Create repo: `YOUR_USERNAME.github.io`
2. Place this frontend in the repo root
3. GitHub Pages automatically serves from `https://YOUR_USERNAME.github.io`

Alternative: Deploy to any static hosting (Firebase Hosting, Netlify, Vercel, etc.)

## Media Constraints

### Audio

- **Sample Rate**: 16 kHz or 22.05 kHz
- **Channels**: Mono only
- **Codec**: WebM (Opus) or WAV
- **Max Size**: 500 KB
- **Use Case**: Voice announcements, commands for dogs/home automation

### Video

- **Resolution**: 240×240 or 320×240
- **Frame Rate**: 15 FPS
- **Codec**: WebM (VP8/VP9)
- **Max Size**: 2 MB
- **Compression**: Aggressive encoding to stay within limits
- **Use Case**: Visual alerts, package delivery notifications, live feeds

## Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 14.1+
- Edge 79+

Required APIs:
- MediaRecorder API
- getUserMedia (WebRTC)
- Web Audio API
- Fetch API
- IndexedDB (for local caching)

## Firebase Security Rules

### Realtime Database

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        "messages": {
          ".write": true,
          ".read": true
        },
        ".write": false,
        ".read": true
      }
    },
    "messages": {
      "$messageId": {
        ".write": true,
        ".read": true
      }
    }
  }
}
```

### Storage

```json
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## Development

### Local Testing

Serve locally with Python:
```bash
python -m http.server 8000
```

Access at: `http://localhost:8000`

### Code Structure

- **config.js**: Firebase initialization and constants
- **media.js**: MediaCapture class for audio/video handling
- **uploader.js**: MediaUploader class for Firebase operations
- **app.js**: UI orchestration and event handling

### Key Classes

**MediaCapture**
- `initAudioRecording()` - Setup audio stream
- `startAudioRecording()` - Begin capture
- `stopAudioRecording()` - End capture
- `getAudioBlob()` - Retrieve and validate audio
- `convertAudioToPCM()` - Convert to PCM for ESP32
- Similar methods for video

**MediaUploader**
- `uploadAudio()` - Upload audio to Storage + signal device
- `uploadVideo()` - Upload video to Storage + signal device
- `signalDevice()` - Write to device message queue
- `validateDevice()` - Check if device is connected
- `getAvailableDevices()` - List all registered devices

## Troubleshooting

### "Firebase not initialized"
- Check that Firebase config in `js/config.js` is correct
- Verify Firebase project is created and enabled
- Check browser console for Firebase error messages

### "No audio/video devices found"
- Ensure browser has permission to access microphone/camera
- Check browser console for permission errors
- Try different browser or clear browser permissions

### Upload fails with CORS error
- Verify Firebase Storage bucket is publicly readable
- Check CORS rules in Firebase Console

### Device not receiving messages
- Verify ESP32 is connected to WiFi
- Check `devices/{deviceId}/status` in Firebase Console
- Ensure device is listening to correct message queue path

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [GitHub Pages](https://pages.github.com/)

## License

Part of ET-Phone-Home project. See root LICENSE file.
