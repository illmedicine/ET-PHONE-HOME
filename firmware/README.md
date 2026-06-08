# ET-Phone-Home Firmware

PlatformIO project for the Freenove ESP32-S3 WROOM Kit with 1.28" round LCD.

## Features

- **Boot Logo**: ET-Phone-Home logo displayed on boot, fitted to the 240x240 GC9A01 LCD
- **WiFi Setup**: On first boot (or if credentials are forgotten), the device creates an AP `ET-Phone-Home-Setup`. Connect to it and open `192.168.4.1` to scan networks and enter your home WiFi password.
- **Auto-Connect**: Credentials are saved in ESP32 NVS (Preferences). On every reboot or wake, the device automatically reconnects.
- **Firebase Registration**: Once online, the device registers itself in Firebase Realtime Database under `/devices/{deviceId}` with `status: online` and a heartbeat `lastSeen`.
- **Target Device Visibility**: The web interface (`https://illmedicine.github.io/ET-PHONE-HOME/`) can target this device by its ID (default: `freenove-001`).
- **Message Polling**: The firmware polls Firebase for new messages, shows a notification on screen, and acks delivery.

## Hardware

- **Board**: Freenove ESP32-S3 WROOM
- **Display**: 1.28" round LCD (GC9A01 driver, 240x240)
- **Typical pinout**:
  - MOSI  -> GPIO 11
  - SCLK  -> GPIO 12
  - CS    -> GPIO 10
  - DC    -> GPIO 8
  - RST   -> GPIO 14
  - BL    -> GPIO 9

## Build & Flash

1. Install [PlatformIO Core](https://platformio.org/install/cli) (or VS Code + PlatformIO extension).
2. Open a terminal in this `firmware/` directory.
3. Build:
   ```bash
   pio run
   ```
4. Upload to board (auto-detects COM port on Windows):
   ```bash
   pio run --target upload
   ```
5. Monitor serial output:
   ```bash
   pio device monitor
   ```

## Convert Logo

If you update `frontend/assets/logo.png`, regenerate the C header:

```bash
python tools/convert_logo.py
```

This writes `src/logo.h` as a 240x240 RGB565 bitmap.

## WiFi Setup Flow

1. **First boot**: Logo appears for 3 seconds, then device scans for saved credentials.
2. **No credentials found**: Screen shows AP info (`ET-Phone-Home-Setup`).
3. **On your phone/laptop**: Connect to `ET-Phone-Home-Setup`, open browser to `192.168.4.1`.
4. **Select your home WiFi** from the list, enter password, click Connect.
5. **Device restarts** automatically, connects to your home WiFi, and shows its IP.
6. **Subsequent boots**: Auto-connects instantly using saved credentials.

## Changing Device ID

Edit `src/main.cpp`:

```cpp
static const char* DEVICE_ID = "freenove-001";
```

Each physical device should have a unique ID so the web interface can target it individually.

## Firebase Paths

The firmware expects this RTDB structure (created automatically on first contact):

```json
{
  "devices": {
    "freenove-001": {
      "status": "online",
      "lastSeen": 1234567890,
      "ip": "192.168.1.42",
      "messages": {
        "-pushId1": {
          "type": "audio",
          "caption": "Hey!",
          "downloadUrl": "...",
          "status": "pending"
        }
      }
    }
  }
}
```

## Troubleshooting

| Problem | Solution |
|---|---|
| Display stays black | Check USB-C power and that TFT_BL (GPIO 9) is driven (PWM or HIGH) |
| Cannot find AP | Ensure you are within range; the AP uses 2.4 GHz only |
| Firebase not registering | Verify API key in `main.cpp` matches your Firebase project |
| "Compilation terminated" | Run `pio run` again; first build downloads toolchains |
