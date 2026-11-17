#include "servos.h"

#include <ESP32Servo.h>

#include "config_pines.h"

namespace {
struct EstadoServo {
  Servo servo;
  bool listo = false;
  bool empujando = false;
  uint32_t desde = 0;
  String codigo;
};

EstadoServo servos[CANTIDAD_SERVOS];

// Cola pequeña de resultados por confirmar.
constexpr size_t MAX_RESULTADOS = 8;
ResultadoServo resultados[MAX_RESULTADOS];
size_t cantidadResultados = 0;

// Últimas órdenes recibidas: si el servidor la vuelve a mandar (aún no llegó la confirmación), no se repite.
constexpr size_t MAX_CONOCIDAS = 8;
String conocidas[MAX_CONOCIDAS];
size_t siguienteConocida = 0;

void recordar(const String& codigo) {
  conocidas[siguienteConocida] = codigo;
  siguienteConocida = (siguienteConocida + 1) % MAX_CONOCIDAS;
}

void agregarResultado(const String& codigo, bool ok, const String& mensaje) {
  if (cantidadResultados == MAX_RESULTADOS) {
    // Cola llena (servidor caído mucho tiempo): se descarta la más vieja; el servidor ya la habrá vencido.
    for (size_t i = 1; i < MAX_RESULTADOS; i++) resultados[i - 1] = resultados[i];
    cantidadResultados--;
  }
  resultados[cantidadResultados++] = ResultadoServo{codigo, ok, mensaje};
}
}  // namespace

void servosIniciar() {
  for (size_t i = 0; i < CANTIDAD_SERVOS; i++) {
    servos[i].servo.setPeriodHertz(50);
    servos[i].listo = servos[i].servo.attach(PINES_SERVO[i], SERVO_PULSO_MIN_US, SERVO_PULSO_MAX_US) >= 0;
    if (servos[i].listo) servos[i].servo.write(ANGULO_REPOSO);
    Serial.printf("[servo] Servo %u en GPIO %u: %s\n", static_cast<unsigned>(i + 1), PINES_SERVO[i], servos[i].listo ? "listo" : "ERROR");
  }
}

bool servoOrdenConocida(const String& codigo) {
  for (const String& c : conocidas) {
    if (c == codigo) return true;
  }
  return false;
}

void servoOrdenar(const String& codigo, int numero, const String& accion) {
  recordar(codigo);

  if (numero < 1 || static_cast<size_t>(numero) > CANTIDAD_SERVOS) {
    agregarResultado(codigo, false, "la placa no tiene servo " + String(numero) + " (revisa PINES_SERVO)");
    return;
  }

  EstadoServo& s = servos[numero - 1];
  if (!s.listo) {
    agregarResultado(codigo, false, "servo " + String(numero) + " sin inicializar");
    return;
  }
  if (s.empujando) {
    agregarResultado(codigo, false, "servo " + String(numero) + " ocupado");
    return;
  }
  if (accion != "encender" && accion != "apagar") {
    agregarResultado(codigo, false, "accion desconocida: " + accion);
    return;
  }

  s.servo.write(accion == "encender" ? ANGULO_ENCENDER : ANGULO_APAGAR);
  s.empujando = true;
  s.desde = millis();
  s.codigo = codigo;
  Serial.printf("[servo] Servo %d: %s\n", numero, accion.c_str());
}

void servosActualizar() {
  for (size_t i = 0; i < CANTIDAD_SERVOS; i++) {
    EstadoServo& s = servos[i];
    if (s.empujando && millis() - s.desde >= MS_EMPUJE) {
      s.servo.write(ANGULO_REPOSO);
      s.empujando = false;
      // Se confirma al terminar el movimiento: "ok" = el servo se movió.
      agregarResultado(s.codigo, true, "");
    }
  }
}

bool servoResultadoPendiente(ResultadoServo& resultado) {
  if (cantidadResultados == 0) return false;

  resultado = resultados[0];
  for (size_t i = 1; i < cantidadResultados; i++) resultados[i - 1] = resultados[i];
  cantidadResultados--;
  return true;
}

void servoDevolverResultado(const ResultadoServo& resultado) {
  agregarResultado(resultado.codigo, resultado.ok, resultado.mensaje);
}
