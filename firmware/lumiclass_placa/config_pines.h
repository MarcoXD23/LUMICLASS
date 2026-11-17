// =====================================================================================
// LUMICLASS · Configuración de la placa. TODO lo que se calibra o cambia de cableado está aquí.
// Placa CONFIRMADA: ESP32 DevKit V1 (LED integrado en GPIO 2, botón BOOT en GPIO 0).
// Guía para armar y calibrar: docs/HARDWARE.md
// =====================================================================================
#pragma once
#include <Arduino.h>

#define LUMICLASS_FIRMWARE_VERSION "1.0.0"

// ---- Pines -------------------------------------------------------------------------
// Cambia aquí si usas otra placa u otros pines. El orden importa:
// el primer pin es el "Servo 1" / "PIR 1" que se ve en "Configurar salón".
constexpr uint8_t PIN_LED_ESTADO = 2;   // LED integrado de la DevKit V1
constexpr bool LED_ENCIENDE_EN_ALTO = true;
constexpr uint8_t PIN_BOTON_PORTAL = 0; // Botón BOOT (en reposo está en ALTO)

constexpr uint8_t PINES_SERVO[] = {18, 19}; // Servo 1, Servo 2 (señal; alimentación 5 V EXTERNA)
constexpr uint8_t PINES_PIR[] = {27, 26};   // PIR 1, PIR 2 (salida del HC-SR501, 3,3 V)

constexpr size_t CANTIDAD_SERVOS = sizeof(PINES_SERVO) / sizeof(PINES_SERVO[0]);
constexpr size_t CANTIDAD_PIR = sizeof(PINES_PIR) / sizeof(PINES_PIR[0]);

// ---- Ángulos del servo (CALIBRAR con la maqueta; ver docs/HARDWARE.md) ----------------
// El servo empuja el interruptor y vuelve a reposo para que también se pueda usar a mano.
constexpr int ANGULO_REPOSO = 90;
constexpr int ANGULO_ENCENDER = 45;
constexpr int ANGULO_APAGAR = 135;
constexpr uint32_t MS_EMPUJE = 600;  // tiempo empujando antes de volver a reposo
// Pulso del SG90 en microsegundos (0° y 180°). Si no llega a los extremos, ajusta aquí.
constexpr int SERVO_PULSO_MIN_US = 500;
constexpr int SERVO_PULSO_MAX_US = 2400;

// ---- Sensores PIR ------------------------------------------------------------------
constexpr uint32_t PIR_MS_ESTABLE = 200;             // anti rebote: la señal debe durar esto
constexpr uint32_t PIR_MS_CALENTAMIENTO = 60000;     // el HC-SR501 tarda ~1 min en estabilizarse
constexpr uint32_t MS_REENVIO_LECTURAS = 30000;      // reenvía el estado aunque no cambie

// ---- Comunicación con el servidor ---------------------------------------------------
constexpr uint32_t MS_HEARTBEAT = 10000;             // el servidor la da por perdida a los 30 s
constexpr uint32_t MS_ORDENES = 1000;                // consulta de órdenes de los servos
constexpr uint32_t MS_REINTENTO_MAXIMO = 5000;       // sin servidor, espera hasta esto entre intentos
constexpr uint16_t MS_TIMEOUT_HTTP = 2000;           // nunca se queda esperando más que esto
constexpr uint32_t MS_SERVIDOR_OK = 15000;           // sin respuesta en este tiempo = "sin servidor"

// ---- Portal de configuración --------------------------------------------------------
#define NOMBRE_RED_PORTAL "LUMICLASS-Placa"
constexpr uint32_t MS_BOTON_PORTAL = 5000;           // BOOT presionado 5 s abre el portal
constexpr uint16_t SEGUNDOS_PORTAL = 300;            // el portal se cierra solo a los 5 min
constexpr uint16_t SEGUNDOS_CONEXION_WIFI = 20;

// ---- Solo para probar en Wokwi (simulador web) ----------------------------------------
// En Wokwi no hay celular para el portal: pon 1 y escribe aquí la clave de prueba.
#define LUMICLASS_WOKWI 0
#define WOKWI_SERVIDOR "http://host.wokwi.internal:8001"
#define WOKWI_CLAVE "pega-aqui-la-clave-de-la-placa"
