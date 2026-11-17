// Sensores PIR HC-SR501 con anti rebote.
#pragma once
#include <Arduino.h>

void sensoresIniciar();
// Llamar en cada vuelta de loop(). Devuelve true si algún PIR cambió (ya filtrado).
bool sensoresActualizar();
// false durante el minuto de calentamiento del HC-SR501: sus lecturas no se envían.
bool sensoresListos();
// Presencia estable del PIR "numero" (1 = primer pin de PINES_PIR).
bool sensorPresencia(size_t numero);
