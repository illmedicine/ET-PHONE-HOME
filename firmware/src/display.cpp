#include "display.h"
#include <SPI.h>

Display::Display() : _blPin(9) {}

void Display::init() {
    _tft.init();
    _tft.setRotation(0); // 0 for round display
    _tft.fillScreen(TFT_BLACK);
    pinMode(_blPin, OUTPUT);
    setBrightness(255);
}

void Display::setBrightness(uint8_t brightness) {
    analogWrite(_blPin, brightness);
}

void Display::showLogo() {
    _tft.fillScreen(TFT_BLACK);
    // Logo is 240x240 RGB565, centered (fills screen)
    _tft.pushImage(0, 0, LOGO_WIDTH, LOGO_HEIGHT, (uint16_t*)logo_bitmap);
}

void Display::showMessage(const char* line1, const char* line2, uint32_t color) {
    _tft.fillScreen(TFT_BLACK);
    drawCenteredText(line1, 90, color, 4);
    if (line2) {
        drawCenteredText(line2, 130, TFT_LIGHTGREY, 2);
    }
}

void Display::showWiFiScanning() {
    showMessage("Scanning...", "Looking for WiFi networks", TFT_CYAN);
}

void Display::showWiFiAPMode(const char* ssid, const char* ip) {
    _tft.fillScreen(TFT_BLACK);
    drawCenteredText("Setup WiFi", 40, TFT_ORANGE, 4);
    drawCenteredText("Connect to:", 90, TFT_WHITE, 2);
    drawCenteredText(ssid, 115, TFT_GREEN, 2);
    drawCenteredText("Open browser:", 150, TFT_WHITE, 2);
    drawCenteredText(ip, 175, TFT_CYAN, 2);
}

void Display::showWiFiConnected(const char* ssid, const char* ip) {
    _tft.fillScreen(TFT_BLACK);
    drawCenteredText("Connected", 80, TFT_GREEN, 4);
    drawCenteredText(ssid, 115, TFT_WHITE, 2);
    drawCenteredText(ip, 145, TFT_CYAN, 2);
}

void Display::showWiFiConnecting(const char* ssid) {
    char buf[64];
    snprintf(buf, sizeof(buf), "Connecting to %s...", ssid);
    showMessage(buf, nullptr, TFT_YELLOW);
}

void Display::showDeviceStatus(const char* deviceId, bool online) {
    _tft.fillScreen(TFT_BLACK);
    drawCenteredText(online ? "Online" : "Offline", 80, online ? TFT_GREEN : TFT_RED, 4);
    drawCenteredText(deviceId, 120, TFT_WHITE, 2);
    drawCenteredText(online ? "Waiting for messages..." : "Check WiFi / Firebase", 150, TFT_LIGHTGREY, 1);
}

void Display::showNotification(const char* title, const char* body) {
    _tft.fillScreen(TFT_BLACK);
    drawCenteredText(title, 80, TFT_YELLOW, 4);
    drawCenteredText(body, 120, TFT_WHITE, 2);
}

void Display::clear() {
    _tft.fillScreen(TFT_BLACK);
}

void Display::drawCenteredText(const char* text, int y, uint32_t color, int font) {
    _tft.setTextFont(font);
    _tft.setTextColor(color, TFT_BLACK);
    _tft.setTextDatum(MC_DATUM);
    _tft.drawString(text, 120, y);
}
