// LED integrado: parpadeo rápido = sin WiFi, lento = sin servidor, fijo = conectado.
#pragma once
#include <Arduino.h>

enum class EstadoLed { SinWifi, SinServidor, Conectado };

void ledIniciar();
void ledEstado(EstadoLed estado);
// Llamar en cada vuelta de loop(): no usa delay.
void ledActualizar();
