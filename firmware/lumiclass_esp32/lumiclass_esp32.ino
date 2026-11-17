/*
 * LUMICLASS · ESP32 con relé (bombillo)
 *
 * Hace dos cosas a la vez:
 *  1. Se conecta al servidor de LUMICLASS (hosting) cada 2 s: le dice si el bombillo está
 *     encendido o apagado y recibe la orden pendiente ("on"/"off"). Así funciona aunque el
 *     ESP32 esté detrás del router de la casa o del colegio.
 *  2. Mantiene su página web local (http://IP o http://bombillo.local) con /on, /off, /toggle
 *     y /estado. Lo que se cambie ahí también le llega a LUMICLASS en el siguiente latido.
 *
 * Cómo configurarlo:
 *  - En LUMICLASS: Configurar salón → la luz → "Conectar por internet (hosting)".
 *    Copia SERVIDOR y CLAVE aquí abajo (la clave solo se muestra una vez).
 *  - Escribe tu red WiFi. Carga el sketch (placa "DOIT ESP32 DEVKIT V1").
 *  - En el Serial Monitor (115200) verás "LUMICLASS: conectado" cuando todo esté bien.
 *
 * NO subas este archivo con tu clave ni tu contraseña WiFi reales a GitHub.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ---------- CAMBIA ESTO ----------
const char* WIFI_SSID   = "TU_RED_WIFI";
const char* WIFI_PASS   = "TU_CLAVE_WIFI";
const char* NOMBRE_MDNS = "bombillo";                 // http://bombillo.local

const char* SERVIDOR = "https://tu-hosting.com";      // la dirección de LUMICLASS, sin "/" al final
const char* CLAVE    = "PEGA_AQUI_LA_CLAVE";          // la que muestra LUMICLASS
// ---------------------------------

#define RELE_PIN 26          // IN1 del módulo de relés
#define RELE_ON  LOW         // el módulo se activa con nivel BAJO
#define RELE_OFF HIGH

WebServer server(80);
bool encendido = false;

unsigned long intervaloLatido = 2000;   // el servidor puede cambiarlo en su respuesta
unsigned long ultimoLatido = 0;
bool latidoPronto = true;              // true = llamar al servidor ya (al iniciar o tras cumplir una orden)
bool servidorOk = false;


// -------------------------------
// Control del relé
// -------------------------------
void ponerBombillo(bool on) {
  encendido = on;
  digitalWrite(RELE_PIN, on ? RELE_ON : RELE_OFF);
  Serial.println(on ? "Bombillo: ENCENDIDO" : "Bombillo: APAGADO");
}


// -------------------------------
// Página web local (igual que antes)
// -------------------------------
const char PAGINA[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bombillo</title>
<style>
  body{font-family:sans-serif;background:#10151c;color:#eef2f6;margin:0;
       display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}
  h1{font-size:1.4em;margin-bottom:30px}
  #foco{width:140px;height:140px;border-radius:50%;background:#2a3240;
        transition:.3s;margin-bottom:30px}
  #foco.on{background:#ffd54a;box-shadow:0 0 60px 20px rgba(255,213,74,.55)}
  button{font-size:1.3em;padding:18px 0;width:240px;border:none;border-radius:40px;
         cursor:pointer;font-weight:bold}
  .on{background:#ffd54a;color:#222}
  .off{background:#3a4556;color:#fff}
  #estado{margin-top:18px;color:#9aa6b4}
</style>
</head>
<body>
<h1>Control del bombillo</h1>
<div id="foco"></div>
<button id="btn" class="off" onclick="cambiar()">...</button>
<div id="estado">Conectando...</div>
<script>
function pintar(on){
  document.getElementById('foco').className = on ? 'on' : '';
  var b = document.getElementById('btn');
  b.textContent = on ? 'APAGAR' : 'ENCENDER';
  b.className = on ? 'off' : 'on';
  document.getElementById('estado').textContent = on ? 'Encendido' : 'Apagado';
}
function cambiar(){
  fetch('/toggle').then(r => r.json()).then(d => pintar(d.on))
    .catch(() => document.getElementById('estado').textContent = 'Sin conexión');
}
function leer(){
  fetch('/estado').then(r => r.json()).then(d => pintar(d.on))
    .catch(() => document.getElementById('estado').textContent = 'Sin conexión');
}
leer();
setInterval(leer, 3000);   // si otra persona lo cambia, se actualiza aquí
</script>
</body>
</html>
)rawliteral";

void responderEstado() {
  server.send(200, "application/json", encendido ? "{\"on\":true}" : "{\"on\":false}");
}

void handleRaiz()   { server.send_P(200, "text/html", PAGINA); }
void handleOn()     { ponerBombillo(true);        responderEstado(); }
void handleOff()    { ponerBombillo(false);       responderEstado(); }
void handleToggle() { ponerBombillo(!encendido);  responderEstado(); }


// -------------------------------
// Latido con LUMICLASS
// POST {SERVIDOR}/api/v1/dispositivo/latido   Authorization: Bearer {CLAVE}   {"on": true|false}
// Respuesta: {"orden":"on"|"off"|null,"intervalo":2}
// -------------------------------
void latido() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(SERVIDOR) + "/api/v1/dispositivo/latido";
  bool https = url.startsWith("https://");

  WiFiClientSecure clienteSeguro;
  WiFiClient clienteNormal;
  // Sin verificar el certificado del hosting: más simple para un proyecto escolar.
  // Para producción, cargar el certificado raíz con clienteSeguro.setCACert(...).
  clienteSeguro.setInsecure();

  HTTPClient http;
  http.setTimeout(5000);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (https) http.begin(clienteSeguro, url);
  else       http.begin(clienteNormal, url);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("Authorization", String("Bearer ") + CLAVE);

  int codigo = http.POST(encendido ? "{\"on\":true}" : "{\"on\":false}");
  String cuerpo = codigo > 0 ? http.getString() : "";
  http.end();

  if (codigo != 200) {
    if (servidorOk || codigo != -1) {
      Serial.printf("LUMICLASS: error %d %s\n", codigo, cuerpo.substring(0, 160).c_str());
    }
    if (codigo == 401) Serial.println("LUMICLASS: la CLAVE no es válida. Genera otra en Configurar salón.");
    servidorOk = false;
    return;
  }

  if (!servidorOk) Serial.println("LUMICLASS: conectado");
  servidorOk = true;

  // JSON pequeño y fijo: basta con buscar el texto (no hace falta otra librería).
  if (cuerpo.indexOf("\"orden\":\"on\"") >= 0 && !encendido) {
    Serial.println("LUMICLASS pidió: ENCENDER");
    ponerBombillo(true);
    latidoPronto = true;   // confirmar enseguida
  } else if (cuerpo.indexOf("\"orden\":\"off\"") >= 0 && encendido) {
    Serial.println("LUMICLASS pidió: APAGAR");
    ponerBombillo(false);
    latidoPronto = true;
  }

  int i = cuerpo.indexOf("\"intervalo\":");
  if (i >= 0) {
    long segundos = cuerpo.substring(i + 12).toInt();
    if (segundos >= 1 && segundos <= 60) intervaloLatido = segundos * 1000UL;
  }
}


// -------------------------------
// Wi-Fi (con reconexión automática)
// -------------------------------
void conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a ");
  Serial.print(WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. Página local: http://");
  Serial.println(WiFi.localIP());
}


// -------------------------------
// SETUP
// -------------------------------
void setup() {
  // Primero dejar el relé APAGADO, luego configurar el pin como salida
  digitalWrite(RELE_PIN, RELE_OFF);
  pinMode(RELE_PIN, OUTPUT);

  Serial.begin(115200);
  delay(200);

  conectarWiFi();

  if (MDNS.begin(NOMBRE_MDNS)) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("También: http://bombillo.local");
  }

  server.on("/", handleRaiz);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.on("/toggle", handleToggle);
  server.on("/estado", responderEstado);
  server.begin();

  Serial.print("LUMICLASS: servidor ");
  Serial.println(SERVIDOR);
}


// -------------------------------
// LOOP
// -------------------------------
void loop() {
  server.handleClient();

  if (latidoPronto || millis() - ultimoLatido >= intervaloLatido) {
    latidoPronto = false;
    ultimoLatido = millis();
    latido();
  }
}
