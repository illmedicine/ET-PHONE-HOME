# Firebase Architecture for ETPHONE

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                           │
│                                                                 │
│  User Records Audio/Video                                       │
│         ↓                                                       │
│  Client-Side Compression                                        │
│  (16kHz mono, <500KB audio OR 240×240, <2MB video)             │
│         ↓                                                       │
│  Split into:                                                    │
│  1. Media Blob (binary)                                         │
│  2. Metadata JSON                                               │
│         ↓                                                       │
│  Upload Media                  Signal Device                    │
│  ↓                             ↓                                │
└─────────────────────────────────────────────────────────────────┘
           │                          │
           │                          │
    ┌──────▼──────┐          ┌───────▼────────┐
    │   Firebase  │          │   Realtime DB  │
    │  Storage    │          │                │
    │             │          │  devices/      │
    │ audio-      │          │  ├─ {device}   │
    │ messages/   │          │  │  └─messages/│
    │ {device}/   │          │  │   └─{msgId} │
    │ {msgId}     │          │  │              │
    │             │          │  messages/     │
    │ video-      │          │  ├─ {msgId}    │
    │ messages/   │          │  └─ status     │
    │ {device}/   │          │                │
    │ {msgId}     │          └────┬───────────┘
    │             │                │
    └──────┬──────┘                │
           │                       │
           │ (HTTPS GET)           │ (Listener)
           │                       │
    ┌──────▼───────────────────────▼──────┐
    │        ESP32-S3 (Edge Device)       │
    │                                     │
    │ 1. Listen on: devices/{id}/messages│
    │ 2. Get downloadUrl from message    │
    │ 3. Download media from Storage     │
    │ 4. Buffer to PSRAM                 │
    │ 5. Decode + Play (I2S audio, etc) │
    │ 6. Update status in Database       │
    │ 7. Report back: "played"          │
    │                                     │
    └────────────────────────────────────┘
```

## ETPHONE Firebase Paths

### Cloud Storage Structure

```
gs://etphone-d829e.appspot.com/
│
├─ audio-messages/
│  ├─ freenove-001/
│  │  ├─ msg_1686144000000_1.webm
│  │  ├─ msg_1686144000001_2.webm
│  │  └─ ...
│  ├─ freenove-002/
│  │  └─ ...
│  └─ ...
│
├─ video-messages/
│  ├─ freenove-001/
│  │  ├─ msg_1686144000000_1.webm
│  │  ├─ msg_1686144000001_2.webm
│  │  └─ ...
│  ├─ freenove-002/
│  │  └─ ...
│  └─ ...
│
└─ metadata/
   ├─ freenove-001/
   │  └─ ... (optional metadata files)
   └─ ...
```

### Realtime Database Structure

```
https://etphone-d829e.firebaseio.com/
│
├─ devices/
│  ├─ freenove-001
│  │  ├─ status: "connected" | "offline"
│  │  ├─ lastSeen: 1686144000000
│  │  ├─ location: "kitchen"
│  │  └─ messages/
│  │     ├─ msg_1686144000000_1
│  │     │  ├─ type: "audio"
│  │     │  ├─ downloadUrl: "https://firebasestorage.googleapis.com/..."
│  │     │  ├─ metadata: { caption, fileSize, duration }
│  │     │  ├─ status: "pending"
│  │     │  └─ queuedAt: 1686144000000
│  │     ├─ msg_1686144000001_2
│  │     │  └─ ...
│  │     └─ ...
│  │
│  ├─ freenove-002
│  │  ├─ status: "offline"
│  │  ├─ lastSeen: 1686143990000
│  │  ├─ location: "garage"
│  │  └─ messages/
│  │     └─ ...
│  │
│  └─ ...
│
└─ messages/
   ├─ msg_1686144000000_1
   │  ├─ id: "msg_1686144000000_1"
   │  ├─ type: "audio"
   │  ├─ targetDevice: "freenove-001"
   │  ├─ caption: "Time to go outside!"
   │  ├─ status: "uploaded" | "acknowledged" | "played"
   │  ├─ downloadUrl: "https://firebasestorage.googleapis.com/..."
   │  ├─ fileSize: 45230
   │  ├─ uploadedAt: "2023-06-07T14:00:00Z"
   │  ├─ acknowledgedAt: "2023-06-07T14:00:02Z"
   │  ├─ playedAt: "2023-06-07T14:00:05Z"
   │  └─ metadata: { ... }
   │
   ├─ msg_1686144000001_2
   │  └─ ...
   │
   └─ ...
