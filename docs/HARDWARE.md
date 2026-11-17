# LUMICLASS con hardware real (Fase 8)

Guía paso a paso para armar la maqueta, cargar el programa en la placa y conectarla desde el celular.
No hace falta saber programar: solo seguir los pasos en orden.

> ⚠️ **SEGURIDAD ELÉCTRICA — leer antes de empezar**
>
> - Los servos **solo empujan el interruptor** con su brazo de plástico. **Nunca** se conecta nada de este
>   circuito a los cables de 110/220 V de la pared ni al interior del interruptor.
> - En la maqueta las "luces" son LEDs de **5 V**, alimentados aparte. Un error con 110/220 V puede matar o
>   causar un incendio.
> - Arma y cambia cables **siempre con todo desconectado** (USB y fuente de 5 V).
> - Si se usa en un salón real, el servo se pega con cinta o soporte **por fuera** de la placa del interruptor.
>   Abrir o modificar la instalación eléctrica la hace un electricista, nunca este proyecto.

## 1. Componentes

| Componente | Cantidad | Estado |
|---|---|---|
| ESP32 DevKit V1 (WROOM-32, 30 pines) | 1 | CONFIRMADO |
| Servo SG90 | 2 | CONFIRMADO (PROPUESTA en la planificación, aceptada) |
| Sensor de presencia PIR HC-SR501 | 2 | CONFIRMADO (PROPUESTA en la planificación, aceptada) |
| LEDs de 5 V de la maqueta (con su interruptor) | según la maqueta | CONFIRMADO |
| Fuente de 5 V para los servos (≥ 2 A, por ejemplo un cargador USB con cable cortado o módulo de 5 V) | 1 | PROPUESTA |
| Cables dupont, protoboard, cable micro-USB **de datos** | — | — |

## 2. Conexiones

| Desde | Hacia (ESP32) | Nota |
|---|---|---|
| Servo 1 · cable naranja (señal) | GPIO 18 | |
| Servo 2 · cable naranja (señal) | GPIO 19 | |
| Servos · cable rojo (+) | **+5 V de la fuente externa** | No del pin 3V3 del ESP32 |
| Servos · cable café (−) | GND de la fuente **y** GND del ESP32 | **GND común**: sin esto el servo tiembla o no se mueve |
| PIR 1 · OUT | GPIO 27 | La salida del HC-SR501 es de 3,3 V: va directo |
| PIR 2 · OUT | GPIO 26 | |
| PIRs · VCC | 5 V (pin VIN del ESP32 o la fuente) | |
| PIRs · GND | GND | |

- El **LED azul** de la placa (GPIO 2) indica el estado y el botón **BOOT** (GPIO 0) abre el portal.
- ¿Otra placa u otros pines? Se cambian en `firmware/lumiclass_placa/config_pines.h` (bloque "Pines").
- "Servo 1" es el primer pin de la lista, "Servo 2" el segundo. Lo mismo con los PIR.

Para ajustar el PIR HC-SR501: potenciómetro **Tx** (tiempo) al mínimo (~3 s) y el puente en **H**
(repetir). El "apagar tras 5 minutos" lo decide LUMICLASS, no el sensor.

## 3. Instalar el programa en la placa (Arduino IDE)

1. Descarga e instala **Arduino IDE 2** desde arduino.cc.
2. **Archivo → Preferencias → "URLs adicionales del gestor de placas"**, pega:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. **Herramientas → Placa → Gestor de placas**: busca **esp32** (de Espressif Systems) e instala la versión 3.x.
4. **Herramientas → Gestionar bibliotecas** e instala estas tres (escribe el nombre en el buscador):
   - **WiFiManager** de *tzapu* (versión 2.0.17 o superior)
   - **ArduinoJson** de *Benoit Blanchon* (versión 7)
   - **ESP32Servo** de *Kevin Harrington* (versión 3)
5. Abre `firmware/lumiclass_placa/lumiclass_placa.ino` (se abren también los demás archivos de la carpeta).
6. **Herramientas → Placa → esp32 → "ESP32 Dev Module"**. Conecta la placa por USB y elige su **Puerto**
   (COM3, COM4…). Si no aparece ningún puerto, instala el driver **CP210x** o **CH340** (según el chip de tu placa)
   o prueba otro cable: muchos cables USB solo cargan.
7. Botón **Subir** (flecha →). Si se queda en "Connecting…", mantén presionado **BOOT** hasta que empiece a subir.
8. **Herramientas → Monitor serie** a **115200** baudios para ver lo que hace la placa.

Con línea de comandos (opcional, verificado en este proyecto con esp32 3.3.12):

