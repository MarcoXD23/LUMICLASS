# Hardware: ESP32 con relé

Diseño definitivo del hardware de LUMICLASS (CONFIRMADO, hecho por Sofía): **cada luz tiene su propio ESP32 con un
módulo de relé**. LUMICLASS le ordena encender o apagar, y el ESP32 informa si el relé quedó encendido o apagado.

Sketch: [`firmware/lumiclass_esp32/lumiclass_esp32.ino`](../firmware/lumiclass_esp32/lumiclass_esp32.ino).

> ⚠️ **Seguridad eléctrica (léela antes de conectar nada)**
>
> - **No se toca la instalación eléctrica del salón.** El proyecto se demuestra en una **maqueta propia**.
> - El relé debe manejar una **lámpara, LED o tira LED de bajo voltaje (5–12 V)** con su propio adaptador de pared.
> - Conectar el relé a un **bombillo de 110/220 V es peligroso**: solo con la supervisión de un profesor o electricista,
>   con el circuito en una caja cerrada y nunca manipulándolo enchufado.
> - Desconecta todo antes de mover cables.

## 1. Componentes

| Componente | Cantidad | Nota |
| --- | --- | --- |
| ESP32 DevKit V1 (en Arduino IDE: "DOIT ESP32 DEVKIT V1") | 1 por luz | CONFIRMADO en el sketch |
| Módulo de relé de 1 canal, activo en nivel BAJO | 1 por luz | Señal `IN1` en el **GPIO 26** (CONFIRMADO en el sketch) |
| Lámpara, LED o tira LED de 5–12 V + su adaptador | 1 por luz | PROPUESTA (bajo voltaje, ver el aviso) |
| Cable USB de datos | 1 | Para cargar el sketch y alimentar el ESP32 |
| Cables dupont | varios | |

## 2. Conexiones

| Desde | Hasta | Nota |
| --- | --- | --- |
| Relé `VCC` | ESP32 `VIN` (5 V del USB) | Muchos módulos de relé necesitan 5 V para la bobina |
| Relé `GND` | ESP32 `GND` | Tierra común |
| Relé `IN1` | ESP32 `GPIO 26` | El sketch lo activa con `LOW` (`RELE_ON LOW`) |
| Adaptador (+) de la lámpara | Relé `COM` | El relé funciona como interruptor de la lámpara |
| Relé `NO` (normalmente abierto) | Lámpara (+) | Con el relé apagado, la lámpara queda apagada |
| Lámpara (−) | Adaptador (−) | |

Si tu módulo se activa con nivel **ALTO**, cambia en el sketch `RELE_ON` a `HIGH` y `RELE_OFF` a `LOW`.

## 3. Cargar el sketch (Arduino IDE)

1. Instala **Arduino IDE 2**.
2. En **Archivo → Preferencias → Gestor de URLs adicionales de tarjetas** agrega:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. En **Herramientas → Placa → Gestor de tarjetas**, instala **esp32** (de Espressif).
4. Abre `firmware/lumiclass_esp32/lumiclass_esp32.ino`.
5. Elige la placa **DOIT ESP32 DEVKIT V1** y el puerto COM del ESP32.
6. Llena la parte **"CAMBIA ESTO"** del sketch (ver las secciones 4 y 5) y pulsa **Subir**.
7. Abre el **Monitor serie** a **115200** baudios para ver qué pasa.

**Nunca subas a GitHub el sketch con tu contraseña WiFi o tu clave reales.** Antes de hacer commit, déjalos como
`TU_RED_WIFI`, `TU_CLAVE_WIFI` y `PEGA_AQUI_LA_CLAVE`.

## 4. Forma A: por internet (LUMICLASS en un hosting)

El ESP32 **llama al servidor cada 2 segundos**. Por eso funciona aunque esté detrás del router de la casa o del colegio.

1. En LUMICLASS: **Configurar salón** → la luz → **Conectar por internet (hosting)**.
2. Copia **SERVIDOR** y **CLAVE**. La clave **se muestra una sola vez**; si la pierdes, genera otra.
3. En el sketch, escribe `WIFI_SSID`, `WIFI_PASS`, `SERVIDOR` y `CLAVE`, y súbelo.
4. En el Monitor serie debe salir `LUMICLASS: conectado`, y en la app la luz pasa a **"Conectado por internet"**.

**Requisitos del hosting:** HTTPS, y **sin verificación anti-bots** (una página con JavaScript antes del sitio). El
ESP32 no puede pasarla: InfinityFree, por ejemplo, la tiene. En el Monitor serie se ve como un error distinto de 200.

## 5. Forma B: por la red local (LUMICLASS en tu PC)

El **servidor llama al ESP32** por su IP. Solo funciona si el PC y el ESP32 están en la **misma red WiFi**.

1. Arranca LUMICLASS en el PC: `php artisan serve --host=0.0.0.0 --port=8001`.
2. Carga el sketch con tu WiFi. El Monitor serie muestra `Página local: http://192.168.x.x` (y `http://bombillo.local`).
3. En LUMICLASS: **Configurar salón** → la luz → **IP en la red local** → escribe esa IP → **Guardar** → **Probar**.

El ESP32 también tiene su **propia página** (`http://IP-del-ESP32`) con botones para encender, apagar y cambiar. Lo
que se haga ahí también aparece en LUMICLASS y queda en el Historial.

## 6. Problemas comunes

| Lo que ves | Qué hacer |
| --- | --- |
| El Monitor serie se queda en `Conectando a ...` | Revisa el nombre y la contraseña del WiFi. El ESP32 solo se conecta a WiFi de **2,4 GHz** |
| `LUMICLASS: la CLAVE no es válida` | Genera otra clave en Configurar salón y cópiala completa |
| `LUMICLASS: error 403` o un error distinto de 200 | El hosting bloquea dispositivos (anti-bots): usa otro hosting |
| En la app la luz queda **"Inactivo"** | El ESP32 dejó de responder (más de 15 s sin latido): revisa la alimentación y el WiFi |
| "Probar" falla en la Forma B | El PC y el ESP32 no están en la misma red, o cambió la IP del ESP32 |
| El relé suena pero la lámpara no cambia | Revisa `COM` y `NO`, y la alimentación de la lámpara |
| La lámpara hace lo contrario de lo que pides | Tu relé es activo en ALTO: cambia `RELE_ON` y `RELE_OFF` |
