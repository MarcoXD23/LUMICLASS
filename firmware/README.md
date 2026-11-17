# Firmware de la placa LUMICLASS (ESP32)

Programa para **ESP32 DevKit V1** con 2 servos SG90 y 2 sensores PIR HC-SR501.
Guía completa (armar, instalar, conectar desde el celular, calibrar y seguridad eléctrica): [../docs/HARDWARE.md](../docs/HARDWARE.md).

| Archivo | Qué hace |
|---|---|
| `lumiclass_placa/lumiclass_placa.ino` | Programa principal: loop sin bloqueos |
| `lumiclass_placa/config_pines.h` | **Pines, ángulos y tiempos** (lo único que normalmente se cambia) |
| `lumiclass_placa/portal.*` | WiFi, portal "LUMICLASS-Placa" (WiFiManager) y memoria (Preferences) |
| `lumiclass_placa/servidor.*` | Peticiones HTTP a `/api/v1/placa/...` |
| `lumiclass_placa/sensores.*` | PIR con anti rebote y calentamiento |
| `lumiclass_placa/servos.*` | Mueve el servo, vuelve a reposo y prepara la confirmación |
| `lumiclass_placa/led_estado.*` | LED: rápido = sin WiFi, lento = sin servidor, fijo = conectado |
| `lumiclass_placa/diagram.json`, `wokwi.toml`, `libraries.txt` | Prueba en el simulador Wokwi |

Librerías: **WiFiManager** (tzapu), **ArduinoJson** 7, **ESP32Servo** 3. Núcleo: **esp32** de Espressif 3.x.

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 firmware/lumiclass_placa
```

⚠️ Los servos solo empujan el interruptor. Nada de este circuito se conecta a 110/220 V.