```bash
arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install WiFiManager ArduinoJson ESP32Servo
arduino-cli compile --fqbn esp32:esp32:esp32 firmware/lumiclass_placa
arduino-cli upload  --fqbn esp32:esp32:esp32 -p COM3 firmware/lumiclass_placa
```

## 4. Preparar el servidor en el PC

1. En el archivo `.env` pon `LUMICLASS_DRIVER=real` (con `simulado`, la API de la placa no responde).
2. Arranca el servidor **abierto a la red** (no solo a este PC):

   ```bash
   php artisan serve --host=0.0.0.0 --port=8001
   ```

3. **Firewall de Windows**: la primera vez Windows pregunta si permite a "php.exe" en redes privadas → **Permitir**.
   Si no preguntó, abre PowerShell **como administrador** y ejecuta:

   ```powershell
   New-NetFirewallRule -DisplayName "LUMICLASS 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -Profile Private
   ```

   La red WiFi debe estar marcada como **Privada** en Windows (Configuración → Red e Internet → WiFi → tu red).
4. Prueba desde el celular (en el mismo WiFi) abriendo `http://IP-DEL-PC:8001`. Si carga LUMICLASS, la placa también llegará.

### ¿Cuántas peticiones a la vez? (PHP_CLI_SERVER_WORKERS)

`php artisan serve` atiende **una petición a la vez**. Con varias:

- **Linux / Mac**: `PHP_CLI_SERVER_WORKERS=4 php artisan serve --host=0.0.0.0 --port=8001 --no-reload`
  (Laravel exige `--no-reload` para usar la variable).
- **Windows**: PHP **no soporta** esta variable en Windows (necesita `fork()`, que Windows no tiene): se ignora.
  Para **una placa + el dashboard** alcanza igual: cada petición tarda unos 30 ms. Si se nota lento
  (varios salones o varias personas mirando), usa Apache de WAMP (anexo al final).

## 5. Conectar la placa desde el celular

1. En LUMICLASS: **Configurar salón → Conectar placa**.
2. Revisa la dirección marcada como **WiFi** (por ejemplo `http://192.168.1.3:8001`). Las marcadas "Virtual"
   (VirtualBox, WSL, Hyper-V) **no** sirven para la placa.
3. **Generar clave**. Aparecen un **código QR** y el **código de conexión**. Se muestran **una sola vez**.
4. Escanea el QR con la cámara del celular y **copia el texto** (`LUMICLASS;http://…;lc_…`).
5. Enciende la placa. La primera vez crea la red WiFi **LUMICLASS-Placa** (LED parpadeando rápido).
6. En el celular conéctate a **LUMICLASS-Placa**. Se abre el portal (si no, entra a `http://192.168.4.1`).
7. **Configure WiFi** → elige el WiFi del salón, escribe su contraseña y **pega el código de conexión**
   (o escribe servidor y clave por separado) → **Save**.
8. La placa se conecta. En unos segundos "Conectar placa" y el dashboard muestran **Placa en línea**.

> El WiFi del ESP32 es solo de **2,4 GHz**. Si el router tiene una red "5G", usa la de 2,4 GHz.

### LED de la placa

| LED | Significa | Qué hacer |
|---|---|---|
| Parpadeo **rápido** | Sin WiFi (o portal abierto) | Revisa el WiFi; si cambió, ver sección 7 |
| Parpadeo **lento** | Hay WiFi pero no responde el servidor | ¿Está corriendo `php artisan serve --host=0.0.0.0`? ¿Firewall? ¿Cambió la IP del PC? ¿Clave regenerada? |
| **Fijo** | Conectada | Todo bien |

Durante el **primer minuto** después de encender, los PIR se están calibrando y la placa no envía presencia.

## 6. Cómo funciona (en corto)

- La placa **pregunta** al servidor; el servidor nunca se conecta a la placa. Por eso no hay que poner la IP de
  la placa en ningún lado.
- **Heartbeat** cada 10 s. Si pasan **30 s** sin heartbeat, la placa queda "desconectada" y sus sensores y servos
  "inactivos" (el dashboard lo muestra y queda en el Historial). Al volver, se reactivan solos.
- **Órdenes**: la placa consulta cada 1 s. Mueve el servo, vuelve a reposo y **confirma**.
- **"ok" significa que el servo se movió.** Sin un sensor de luz, el sistema **no puede saber si la luz prendió**
  (por ejemplo, si el brazo resbaló o el foco está quemado). Si nadie confirma en 10 s, la luz queda "desconocida".
