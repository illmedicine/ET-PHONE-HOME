# ET-Phone-Home: Asynchronous Media Paging System

A decoupled, one-way audio/video messenger for home automation and edge telemetry. Send asychronous audio/video commands to your dogs, display delivery alerts at your workstation, and stream real-time telemetry from IoT edge devices.

```
┌─────────────────────────────────────────────────────────────────────┐
│         Static GitHub Pages Frontend (HTML/JS/CSS)                  │
│  - Record audio/video messages                                      │
│  - Compress and validate payloads                                   │
│  - Upload to Firebase Storage                                       │
│  - Signal ESP32-S3 via Firebase Realtime DB                         │
│  - Monitor delivery status in real-time                             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
      ┌────▼────────┐      ┌──────▼─────┐
      │   Firebase  │      │   Firebase  │
      │   Storage   │      │  Realtime DB│
      │ (media blobs)      │ (signaling) │
      └────┬────────┘      └──────┬─────┘
           │                      │
           └───────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │  ESP32-S3 WROOM     │
            │ (Freenove Kit)      │
            │                     │
            │ • WiFi: Rx messages │
            │ • PSRAM: Buffer mgmt│
            │ • I2S: Audio playback
            │ • Display: Video    │
            │ • Telemetry: Send   │
            └─────────────────────┘
```

## Key Features

### 🎙️ Audio Messaging
- Record voice announcements (mono, 16-22.05kHz)
- Client-side compression (<500KB target)
- Lossless WAV or lossy WebM/Opus
- Instant delivery to paired devices

### 🎥 Video Messaging
- Capture video clips (240×240 or 320×240 resolution)
- Aggressive compression for constrained networks
- Metadata-driven captions (decoupled from video)
- <2MB payload size

### 🏠 Home Automation Ready
- Command-based architecture for routine maintenance
- Multiple device targeting
- Asynchronous non-blocking delivery
- Persistent queue-based playback

### ⚡ Edge-Optimized Hardware
- **Microcontroller**: ESP32-S3 WROOM (dual-core, 8MB PSRAM)
- **Memory**: Enforced PSRAM usage for media buffers (no internal SRAM fragmentation)
- **Connectivity**: Native WiFi 6 GHz bands
- **Audio**: Integrated I2S amplifier
- **Display**: Native support for $240 \times 240$ or $320 \times 240$ screens

### 🔒 Secure & Decoupled
- No server-side processing overhead
- GitHub Pages static frontend (CDN-distributed)
- Firebase as serverless backend
- Per-device message queues
- Status tracking and delivery confirmation

## Architecture Decisions

### 1. Frontend Layer (Static)
- **Platform**: GitHub Pages (`username.github.io`) or Firebase Hosting
- **Technology**: HTML5 + Vanilla JavaScript + CSS3
- **No backend compute**: Reduces latency and cost
- **Media compression**: All optimization happens client-side

### 2. Backend Layer (Serverless)
- **Platform**: Google Firebase
- **Storage**: Cloud Storage for media payloads
- **Signaling**: Realtime Database for device messaging
- **Authentication**: Firebase Security Rules
- **Scalability**: Automatic, pays only for what you use

### 3. Edge Hardware Layer (Optimized)
- **Microcontroller**: ESP32-S3 WROOM (Freenove Kit)
- **Development**: PlatformIO + Arduino framework
- **Memory**: 8MB external PSRAM for buffered playback
- **Constraints**:
  - No `malloc()` for media (use `ps_malloc()` only)
  - Hard-coded resolution support
  - Rate-limited playback to protect WiFi/RTOS
  - Chunked download with progressive playback

## Project Structure

