#pragma once

#include <HTTPClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>

struct DeviceMessage {
    String id;
    String type;
    String caption;
    String downloadUrl;
    String status;
    int fileSize;
    int duration;
};

class FirebaseClient {
public:
    FirebaseClient(const char* host, const char* apiKey);
    void setDeviceId(const char* deviceId);
    bool registerDevice();
    bool updateStatus(const char* status);
    bool sendHeartbeat();
    bool pollMessages(DeviceMessage* outMsg);
    bool ackMessage(const char* messageId, const char* status);
    String getLastError() const { return _lastError; }

private:
    String _host;
    String _apiKey;
    String _deviceId;
    String _lastError;
    unsigned long _lastHeartbeat;

    String buildUrl(const char* path);
    bool httpGet(const char* path, JsonDocument& doc);
    bool httpPatch(const char* path, const char* json);
    bool httpPut(const char* path, const char* json);
};