```

## Message Flow - Sequence Diagram

```
Frontend                 Firebase              ESP32-S3
   │                       │                       │
   │ 1. Record Audio       │                       │
   │◄──────────────────────┤                       │
   │                       │                       │
   │ 2. Compress           │                       │
   │◄──────────────────────┤                       │
   │                       │                       │
   │ 3. Upload Media ──────►                       │
   │    (Blob)             │ Store in Storage      │
   │                       │ (audio-messages/...)  │
   │                       │                       │
   │ 4. Get Download URL   │                       │
   │◄──────────────────────┤                       │
   │                       │                       │
   │ 5. Write Message ────►                       │
   │    (Metadata JSON)    │ Store in Database     │
   │                       │ (messages/...)        │
   │                       │                       │
   │ 6. Signal Device ────►                       │
   │                       │ Write to Device       │
   │                       │ Queue                 │
   │                       │ (devices/{id}/...)    │
   │                       │                       ◄── 7. Listener Trigger
   │                       │                       │
   │                       │◄────────────────────── 8. Download Media
   │                       │ (HTTPS GET)           │
   │                       │                       │
   │                       │◄────────────────────── 9. Buffer to PSRAM
   │                       │                       │
   │                       │                       ► 10. Decode & Play
   │                       │                       │    (I2S speaker)
   │                       │                       │
   │◄─────────────────────────────────────────── 11. Update Status
   │    (Listener: "played")                      │
   │                       │                       │
   │ 12. Show Delivered ───┤                       │
   │    in Alerts          │                       │
   │                       │                       │
```

## Data Type Specifications

### Audio Message Structure

**Uploaded to Storage as:** `audio-messages/{deviceId}/msg_{timestamp}_{id}.webm`

**Size:** 30-500 KB (compressed)

**Format:** WebM (VP8/VP9) or WAV PCM

**Sample Rate:** 16,000 Hz (16 kHz)

**Channels:** 1 (Mono)

**Bit Depth:** 16-bit

**Metadata in Database:**
```json
{
  "id": "msg_1686144000000_1",
  "type": "audio",
  "targetDevice": "freenove-001",
  "caption": "Time to go outside!",
  "downloadUrl": "https://firebasestorage.googleapis.com/v0/b/etphone-d829e.appspot.com/...",
  "fileSize": 45230,
  "duration": 3.5,
  "status": "uploaded",
  "uploadedAt": "2023-06-07T14:00:00.000Z"
}
```

### Video Message Structure

**Uploaded to Storage as:** `video-messages/{deviceId}/msg_{timestamp}_{id}.webm`

**Size:** 200-2000 KB (compressed)

**Format:** WebM (VP8/VP9)

**Resolution:** 240×240 or 320×240

**Frame Rate:** 15 FPS

**Bitrate:** 300-500 kbps

**Metadata in Database:**
```json
{
  "id": "msg_1686144000001_2",
  "type": "video",
  "targetDevice": "freenove-001",
  "caption": "Package delivered! Check front door.",
  "downloadUrl": "https://firebasestorage.googleapis.com/v0/b/etphone-d829e.appspot.com/...",
  "fileSize": 185340,
  "duration": 8.2,
  "status": "uploaded",
  "uploadedAt": "2023-06-07T14:05:00.000Z"
}
```

## Firebase Rules Summary

### Database Rules (Validation)

| Path | Read | Write | Notes |
|------|------|-------|-------|
| `devices/{id}/status` | ✅ Anyone | ❌ No | Device status only from ESP32 |
| `devices/{id}/messages/` | ✅ Anyone | ✅ Anyone | Frontend writes, ESP32 reads |
| `messages/{id}` | ✅ Anyone | ✅ Anyone | Frontend writes, listeners read |
| Root (`/`) | ❌ | ❌ | Deny by default |

### Storage Rules

| Path | Read | Write | Size Limit |
|------|------|-------|------------|
| `audio-messages/{id}/**` | ✅ | ✅ | 500 KB |
| `video-messages/{id}/**` | ✅ | ✅ | 2 MB |
| `metadata/{id}/**` | ✅ | ✅ | 10 KB |
| Others | ❌ | ❌ | Denied |

## Network Bandwidth Estimates

| Operation | Size | Time | Bandwidth |
|-----------|------|------|-----------|
| Upload 5s audio | 50 KB | 0.5s | 100 KB/s |
| Upload 10s video | 500 KB | 2s | 250 KB/s |
| Download audio | 50 KB | 0.5s | 100 KB/s |
| Download video | 500 KB | 2s | 250 KB/s |
| Metadata update | 2 KB | 0.1s | 20 KB/s |

**Total end-to-end latency (upload to playback start):**
- Audio: ~3-8 seconds
- Video: ~5-15 seconds

## Firebase Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| **Storage** | 1 GB/month | $0.18/GB over limit |
| **Database** | 100 concurrent | ~1 GB stored data |
| **Downloads** | 1 GB/month | Then $0.12/GB |
| **Operations** | Unlimited | (limited by concurrent conns) |

**Estimated monthly usage (50 messages/day):**
- Storage: 50 files × 100 KB = 5 MB (✅ well under 1 GB limit)
- Database: 50 messages × 2 KB = 100 KB (✅ well under limit)
- Downloads: Same as storage (✅ under limit)
- **Total cost: $0 (free tier covers it!)**

## Configuration Reference

```javascript
// Firebase Realtime Database
Database URL: https://etphone-d829e.firebaseio.com
Project ID: etphone-d829e
Region: us-central1

// Firebase Cloud Storage
Bucket: gs://etphone-d829e.appspot.com
Region: us-central1

// Authentication
Project Number: 127946177550
Auth Domain: etphone-d829e.firebaseapp.com
```

---

**Now ready to configure!** → [FIREBASE_CONFIG_SUMMARY.md](FIREBASE_CONFIG_SUMMARY.md)
