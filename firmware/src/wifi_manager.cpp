#include "wifi_manager.h"
#include <Arduino.h>

static const char* PREFS_NAMESPACE = "etphone";
static const char* KEY_SSID = "ssid";
static const char* KEY_PASS = "pass";

WiFiManager::WiFiManager() : _server(80), _state(WiFiState::DISCONNECTED), _lastReconnectAttempt(0) {}

void WiFiManager::begin() {
    loadCredentials();
}

void WiFiManager::loop() {
    if (_state == WiFiState::AP_MODE) {
        _server.handleClient();
        return;
    }

    if (_state == WiFiState::CONNECTED) {
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Connection lost, will retry...");
            _state = WiFiState::DISCONNECTED;
        }
        return;
    }

    if (_state == WiFiState::CONNECTING) {
        if (WiFi.status() == WL_CONNECTED) {
            _state = WiFiState::CONNECTED;
            Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
            return;
        }
        // Timeout handled in main loop via start time
        return;
    }

    // DISCONNECTED or SCANNING: attempt reconnect periodically
    unsigned long now = millis();
    if (now - _lastReconnectAttempt > RECONNECT_INTERVAL) {
        _lastReconnectAttempt = now;
        loadCredentials(); // Try saved credentials
    }
}

void WiFiManager::loadCredentials() {
    _prefs.begin(PREFS_NAMESPACE, true);
    String ssid = _prefs.getString(KEY_SSID, "");
    String pass = _prefs.getString(KEY_PASS, "");
    _prefs.end();

    if (ssid.length() > 0) {
        Serial.printf("[WiFi] Saved credentials found: %s\n", ssid.c_str());
        tryConnect(ssid.c_str(), pass.c_str());
    } else {
        Serial.println("[WiFi] No saved credentials, entering AP mode...");
        startAPMode();
    }
}

void WiFiManager::saveCredentials(const char* ssid, const char* password) {
    _prefs.begin(PREFS_NAMESPACE, false);
    _prefs.putString(KEY_SSID, ssid);
    _prefs.putString(KEY_PASS, password);
    _prefs.end();
    Serial.printf("[WiFi] Credentials saved for %s\n", ssid);
}

void WiFiManager::forgetCredentials() {
    _prefs.begin(PREFS_NAMESPACE, false);
    _prefs.clear();
    _prefs.end();
    Serial.println("[WiFi] Credentials cleared");
}

void WiFiManager::startAPMode() {
    WiFi.mode(WIFI_AP);
    WiFi.softAP("ET-Phone-Home-Setup");
    _state = WiFiState::AP_MODE;

    _server.on("/", HTTP_GET, [this]() { handleRoot(); });
    _server.on("/scan", HTTP_GET, [this]() { handleScan(); });
    _server.on("/connect", HTTP_POST, [this]() { handleConnect(); });
    _server.on("/style.css", HTTP_GET, [this]() { handleStaticCSS(); });
    _server.onNotFound([this]() { handleNotFound(); });
    _server.begin();

    Serial.printf("[WiFi] AP Mode started. SSID: ET-Phone-Home-Setup IP: %s\n", WiFi.softAPIP().toString().c_str());
}

void WiFiManager::tryConnect(const char* ssid, const char* password) {
    _state = WiFiState::CONNECTING;
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    Serial.printf("[WiFi] Connecting to %s...\n", ssid);
}

String WiFiManager::getSSID() const {
    if (_state == WiFiState::CONNECTED) return WiFi.SSID();
    if (_state == WiFiState::AP_MODE) return "ET-Phone-Home-Setup";
    return "";
}

String WiFiManager::getIP() const {
    if (_state == WiFiState::CONNECTED) return WiFi.localIP().toString();
    if (_state == WiFiState::AP_MODE) return WiFi.softAPIP().toString();
    return "";
}

// Web handlers
void WiFiManager::handleRoot() {
    _server.send(200, "text/html", generateAPHTML());
}

