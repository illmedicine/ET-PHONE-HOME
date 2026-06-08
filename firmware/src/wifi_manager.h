#pragma once

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

enum class WiFiState {
    DISCONNECTED,
    SCANNING,
    CONNECTING,
    CONNECTED,
    AP_MODE
};

class WiFiManager {
public:
    WiFiManager();
    void begin();
    void loop();
    WiFiState getState() const { return _state; }
    String getSSID() const;
    String getIP() const;
    bool isConnected() const { return _state == WiFiState::CONNECTED; }
    void startAPMode();
    void tryConnect(const char* ssid, const char* password);
    void forgetCredentials();

private:
    WiFiState _state;
    Preferences _prefs;
    WebServer _server;
    unsigned long _lastReconnectAttempt;
    static const unsigned long RECONNECT_INTERVAL = 30000; // 30s
    static const unsigned long CONNECT_TIMEOUT = 20000;    // 20s

    void loadCredentials();
    void saveCredentials(const char* ssid, const char* password);
    void handleRoot();
    void handleScan();
    void handleConnect();
    void handleNotFound();
    void handleStaticCSS();
    String generateAPHTML();
    String generateCSS();
};