```
ET-PHONE-HOME/
├── frontend/                 # Static GitHub Pages UI
│   ├── index.html           # Main interface
│   ├── css/style.css        # Dark theme styling
│   ├── js/
│   │   ├── config.js        # Firebase configuration (YOUR CONFIG)
│   │   ├── media.js         # Audio/video recording & compression
│   │   ├── uploader.js      # Firebase upload & signaling
│   │   └── app.js           # UI orchestration
│   ├── README.md            # Frontend documentation
│   ├── QUICK_START.md       # 5-minute setup guide
│   ├── FIREBASE_SETUP.md    # Firebase configuration guide
│   └── .gitignore           # Prevent credential commits
│
├── firmware/                 # ESP32-S3 PlatformIO project
│   ├── platformio.ini       # Build configuration
│   ├── src/
│   │   ├── main.cpp         # Entry point & RTOS tasks
│   │   ├── wifi.cpp         # WiFi setup
│   │   ├── firebase.cpp     # Firebase client
│   │   ├── media.cpp        # Audio/video playback
│   │   └── ...
│   ├── lib/                 # Dependencies
│   ├── README.md            # Firmware documentation
│   └── SETUP.md             # Hardware & environment setup
│
├── docs/                     # Architecture & design docs
│   ├── ARCHITECTURE.md      # System design details
│   ├── CONSTRAINTS.md       # Hardware/network limitations
│   ├── PROTOCOL.md          # Message format specification
│   └── API.md               # Device API reference
│
├── .gitignore              # Root .gitignore
└── README.md               # This file
```

## Getting Started

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/ET-PHONE-HOME
cd ET-PHONE-HOME

# 2. Setup Firebase (see frontend/FIREBASE_SETUP.md)
# - Create Firebase project
# - Get credentials
# - Configure database & storage

# 3. Configure frontend
cd frontend
cp js/config.template.js js/config.js
# Edit js/config.js with Firebase credentials

# 4. Test locally
python -m http.server 8000
# Open: http://localhost:8000

# 5. Deploy to GitHub Pages
# (See frontend/QUICK_START.md)
```

### Step-by-Step Guides

1. **[Frontend Setup](frontend/README.md)** — Deploy the web UI
2. **[Firebase Configuration](frontend/FIREBASE_SETUP.md)** — Setup backend services
3. **[ESP32 Firmware](firmware/README.md)** — Build and flash microcontroller
4. **[Hardware Assembly](firmware/SETUP.md)** — Wire the Freenove Kit

## Media Specifications

### Audio Constraints

| Specification | Value | Reason |
|---------------|-------|--------|
| **Sample Rate** | 16 kHz or 22.05 kHz | Human speech intelligibility |
| **Channels** | Mono | Reduce bandwidth |
| **Bit Depth** | 16-bit | PCM standard |
| **Encoding** | WAV (PCM) or WebM (Opus) | Hardware compatibility |
| **Max File Size** | 500 KB | PSRAM buffer constraint |
| **Typical Duration** | 10-30 seconds | Enough for voice commands |

### Video Constraints

| Specification | Value | Reason |
|---------------|-------|--------|
| **Resolution** | 240×240 or 320×240 | Display size limit |
| **Frame Rate** | 15 FPS | WiFi bandwidth limit |
| **Codec** | WebM (VP8/VP9) | Hardware decode support |
| **Bitrate** | 300-500 kbps | Balance quality/bandwidth |
| **Max File Size** | 2 MB | PSRAM buffer constraint |
| **Typical Duration** | 5-15 seconds | Delivery alert videos |

### Metadata (JSON)

Captions and context are decoupled from media:

```json
{
  "id": "msg_1686144000000_1",
  "type": "audio",
  "targetDevice": "freenove-001",
  "caption": "Time to go outside!",
  "fileSize": 45230,
  "duration": 3.5,
  "timestamp": "2023-06-07T14:00:00Z",
  "status": "uploaded"
}
```

## Network & Latency

### Expected Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| Audio compression | 2-5s | Client-side, depends on device CPU |
| Audio upload | 3-10s | 500KB at typical WiFi speed |
| Device notification | 1-5s | Firebase Realtime DB propagation |
| Audio playback start | 0.5-2s | Download + buffer init |
| Total E2E latency | **~10-30 seconds** | From recording to playback |

### Bandwidth Estimates

- **Audio message**: 50-100 kB (3-5 second clip)
- **Video message**: 300-800 kB (5-10 second clip)
- **Metadata overhead**: <1 kB per message
- **Device polling**: ~1 kB per query

## Security & Privacy

### Data Flow

1. **Frontend**: Compress media, upload to Storage with metadata
2. **Storage**: Media blobs stored in Firebase Cloud Storage
3. **Database**: Lightweight JSON messages in Realtime Database
4. **Device**: ESP32 downloads media via HTTPS, buffers in PSRAM, plays

### Security Measures

- ✅ **HTTPS enforced** — All Firebase API calls encrypted
- ✅ **Storage rules** — Device-ID scoped access
- ✅ **Database rules** — Message validation & rate limiting
- ✅ **No cloud compute** — No server-side code execution
- ⚠️ **Test mode initially** — Relax rules during development
- 🔒 **Production rules** — Require authentication before deployment

See [Firebase Security Rules](frontend/FIREBASE_SETUP.md#firebase-security-rules) for details.

## Hardware Requirements

### Frontend
- **PC/Laptop**: Any device with a modern web browser
- **Microphone**: USB or integrated (for audio)
- **Camera**: USB or integrated (for video)
- **Internet**: Broadband connection (>1 Mbps)

### Firmware
- **Microcontroller**: ESP32-S3 WROOM
- **Development Board**: [Freenove ESP32-S3 Kit](https://www.aliexpress.com/item/1005006159042236.html)
- **Development Environment**: VS Code + PlatformIO
- **Programming Interface**: USB-C

### Deployment
- **Hosting**: GitHub Pages (free) or Firebase Hosting (free tier)
- **Backend**: Firebase (free tier covers small deployments)
- **WiFi**: Standard 2.4/5 GHz (802.11 b/g/n/ac)

## Cost Estimate (Monthly)

| Component | Free Tier | Notes |
|-----------|-----------|-------|
| **Frontend** | $0 | GitHub Pages or Firebase Hosting free tier |
| **Storage** | 1 GB free | ~$0.18/GB beyond quota |
| **Database** | 100 concurrent | $1/GB if exceeded |
| **Total for small deployments** | **$0** | Stays within free tier |

See [Firebase Pricing](https://firebase.google.com/pricing) for details.

## Roadmap

### Phase 1: Core (Current)
- [x] Static frontend with media capture
- [x] Firebase backend setup
- [ ] ESP32 firmware with playback
- [ ] End-to-end testing

### Phase 2: Enhanced UX
- [ ] Device discovery & pairing
- [ ] Scheduled message delivery
- [ ] Message templates (pre-recorded clips)
- [ ] Batch upload support

### Phase 3: Advanced
- [ ] Text-to-speech conversion
- [ ] Real-time telemetry streaming
- [ ] Multi-zone audio playback
- [ ] ML-based message optimization

### Phase 4: Production
- [ ] Role-based access control (RBAC)
- [ ] Message encryption
- [ ] Analytics & metrics
- [ ] Mobile app (iOS/Android)

## Development

### Prerequisites

- Git
- Node.js 16+ (for build tools, optional)
- Python 3.8+ (for local testing)
- Arduino IDE or VS Code + PlatformIO (for firmware)

### Local Development

```bash
# Frontend
cd frontend
python -m http.server 8000
# Open http://localhost:8000

