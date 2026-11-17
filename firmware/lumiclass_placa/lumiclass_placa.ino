// =====================================================================================
// LUMICLASS · Firmware de la placa ESP32 (Fase 8)
//
// - Primer arranque (o BOOT presionado 5 s): crea la red WiFi "LUMICLASS-Placa" con un portal
//   donde se escribe el WiFi, su contraseña y el código de conexión (o servidor + clave).
// - Luego: heartbeat cada 10 s, lecturas de los PIR, consulta de órdenes cada 1 s,
//   mueve el servo del interruptor y confirma el resultado.
// - Si el servidor no responde, reintenta cada vez más espaciado, sin bloquear y sin reiniciarse.
//
// Pines, ángulos y tiempos: config_pines.h · Guía completa: docs/HARDWARE.md
// SEGURIDAD: los servos solo empujan el interruptor. Nada de este circuito toca la corriente de 110/220 V.
// =====================================================================================
#include <WiFi.h>

#include "config_pines.h"
#include "led_estado.h"
#include "portal.h"
#include "sensores.h"
#include "servidor.h"
#include "servos.h"

namespace {
ConfiguracionPlaca config;

uint32_t ultimoHeartbeat = 0;
uint32_t ultimaConsulta = 0;
uint32_t ultimoEnvioLecturas = 0;
uint32_t ultimaRespuestaOk = 0;
bool hayRespuestaOk = false;
bool lecturasPorEnviar = true;
bool sensoresAvisados = false;
uint32_t esperaReintento = MS_ORDENES;  // crece si el servidor no responde
uint32_t botonPresionadoDesde = 0;
bool claveInvalidaAvisada = false;

bool toca(uint32_t& ultimo, uint32_t intervalo) {
  if (millis() - ultimo < intervalo) return false;
  ultimo = millis();
  return true;
}

// Registra cómo respondió el servidor y ajusta la espera entre intentos.
void anotar(RespuestaServidor respuesta) {
  if (respuesta == RespuestaServidor::Ok) {
    ultimaRespuestaOk = millis();
    hayRespuestaOk = true;
    esperaReintento = MS_ORDENES;
    claveInvalidaAvisada = false;
    return;
  }

  esperaReintento = min<uint32_t>(esperaReintento * 2, MS_REINTENTO_MAXIMO);
  if (respuesta == RespuestaServidor::ClaveInvalida && !claveInvalidaAvisada) {
    claveInvalidaAvisada = true;
    Serial.println("[placa] Clave inválida: genera otra en Conectar placa y mantén BOOT 5 s para escribirla.");
  }
}

bool servidorDisponible() { return hayRespuestaOk && millis() - ultimaRespuestaOk < MS_SERVIDOR_OK; }

void revisarBotonPortal() {
  if (digitalRead(PIN_BOTON_PORTAL) == HIGH) {
    botonPresionadoDesde = 0;
    return;
  }
  if (botonPresionadoDesde == 0) botonPresionadoDesde = millis();
  if (millis() - botonPresionadoDesde >= MS_BOTON_PORTAL) {
    ledEstado(EstadoLed::SinWifi);
    portalAbrirYReiniciar(config);
  }
}

void enviarConfirmaciones() {
  ResultadoServo resultado;
  // Máximo una por vuelta para no frenar el loop si el servidor está lento.
  if (!servoResultadoPendiente(resultado)) return;

  const RespuestaServidor respuesta = servidorConfirmar(resultado.codigo, resultado.ok, resultado.mensaje);
  anotar(respuesta);
  // Solo se reintenta si no hubo respuesta; si el servidor la rechazó, reintentar no sirve.
  if (respuesta == RespuestaServidor::SinRespuesta) servoDevolverResultado(resultado);
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[placa] LUMICLASS " LUMICLASS_FIRMWARE_VERSION);

  ledIniciar();
  pinMode(PIN_BOTON_PORTAL, INPUT_PULLUP);
  servosIniciar();
  sensoresIniciar();

  config = configuracionCargar();
  wifiIniciar(config);
  servidorIniciar(config);
  Serial.printf("[placa] Servidor: %s\n", config.servidor.c_str());
}

void loop() {
  revisarBotonPortal();
  ledActualizar();
  servosActualizar();  // siempre: un servo nunca se queda empujando el interruptor
  if (sensoresActualizar()) lecturasPorEnviar = true;

  if (WiFi.status() != WL_CONNECTED) {
    ledEstado(EstadoLed::SinWifi);  // el ESP32 se reconecta solo (setAutoReconnect)
    return;
  }
  ledEstado(servidorDisponible() ? EstadoLed::Conectado : EstadoLed::SinServidor);

  // Heartbeat: cada 10 s; sin servidor, con la espera de reintento.
  if (toca(ultimoHeartbeat, servidorDisponible() ? MS_HEARTBEAT : esperaReintento)) {
    anotar(servidorHeartbeat());
  }
  if (!servidorDisponible()) return;  // no se insiste con lo demás hasta que el heartbeat responda

  if (sensoresListos() && !sensoresAvisados) {
    sensoresAvisados = true;
    lecturasPorEnviar = true;
    Serial.println("[pir] Sensores listos (terminó el calentamiento).");
  }
  if (sensoresListos() && (lecturasPorEnviar || toca(ultimoEnvioLecturas, MS_REENVIO_LECTURAS))) {
    const RespuestaServidor respuesta = servidorEnviarLecturas();
    anotar(respuesta);
    lecturasPorEnviar = respuesta != RespuestaServidor::Ok && respuesta != RespuestaServidor::Error;
    ultimoEnvioLecturas = millis();
  }

  if (toca(ultimaConsulta, esperaReintento)) {
    anotar(servidorConsultarOrdenes());
  }

  enviarConfirmaciones();
}
