#include <Arduino.h>
#include "display.h"
#include "wifi_manager.h"
#include "firebase_client.h"

static const char* DEVICE_ID = "freenove-001";
static const char* FIREBASE_HOST = "https://etphone-d829e.firebaseio.com";
static const char* FIREBASE_API_KEY = "AIzaSyBjrCgXfr_csV72_fxGW98xv-brJrgZxPU";

static const unsigned long LOGO_DISPLAY_MS = 3000;
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
static const unsigned long MESSAGE_POLL_INTERVAL_MS = 5000;

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
        Serial.println("[State] WIFI_CONNECTING -> AP_MODE (connection failed)");
        wifiManager.startAPMode();
        display.showWiFiAPMode("ET-Phone-Home-Setup", wifiManager.getIP().c_str());
        transitionTo(AppState::AP_MODE);
        return;
    }

    if (millis() - stateTimer > WIFI_CONNECT_TIMEOUT_MS) {
        Serial.println("[WiFi] Connection timeout, entering AP mode");
        wifiManager.startAPMode();
        display.showWiFiAPMode("ET-Phone-Home-Setup", wifiManager.getIP().c_str());
        transitionTo(AppState::AP_MODE);
    }
}

void handleAPMode() {
    wifiManager.loop();
}

void handleOnline() {
    wifiManager.loop();

    if (!wifiManager.isConnected()) {
        Serial.println("[State] ONLINE -> WIFI_SETUP (lost connection)");
        transitionTo(AppState::WIFI_SETUP);
        return;
    }

    if (!firebaseClient.sendHeartbeat()) {
        Serial.println("[Firebase] Heartbeat failed");
    }

    static unsigned long lastScreenUpdate = 0;
    if (millis() - lastScreenUpdate > 5000) {
        lastScreenUpdate = millis();
        display.showDeviceStatus(DEVICE_ID, true);
    }

    if (millis() - lastPoll > MESSAGE_POLL_INTERVAL_MS) {
        lastPoll = millis();
        DeviceMessage msg;
        if (firebaseClient.pollMessages(&msg)) {
            Serial.printf("[Message] New %s: %s\n", msg.type.c_str(), msg.caption.c_str());
            display.showNotification(msg.caption.c_str(), msg.type.c_str());
            firebaseClient.ackMessage(msg.id.c_str(), "delivered");
        }
    }
}

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
    static unsigned long lastBeat = 0;
    if (millis() - lastBeat > 3000) {
        lastBeat = millis();
        Serial.printf("[HEARTBEAT] state=%d wifi=%s\n", (int)appState, wifiManager.isConnected() ? "UP" : "DOWN");
    }
    delay(50);
}
