#include "sensores.h"
#include "config_pines.h"

namespace {
struct EstadoPir {
  bool estable = false;      // valor que se informa
  bool crudo = false;        // última lectura del pin
  uint32_t crudoDesde = 0;   // desde cuándo el pin tiene ese valor
};

EstadoPir pir[CANTIDAD_PIR];
uint32_t inicio = 0;
}  // namespace

void sensoresIniciar() {
  inicio = millis();
  for (size_t i = 0; i < CANTIDAD_PIR; i++) {
    // INPUT_PULLDOWN: un PIR desconectado se lee como "sin presencia", no como ruido.
    pinMode(PINES_PIR[i], INPUT_PULLDOWN);
    pir[i].crudo = pir[i].estable = digitalRead(PINES_PIR[i]) == HIGH;
    pir[i].crudoDesde = millis();
  }
}

bool sensoresListos() { return millis() - inicio >= PIR_MS_CALENTAMIENTO; }

bool sensoresActualizar() {
  bool hubo = false;
  const uint32_t ahora = millis();

  for (size_t i = 0; i < CANTIDAD_PIR; i++) {
    const bool lectura = digitalRead(PINES_PIR[i]) == HIGH;

    if (lectura != pir[i].crudo) {
      pir[i].crudo = lectura;
      pir[i].crudoDesde = ahora;
    } else if (lectura != pir[i].estable && ahora - pir[i].crudoDesde >= PIR_MS_ESTABLE) {
      pir[i].estable = lectura;
      hubo = true;
      Serial.printf("[pir] PIR %u: %s\n", static_cast<unsigned>(i + 1), lectura ? "presencia" : "sin presencia");
    }
  }

  return hubo && sensoresListos();
}

bool sensorPresencia(size_t numero) {
  return numero >= 1 && numero <= CANTIDAD_PIR && pir[numero - 1].estable;
}
