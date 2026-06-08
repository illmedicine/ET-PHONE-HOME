#pragma once

#include <TFT_eSPI.h>
#include "logo.h"

class Display {
public:
    Display();
    void init();
    void showLogo();
    void showMessage(const char* line1, const char* line2 = nullptr, uint32_t color = TFT_WHITE);
    void showWiFiScanning();
    void showWiFiAPMode(const char* ssid, const char* ip);
    void showWiFiConnected(const char* ssid, const char* ip);
    void showWiFiConnecting(const char* ssid);
    void showDeviceStatus(const char* deviceId, bool online);
    void showNotification(const char* title, const char* body);
    void clear();
    void setBrightness(uint8_t brightness);

private:
    TFT_eSPI _tft;
    uint8_t _blPin;
    void drawCenteredText(const char* text, int y, uint32_t color, int font);
};