- Si el servidor no responde, la placa reintenta cada vez más espaciado (hasta cada 5 s) **sin reiniciarse**.
- Números: en **Configurar salón** cada luz muestra su "Pin de servo en la placa" y cada sensor su número de PIR.
  Si dos se cruzan en la maqueta, cambia el número ahí (se intercambian solos), sin tocar cables.

## 7. Si cambia el WiFi (o la IP del PC, o la clave)

1. Con la placa encendida, **mantén presionado BOOT 5 segundos** hasta que el LED parpadee rápido.
2. Repite los pasos 6 y 7 de la sección 5 (red **LUMICLASS-Placa** → nuevo WiFi y/o nuevo código de conexión).
3. Guarda: la placa se reinicia con la nueva configuración.

- **¿Cambió la IP del PC?** (pasa al reiniciar el router). Mira la nueva en "Conectar placa". Para no repetirlo,
  reserva la IP del PC en el router ("DHCP estático" / "reserva de dirección").
- **¿Perdiste la clave?** "Generar clave nueva" y vuelve a configurar la placa (la anterior deja de servir).

## 8. Calibrar los ángulos del servo

Los ángulos están en `firmware/lumiclass_placa/config_pines.h`:

```cpp
constexpr int ANGULO_REPOSO = 90;     // brazo sin tocar el interruptor
constexpr int ANGULO_ENCENDER = 45;   // empuja hacia "encendido"
constexpr int ANGULO_APAGAR = 135;    // empuja hacia "apagado"
constexpr uint32_t MS_EMPUJE = 600;   // ms empujando antes de volver a reposo
```

1. **Sin el brazo puesto**, sube el programa: al encender, el servo va a **reposo (90°)**.
2. Pon el brazo **apuntando al interruptor sin tocarlo** y atorníllalo. Pega el servo a la maqueta.
3. En LUMICLASS (Control) ordena **Encender**. Si no alcanza a mover el interruptor, baja `ANGULO_ENCENDER`
   de 5 en 5 (40, 35…). Si fuerza demasiado (zumba o se traba), súbelo.
4. Igual con **Apagar** y `ANGULO_APAGAR` (súbelo para empujar más: 140, 145…).
5. Si el servo vuelve antes de terminar de mover el interruptor, sube `MS_EMPUJE` (800, 1000).
6. Si el interruptor de tu maqueta está al revés, intercambia los valores de encender y apagar.
7. Cada cambio: **Subir** de nuevo. No pases de 0–180°; si el servo zumba en un extremo, ajusta
   `SERVO_PULSO_MIN_US` / `SERVO_PULSO_MAX_US`.

## 9. Probar en Wokwi (simulador, sin placa)

En `firmware/lumiclass_placa/` están `diagram.json` (ESP32, 2 servos, 2 PIR, LED en GPIO 2 y botón BOOT),
`wokwi.toml` y `libraries.txt`. Wokwi no tiene celular para el portal, así que:

1. En `config_pines.h` pon `#define LUMICLASS_WOKWI 1` y en `WOKWI_CLAVE` la clave de "Conectar placa".
2. **VS Code + extensión Wokwi** (recomendado, llega al servidor de tu PC como `http://host.wokwi.internal:8001`):
   compila con `arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir build firmware/lumiclass_placa`,
   abre la carpeta `firmware/lumiclass_placa` y "Wokwi: Start Simulator".
3. **wokwi.com** (navegador): proyecto ESP32 nuevo, pega los archivos y `diagram.json`, y agrega las librerías de
   `libraries.txt`. Desde el navegador no llega a tu PC: sirve para ver servos, PIR y LED.
4. Haz clic en un PIR para simular movimiento. **Vuelve a poner `LUMICLASS_WOKWI 0` antes de subirlo a la placa real.**

## Anexo: Apache de WAMP en vez de `php artisan serve` (Windows)

Apache atiende varias peticiones a la vez. Con WAMP instalado:

1. Clic en el ícono de WAMP → **Apache → httpd.conf**, agrega `Listen 0.0.0.0:8001` debajo de los otros `Listen`.
2. **Apache → httpd-vhosts.conf**, agrega (ajusta la ruta del proyecto):

   ```apache
   <VirtualHost *:8001>
       DocumentRoot "C:/Users/HP/LUMICLASS/public"
       <Directory "C:/Users/HP/LUMICLASS/public">
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

3. Verifica que el módulo **rewrite_module** esté activo (Apache → Módulos de Apache).
4. **Restart All Services** en WAMP. Abre `http://localhost:8001`.
5. Si Windows pregunta por el firewall para `httpd.exe`, permite en redes privadas (o usa el comando de la sección 4).
6. Deja de usar `php artisan serve` mientras Apache use el puerto 8001.
