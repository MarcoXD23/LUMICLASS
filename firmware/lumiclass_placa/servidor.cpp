#include "servidor.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "config_pines.h"
#include "sensores.h"
#include "servos.h"

namespace {
String base;        // http://IP:PUERTO/api/v1/placa
String autorizacion; // "Bearer <clave>"

RespuestaServidor clasificar(int codigoHttp) {
  if (codigoHttp >= 200 && codigoHttp < 300) return RespuestaServidor::Ok;
  if (codigoHttp == 401) return RespuestaServidor::ClaveInvalida;
  if (codigoHttp <= 0) return RespuestaServidor::SinRespuesta;  // no hubo conexión o se agotó el tiempo
  return RespuestaServidor::Error;
}

// Hace una petición y deja el cuerpo de la respuesta en "respuesta".
RespuestaServidor pedir(const char* metodo, const char* ruta, const String& cuerpo, String* respuesta = nullptr) {
  if (WiFi.status() != WL_CONNECTED) return RespuestaServidor::SinRespuesta;

  HTTPClient http;
  http.setConnectTimeout(MS_TIMEOUT_HTTP);
  http.setTimeout(MS_TIMEOUT_HTTP);
  http.setReuse(false);

  if (!http.begin(base + ruta)) return RespuestaServidor::Error;
  http.addHeader("Authorization", autorizacion);
  http.addHeader("Accept", "application/json");
  if (cuerpo.length()) http.addHeader("Content-Type", "application/json");

  const int codigo = http.sendRequest(metodo, cuerpo);
  if (respuesta && codigo > 0) *respuesta = http.getString();
  if (codigo != 200 && codigo != 201) {
    Serial.printf("[http] %s %s -> %d\n", metodo, ruta, codigo);
  }
  http.end();
  return clasificar(codigo);
}
}  // namespace

void servidorIniciar(const ConfiguracionPlaca& config) {
  base = config.servidor + "/api/v1/placa";
  autorizacion = "Bearer " + config.clave;
}

RespuestaServidor servidorHeartbeat() {
  return pedir("POST", "/heartbeat", "{\"version\":\"" LUMICLASS_FIRMWARE_VERSION "\"}");
}

RespuestaServidor servidorEnviarLecturas() {
  JsonDocument doc;
  JsonArray lecturas = doc["lecturas"].to<JsonArray>();
  for (size_t numero = 1; numero <= CANTIDAD_PIR; numero++) {
    JsonObject lectura = lecturas.add<JsonObject>();
    lectura["sensor"] = numero;
    lectura["presencia"] = sensorPresencia(numero);
  }

  String cuerpo;
  serializeJson(doc, cuerpo);
  return pedir("POST", "/lecturas", cuerpo);
}

RespuestaServidor servidorConsultarOrdenes() {
  String texto;
  const RespuestaServidor resultado = pedir("GET", "/ordenes", "", &texto);
  if (resultado != RespuestaServidor::Ok) return resultado;

  JsonDocument doc;
  if (deserializeJson(doc, texto)) {
    Serial.println("[http] Respuesta de órdenes ilegible.");
    return RespuestaServidor::Error;
  }

  for (JsonObject orden : doc["ordenes"].as<JsonArray>()) {
    const String codigo = orden["codigo"] | "";
    if (codigo.isEmpty() || servoOrdenConocida(codigo)) continue;  // ya se está ejecutando o ya se hizo
    servoOrdenar(codigo, orden["servo"] | 0, orden["accion"] | "");
  }
  return RespuestaServidor::Ok;
}

RespuestaServidor servidorConfirmar(const String& codigo, bool ok, const String& mensaje) {
  JsonDocument doc;
  doc["codigo"] = codigo;
  doc["resultado"] = ok ? "ok" : "falla";
  if (mensaje.length()) doc["mensaje"] = mensaje;

  String cuerpo;
  serializeJson(doc, cuerpo);
  return pedir("POST", "/confirmar", cuerpo);
}
