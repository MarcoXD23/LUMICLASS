// Servos SG90 que empujan el interruptor de pared y vuelven a reposo.
// "ok" = el servo hizo el movimiento. Sin sensor de luz NO se sabe si la luz prendió.
#pragma once
#include <Arduino.h>

struct ResultadoServo {
  String codigo;   // código de la orden que mandó el servidor
  bool ok;
  String mensaje;
};

void servosIniciar();
// Empieza una orden ("encender" o "apagar"). Si no se puede, deja el resultado "falla" listo.
void servoOrdenar(const String& codigo, int numero, const String& accion);
// true si esa orden ya se está ejecutando o ya terminó (la placa no la repite).
bool servoOrdenConocida(const String& codigo);
// Llamar en cada vuelta de loop(): devuelve el servo a reposo sin usar delay.
void servosActualizar();
// Saca un resultado terminado para confirmarlo al servidor. Devuelve false si no hay.
bool servoResultadoPendiente(ResultadoServo& resultado);
// Si la confirmación no se pudo enviar, el resultado vuelve a la cola para reintentarlo.
void servoDevolverResultado(const ResultadoServo& resultado);
