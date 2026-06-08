/**
 * ET-Phone-Home Firmware
 * Freenove ESP32-S3 with GC9A01 240x240 Round LCD
 *
 * Boot sequence:
 *  1. Show logo
 *  2. Load saved WiFi credentials from Preferences (NVS)
 *  3. Try auto-connect; if none saved or fails -> AP mode
 *  4. On WiFi connect -> register device in Firebase RTDB
 *  5. Poll for messages, update heartbeat
 */

#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "firebase_client.h"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
static const char* DEVICE_ID = "freenove-001";   // Change per device
static const char* FIREBASE_HOST = "https://etphone-d829e.firebaseio.com";
static const char* FIREBASE_API_KEY = "AIzaSyBjrCgXfr_csV72_fxGW98xv-brJrgZxPU";

static const unsigned long LOGO_DISPLAY_MS = 3000;
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
static const unsigned long MESSAGE_POLL_INTERVAL_MS = 5000;

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
Display display;
WiFiManager wifiManager;
FirebaseClient firebaseClient(FIREBASE_HOST, FIREBASE_API_KEY);

enum class AppState {
    BOOT_LOGO,
    WIFI_SETUP,
    WIFI_CONNECTING,
    ONLINE,
    AP_MODE,
    ERROR
};

AppState appState = AppState::BOOT_LOGO;
unsigned long stateTimer = 0;
unsigned long lastPoll = 0;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[ET-Phone-Home] Booting...");

    display.init();
    display.showLogo();
    stateTimer = millis();

    wifiManager.begin();
    firebaseClient.setDeviceId(DEVICE_ID);
}

// ---------------------------------------------------------------------------
// State machine helpers
// ---------------------------------------------------------------------------
void transitionTo(AppState next) {
    appState = next;
    stateTimer = millis();
}

void handleBootLogo() {
    if (millis() - stateTimer >= LOGO_DISPLAY_MS) {
        Serial.println("[State] BOOT -> WIFI_SETUP");
        transitionTo(AppState::WIFI_SETUP);
    }
}

void handleWiFiSetup() {
    // WiFiManager::begin() already triggered connection or AP
    WiFiState ws = wifiManager.getState();

    if (ws == WiFiState::CONNECTED) {
        Serial.println("[State] WIFI_SETUP -> ONLINE");
        display.showWiFiConnected(wifiManager.getSSID().c_str(), wifiManager.getIP().c_str());
        delay(1500);
        transitionTo(AppState::ONLINE);
        return;
    }

    if (ws == WiFiState::AP_MODE) {
        Serial.println("[State] WIFI_SETUP -> AP_MODE");
        display.showWiFiAPMode("ET-Phone-Home-Setup", wifiManager.getIP().c_str());
        transitionTo(AppState::AP_MODE);
        return;
    }

    if (ws == WiFiState::CONNECTING) {
        display.showWiFiConnecting(wifiManager.getSSID().c_str());
        transitionTo(AppState::WIFI_CONNECTING);
        return;
    }

    // If somehow still disconnected, keep showing scanning
    display.showWiFiScanning();
}

void handleWiFiConnecting() {
    WiFiState ws = wifiManager.getState();

    if (ws == WiFiState::CONNECTED) {
        Serial.println("[State] WIFI_CONNECTING -> ONLINE");
        display.showWiFiConnected(wifiManager.getSSID().c_str(), wifiManager.getIP().c_str());
        delay(1500);
        transitionTo(AppState::ONLINE);
        return;
    }

    if (ws == WiFiState::DISCONNECTED || ws == WiFiState::AP_MODE) {
        // Connection failed or timed out -> AP mode
        Serial.println("[State] WIFI_CONNECTING -> AP_MODE (connection failed)");
        wifiManager.startAPMode();
        display.showWiFiAPMode("ET-Phone-Home-Setup", wifiManager.getIP().c_str());
        transitionTo(AppState::AP_MODE);
        return;
    }

    // Still connecting; timeout guard
    if (millis() - stateTimer > WIFI_CONNECT_TIMEOUT_MS) {
        Serial.println("[WiFi] Connection timeout, entering AP mode");
        wifiManager.startAPMode();
        display.showWiFiAPMode("ET-Phone-Home-Setup", wifiManager.getIP().c_str());
        transitionTo(AppState::AP_MODE);
    }
}

void handleAPMode() {
    wifiManager.loop(); // Serve captive portal
    // No exit until user submits credentials and device reboots
}

void handleOnline() {
    wifiManager.loop();

    if (!wifiManager.isConnected()) {
        Serial.println("[State] ONLINE -> WIFI_SETUP (lost connection)");
        transitionTo(AppState::WIFI_SETUP);
        return;
    }

    // Heartbeat / device registration
    if (!firebaseClient.sendHeartbeat()) {
        Serial.println("[Firebase] Heartbeat failed");
    }

    // Show device status on screen
    static unsigned long lastScreenUpdate = 0;
    if (millis() - lastScreenUpdate > 5000) {
        lastScreenUpdate = millis();
        display.showDeviceStatus(DEVICE_ID, true);
    }

    // Poll messages
    if (millis() - lastPoll > MESSAGE_POLL_INTERVAL_MS) {
        lastPoll = millis();
        DeviceMessage msg;
        if (firebaseClient.pollMessages(&msg)) {
            Serial.printf("[Message] New %s: %s\n", msg.type.c_str(), msg.caption.c_str());
            display.showNotification(msg.caption.c_str(), msg.type.c_str());

            // Acknowledge as delivered
            firebaseClient.ackMessage(msg.id.c_str(), "delivered");

            // TODO: download and play media here
            // For now we just show notification and ack
        }
    }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
void loop() {
    switch (appState) {
        case AppState::BOOT_LOGO:
            handleBootLogo();
            break;
        case AppState::WIFI_SETUP:
            handleWiFiSetup();
            break;
        case AppState::WIFI_CONNECTING:
            handleWiFiConnecting();
            break;
        case AppState::AP_MODE:
            handleAPMode();
            break;
        case AppState::ONLINE:
            handleOnline();
            break;
        default:
            break;
    }
    delay(50);
}