void WiFiManager::handleStaticCSS() {
    _server.send(200, "text/css", generateCSS());
}

void WiFiManager::handleScan() {
    int n = WiFi.scanNetworks();
    String json = "{";
    json += "\"networks\":[";
    for (int i = 0; i < n; ++i) {
        if (i > 0) json += ",";
        json += "{";
        json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
        json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
        json += "\"secure\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false");
        json += "}";
    }
    json += "]}";
    _server.send(200, "application/json", json);
}

void WiFiManager::handleConnect() {
    String ssid = _server.arg("ssid");
    String pass = _server.arg("password");

    if (ssid.length() == 0) {
        _server.send(400, "text/plain", "Missing SSID");
        return;
    }

    saveCredentials(ssid.c_str(), pass.c_str());

    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'>";
    html += "<title>ET-Phone-Home</title><style>";
    html += "body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;text-align:center;padding:40px}h1{color:#10b981}";
    html += "</style></head><body>";
    html += "<h1>Saved!</h1><p>Connecting to <b>" + ssid + "</b>...</p>";
    html += "<p>The device will restart. You can close this page.</p>";
    html += "</body></html>";
    _server.send(200, "text/html", html);

    delay(1000);
    ESP.restart();
}

void WiFiManager::handleNotFound() {
    _server.send(404, "text/plain", "Not Found");
}

String WiFiManager::generateAPHTML() {
    return R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ET-Phone-Home WiFi Setup</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="card">
<h1>ET-Phone-Home</h1>
<p class="subtitle">WiFi Setup</p>
<div id="networks"><p>Scanning...</p></div>
<div id="manual">
<input type="text" id="ssidInput" placeholder="Network name (SSID)">
<input type="password" id="passInput" placeholder="Password">
<button onclick="connect()">Connect</button>
</div>
</div>
<script>
async function loadNetworks(){
  const r=await fetch('/scan');
  const d=await r.json();
  const el=document.getElementById('networks');
  if(d.networks.length===0){el.innerHTML='<p>No networks found</p>';return;}
  let h='<ul>';
  d.networks.forEach(n=>{h+='<li onclick="select(\''+n.ssid.replace(/\\'/g,"\\'")+'\')">'+n.ssid+' ('+n.rssi+' dBm)'+(n.secure?' 🔒':'')+'</li>';});
  h+='</ul>';
  el.innerHTML=h;
}
function select(s){document.getElementById('ssidInput').value=s;}
async function connect(){
  const s=document.getElementById('ssidInput').value;
  const p=document.getElementById('passInput').value;
  if(!s){alert('Enter network name');return;}
  const fd=new FormData();fd.append('ssid',s);fd.append('password',p);
  await fetch('/connect',{method:'POST',body:fd});
  document.body.innerHTML='<h1 style="color:#10b981">Connecting...</h1><p>Please wait. The device will restart.</p>';
}
loadNetworks();
</script>
</body>
</html>)rawliteral";
}

String WiFiManager::generateCSS() {
    return R"rawliteral(body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;width:90%;max-width:360px;text-align:center}
h1{margin:0 0 8px;font-size:1.6rem;background:linear-gradient(135deg,#2563eb,#0891b2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.subtitle{color:#94a3b8;margin-bottom:20px}
ul{list-style:none;padding:0;margin:0 0 16px;max-height:200px;overflow-y:auto}
li{padding:10px;border:1px solid #334155;border-radius:6px;margin-bottom:6px;cursor:pointer;background:#0f172a;text-align:left}
li:hover{background:#334155}
input{width:100%;padding:10px;margin-bottom:10px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#f1f5f9;box-sizing:border-box}
button{width:100%;padding:10px;border:none;border-radius:6px;background:#059669;color:#fff;font-weight:600;cursor:pointer}
button:hover{background:#047857}
#manual{margin-top:16px}
)rawliteral";
}
