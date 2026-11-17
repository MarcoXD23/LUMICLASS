#include "led_estado.h"
#include "config_pines.h"

namespace {
EstadoLed estadoActual = EstadoLed::SinWifi;
bool encendido = false;
uint32_t ultimoCambio = 0;

void escribir(bool valor) {
  encendido = valor;
  digitalWrite(PIN_LED_ESTADO, (valor == LED_ENCIENDE_EN_ALTO) ? HIGH : LOW);
}
}  // namespace

void ledIniciar() {
  pinMode(PIN_LED_ESTADO, OUTPUT);
  escribir(false);
}

void ledEstado(EstadoLed estado) { estadoActual = estado; }

void ledActualizar() {
  if (estadoActual == EstadoLed::Conectado) {
    if (!encendido) escribir(true);
    return;
  }

  const uint32_t periodo = (estadoActual == EstadoLed::SinWifi) ? 100 : 1000;
  if (millis() - ultimoCambio >= periodo) {
    ultimoCambio = millis();
    escribir(!encendido);
  }
}
