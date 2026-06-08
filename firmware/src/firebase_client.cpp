#include "firebase_client.h"
#include <Arduino.h>

static const unsigned long HEARTBEAT_INTERVAL_MS = 30000; // 30s

FirebaseClient::FirebaseClient(const char* host, const char* apiKey)
    : _host(host), _apiKey(apiKey), _lastHeartbeat(0) {}

void FirebaseClient::setDeviceId(const char* deviceId) {
    _deviceId = deviceId;
}

String FirebaseClient::buildUrl(const char* path) {
    String url = _host;
    if (!url.endsWith("/")) url += "/";
    url += path;
    url += ".json?auth=";
    url += _apiKey;
    return url;
}

bool FirebaseClient::httpGet(const char* path, JsonDocument& doc) {
    if (WiFi.status() != WL_CONNECTED) {
        _lastError = "WiFi not connected";
        return false;
    }
    HTTPClient http;
    http.setTimeout(10000);
    http.begin(buildUrl(path));
    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        DeserializationError err = deserializeJson(doc, payload);
        http.end();
        if (err) {
            _lastError = String("JSON parse error: ") + err.c_str();
            return false;
        }
        return true;
    }
    _lastError = String("HTTP ") + code;
    http.end();
    return false;
}

bool FirebaseClient::httpPatch(const char* path, const char* json) {
    if (WiFi.status() != WL_CONNECTED) return false;
    HTTPClient http;
    http.setTimeout(10000);
    http.begin(buildUrl(path));
    http.addHeader("Content-Type", "application/json");
    int code = http.PATCH(json);
    http.end();
    return (code == 200);
}

bool FirebaseClient::httpPut(const char* path, const char* json) {
    if (WiFi.status() != WL_CONNECTED) return false;
    HTTPClient http;
    http.setTimeout(10000);
    http.begin(buildUrl(path));
    http.addHeader("Content-Type", "application/json");
    int code = http.PUT(json);
    http.end();
    return (code == 200);
}

bool FirebaseClient::registerDevice() {
    if (_deviceId.isEmpty()) return false;
    String path = "devices/";
    path += _deviceId;
    StaticJsonDocument<256> doc;
    doc["status"] = "online";
    doc["lastSeen"] = millis();
    String json;
    serializeJson(doc, json);
    return httpPatch(path.c_str(), json.c_str());
}

bool FirebaseClient::updateStatus(const char* status) {
    if (_deviceId.isEmpty()) return false;
    String path = "devices/";
    path += _deviceId;
    path += "/status";
    StaticJsonDocument<128> doc;
    doc[".sv"] = "timestamp"; // server timestamp if supported, otherwise client
    // For simple REST we write client timestamp then patch status
    String json = String("\"") + status + "\"";
    return httpPut(path.c_str(), json.c_str());
}

bool FirebaseClient::sendHeartbeat() {
    unsigned long now = millis();
    if (now - _lastHeartbeat < HEARTBEAT_INTERVAL_MS) return true;
    _lastHeartbeat = now;

    if (_deviceId.isEmpty()) return false;
    String path = "devices/";
    path += _deviceId;
    StaticJsonDocument<256> doc;
    doc["status"] = "online";
    doc["lastSeen"] = millis();
    doc["ip"] = WiFi.localIP().toString();
    String json;
    serializeJson(doc, json);
    bool ok = httpPatch(path.c_str(), json.c_str());
    return ok;
}

bool FirebaseClient::pollMessages(DeviceMessage* outMsg) {
    if (_deviceId.isEmpty()) return false;

    String path = "devices/";
    path += _deviceId;
    path += "/messages";

    StaticJsonDocument<4096> doc;
    if (!httpGet(path.c_str(), doc)) return false;

    // Firebase returns object keyed by push IDs. Find first pending message.
    JsonObject obj = doc.as<JsonObject>();
    for (JsonPair kv : obj) {
        JsonObject msg = kv.value().as<JsonObject>();
        const char* status = msg["status"] | "";
        if (strcmp(status, "pending") == 0) {
            outMsg->id = kv.key().c_str();
            outMsg->type = msg["type"] | "";
            outMsg->caption = msg["caption"] | "";
            outMsg->downloadUrl = msg["downloadUrl"] | "";
            outMsg->status = status;
            outMsg->fileSize = msg["fileSize"] | 0;
            outMsg->duration = msg["duration"] | 0;
            return true;
        }
    }
    return false;
}

bool FirebaseClient::ackMessage(const char* messageId, const char* status) {
    if (_deviceId.isEmpty()) return false;
    String path = "devices/";
    path += _deviceId;
    path += "/messages/";
    path += messageId;
    path += "/status";
    String json = String("\"") + status + "\"";
    return httpPut(path.c_str(), json.c_str());
}
