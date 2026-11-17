// Comunicación HTTP con LUMICLASS (API /api/v1/placa/...). Cada petición espera como máximo MS_TIMEOUT_HTTP.
#pragma once
#include <Arduino.h>

#include "portal.h"

enum class RespuestaServidor { Ok, SinRespuesta, ClaveInvalida, Error };

void servidorIniciar(const ConfiguracionPlaca& config);

RespuestaServidor servidorHeartbeat();
RespuestaServidor servidorEnviarLecturas();
// Pide las órdenes pendientes y se las pasa a los servos.
RespuestaServidor servidorConsultarOrdenes();
RespuestaServidor servidorConfirmar(const String& codigo, bool ok, const String& mensaje);
