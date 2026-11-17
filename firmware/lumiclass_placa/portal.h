// WiFi + portal "LUMICLASS-Placa" (WiFiManager) + memoria permanente (Preferences).
#pragma once
#include <Arduino.h>

struct ConfiguracionPlaca {
  String servidor;  // p. ej. http://192.168.1.3:8001
  String clave;     // clave de la placa (Configurar salón → Conectar placa)

  bool completa() const { return servidor.length() > 0 && clave.length() > 0; }
};

// Lee la configuración guardada (sobrevive a apagados).
ConfiguracionPlaca configuracionCargar();

// Conecta al WiFi guardado. Si no hay WiFi, servidor o clave guardados, abre el portal.
// Si el WiFi guardado no aparece, el portal se cierra solo y la placa sigue intentando.
void wifiIniciar(ConfiguracionPlaca& config);

// Abre el portal a pedido (BOOT presionado 5 s). Al cerrarlo, la placa se reinicia.
void portalAbrirYReiniciar(ConfiguracionPlaca& config);

// Separa "LUMICLASS;http://IP:PUERTO;clave" (lo que trae el QR). Devuelve false si no es válido.
bool codigoConexionSeparar(const String& codigo, String& servidor, String& clave);
