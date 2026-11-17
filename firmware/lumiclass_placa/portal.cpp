#include "portal.h"

#include <Preferences.h>
#include <WiFi.h>
#include <WiFiManager.h>

#include "config_pines.h"

namespace {
const char* ESPACIO = "lumiclass";  // nombre del espacio en la memoria (Preferences)

String limpiarServidor(String servidor) {
  servidor.trim();
  while (servidor.endsWith("/")) servidor.remove(servidor.length() - 1);
  if (servidor.length() && !servidor.startsWith("http://") && !servidor.startsWith("https://")) {
    servidor = "http://" + servidor;
  }
  return servidor;
}

void configuracionGuardar(const ConfiguracionPlaca& config) {
  Preferences memoria;
  memoria.begin(ESPACIO, false);
  memoria.putString("servidor", config.servidor);
  memoria.putString("clave", config.clave);
  memoria.end();
}

// Ejecuta el portal (bloquea mientras está abierto: la placa no tiene otra cosa que hacer sin configuración).
void ejecutarPortal(ConfiguracionPlaca& config, bool aPedido) {
  WiFiManager wm;
  wm.setTitle("LUMICLASS");
  wm.setConnectTimeout(SEGUNDOS_CONEXION_WIFI);
  wm.setConfigPortalTimeout(SEGUNDOS_PORTAL);
  // Guarda lo escrito aunque la conexión al WiFi falle (por ejemplo, contraseña mal escrita).
  wm.setBreakAfterConfig(true);

  WiFiManagerParameter titulo("<p><b>Conexión con LUMICLASS</b><br>Pega el código de conexión del QR, o escribe servidor y clave.</p>");
  WiFiManagerParameter campoCodigo("codigo", "Código de conexión (del QR)", "", 120);
  WiFiManagerParameter campoServidor("servidor", "Servidor (http://IP:8001)", config.servidor.c_str(), 80);
  WiFiManagerParameter campoClave("clave", "Clave de la placa", config.clave.c_str(), 60);
  wm.addParameter(&titulo);
  wm.addParameter(&campoCodigo);
  wm.addParameter(&campoServidor);
  wm.addParameter(&campoClave);

  bool conectado = aPedido ? wm.startConfigPortal(NOMBRE_RED_PORTAL) : wm.autoConnect(NOMBRE_RED_PORTAL);

  String servidor, clave;
  if (!codigoConexionSeparar(String(campoCodigo.getValue()), servidor, clave)) {
    servidor = limpiarServidor(String(campoServidor.getValue()));
    clave = String(campoClave.getValue());
    clave.trim();
  }

  if (servidor != config.servidor || clave != config.clave) {
    config.servidor = servidor;
    config.clave = clave;
    configuracionGuardar(config);
    Serial.println("[portal] Configuración guardada.");
  }

  Serial.printf("[portal] WiFi %s.\n", conectado ? "conectado" : "sin conectar (se seguirá intentando)");
}
}  // namespace

ConfiguracionPlaca configuracionCargar() {
  ConfiguracionPlaca config;
#if LUMICLASS_WOKWI
  config.servidor = WOKWI_SERVIDOR;
  config.clave = WOKWI_CLAVE;
#else
  Preferences memoria;
  memoria.begin(ESPACIO, true);
  config.servidor = memoria.getString("servidor", "");
  config.clave = memoria.getString("clave", "");
  memoria.end();
#endif
  return config;
}

bool codigoConexionSeparar(const String& codigo, String& servidor, String& clave) {
  String texto = codigo;
  texto.trim();
  if (!texto.startsWith("LUMICLASS;")) return false;

  const int separador = texto.indexOf(';', 10);
  if (separador < 0) return false;

  servidor = limpiarServidor(texto.substring(10, separador));
  clave = texto.substring(separador + 1);
  clave.trim();
  return servidor.length() > 7 && clave.length() > 0;
}

void wifiIniciar(ConfiguracionPlaca& config) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

#if LUMICLASS_WOKWI
  WiFi.begin("Wokwi-GUEST", "", 6);
  return;
#else
  if (!config.completa()) {
    // Primer arranque (o se borró la memoria): sin servidor/clave no hay nada que hacer.
    Serial.println("[portal] Falta configuración: abre la red " NOMBRE_RED_PORTAL " desde el celular.");
    ejecutarPortal(config, true);
    return;
  }

  // Usa el WiFi guardado; si no hay uno guardado o no conecta, abre el portal un rato.
  ejecutarPortal(config, false);
#endif
}

void portalAbrirYReiniciar(ConfiguracionPlaca& config) {
#if !LUMICLASS_WOKWI
  Serial.println("[portal] BOOT presionado 5 s: abriendo " NOMBRE_RED_PORTAL ".");
  ejecutarPortal(config, true);
  delay(500);
  ESP.restart();
#endif
}