# Firmware (see firmware/README.md)
cd ../firmware
platformio run --target upload --upload-port /dev/ttyUSB0
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Firebase not initialized" | Copy `config.template.js` to `config.js` and fill in credentials |
| "No devices found" | Create test devices in Firebase Realtime Database |
| "Upload fails with CORS error" | Check Firebase Storage rules allow your domain |
| "ESP32 not receiving messages" | Verify WiFi connection and Firebase credentials on device |

### Debug Mode

Enable verbose logging in browser console:
```javascript
localStorage.debug = '*';
window.location.reload();
```

## Documentation

- **[Architecture Details](docs/ARCHITECTURE.md)** — System design and decision rationale
- **[Protocol Specification](docs/PROTOCOL.md)** — Message format and device API
- **[Frontend Guide](frontend/README.md)** — Web UI setup and usage
- **[Firmware Guide](firmware/README.md)** — ESP32 code and hardware setup
- **[Firebase Setup](frontend/FIREBASE_SETUP.md)** — Cloud backend configuration

## License

MIT License - See LICENSE file for details

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/ET-PHONE-HOME/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/ET-PHONE-HOME/discussions)
- **Wiki**: [Project Wiki](https://github.com/YOUR_USERNAME/ET-PHONE-HOME/wiki)

## Acknowledgments

- **Freenove ESP32-S3 Kit** — Hardware foundation
- **Firebase** — Backend services
- **GitHub Pages** — Frontend hosting
- **Arduino Community** — Firmware libraries and support

---

**Ready to get started?** Begin with [Frontend Setup](frontend/README.md) or [Quick Start Guide](frontend/QUICK_START.md).
