# LUMICLASS — Arquitectura

> **Estado:** lo implementado está marcado **CONFIRMADO**; el resto es **PROPUESTA** hasta que se respondan
> las preguntas de la Fase 1 (hardware, luces/zonas, login, entrega, presentación). Lo que depende del
> hardware queda aislado detrás de la interfaz del driver, así que la simulación avanza sin esos datos.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**
> (con un soporte impreso o de madera). **Nunca** se conectan a la corriente de red (110/220 V).
> La placa y los servos usan su propia fuente de 5 V.

---

## 1. Stack (CONFIRMADO)

| Capa          | Elección                                 | Por qué                                                                         |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| Backend + API | PHP 8.4 + Laravel 13                     | Decisión del equipo; migraciones, validación y pruebas incluidas.               |
| Base de datos | SQLite (archivo `database/database.sqlite`) | Sin servidor que instalar en Windows. Migrable a MySQL cambiando `.env`.       |
| Validación    | Form Requests de Laravel                 | Reglas por endpoint, mensajes en español (`lang/es/validation.php`).            |
| Pruebas       | PHPUnit (`php artisan test`)             | Viene con Laravel; base en memoria, no toca los datos locales.                  |
| Estilo        | Laravel Pint (`vendor/bin/pint`)         | Formato uniforme entre tres personas.                                           |
| Frontend      | Blade + Vite (PROPUESTA, Fase 6)         | Se define con las capturas de `diseno/`.                                        |

- Puerto **8001** y cookie **`lumiclass_session`** para convivir con otro proyecto Laravel en el mismo equipo.
- El proyecto anterior en Node.js quedó en el commit `d4e4b20` (rama `feature/fase-4-backend-api`).

## 2. Tiempo real (PROPUESTA, Fase 7)

- **Qué:** consulta periódica (polling) cada 2–3 s a `/api/v1/salon/estado`; las órdenes van por REST.
  Esa misma consulta hace avanzar el tick (sección 6).
- **Por qué:** `php artisan serve` en Windows atiende **una petición a la vez**; una conexión SSE abierta lo
  bloquearía. El polling es estable y fácil de presentar. Si se despliega con un servidor multi-proceso, se puede pasar a SSE.
- **Prueba:** dos navegadores abiertos; encender una luz en uno y verla cambiar en el otro en ≤ 3 s.

## 3. Estructura de carpetas (CONFIRMADO)

```
LUMICLASS/
├─ app/
│  ├─ Console/Commands/      # lumiclass:tick
│  ├─ Drivers/               # DriverHardware + DriverSimulado + DriverReal (Fase 8)
│  ├─ Enums/                 # estados posibles: modo, luz, conexión, ocupación, orden, eventos
│  ├─ Exceptions/            # ComandoRechazado (409)
│  ├─ Http/
│  │  ├─ Controllers/Api/    # un controlador por recurso
│  │  ├─ Requests/           # validación de entradas
│  │  ├─ Resources/          # formato JSON de salida
│  │  └─ RespuestaError.php  # formato único de error
│  ├─ Models/
│  └─ Servicios/             # luces, zonas, sensores, motor de reglas, tick, simulador, eventos, dashboard
├─ config/lumiclass.php      # LUMICLASS_DRIVER=simulado|real
├─ database/                 # migraciones, factories, seeders
├─ lang/es/                  # mensajes en español
├─ routes/api.php            # /api/v1/...
├─ tests/Feature/Api/        # pruebas de cada endpoint
├─ firmware/                 # Fase 8, solo con hardware confirmado
├─ docs/
└─ diseno/
```

## 4. Entidades (CONFIRMADO, Fase 4)

| Tabla                    | Campos clave                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `salones`                | id, nombre. La ocupación se **calcula** a partir de los sensores.                                              |
| `zonas`                  | id, salon_id, nombre, modo (`automatico` / `manual`)                                                           |
| `luces`                  | id, zona_id, actuador_id (único), nombre, estado_deseado (`encendida`/`apagada`), estado_real (+ `desconocida`) |
| `sensores`               | id, zona_id, nombre, tipo, conexion (`activo`/`inactivo`/`falla`), presencia (null = sin lectura), presencia_desde, conteo_personas?, ultima_lectura |
| `actuadores` (servos)    | id, nombre, conexion, ocupado, orden_pendiente, orden_iniciada_en, ultimo_resultado (`ok` o el error)          |
| `reglas`                 | id, zona_id? (null = todas), nombre, activa, prioridad (menor = primero), condicion (JSON), accion (JSON)      |
| `eventos`                | id, tipo, origen (`usuario`/`regla`/`sistema`/`simulador`), severidad, entidad_tipo, entidad_id, mensaje, datos, created_at |
| `solicitudes_procesadas` | id_solicitud (único), ruta, codigo_http, respuesta: evita ejecutar dos veces la misma orden                    |

- `estado_deseado` y `estado_real` van separados: el servo puede fallar y, sin sensor de luz, el estado
  real es `desconocida`. La interfaz lo muestra como advertencia en lugar de un dato falso.
- **Ocupación:** `ocupado` si algún sensor activo detecta presencia, `vacio` si todos los activos con lectura
  dicen que no, `desconocida` si ningún sensor activo tiene lectura (un sensor en falla **no** cuenta como vacío).
- **eventos** es la única fuente del historial; de ahí salen historial, alertas y estadísticas.
- **Usuario / login:** pendiente de confirmar. Si se confirma, se agrega con Laravel Sanctum.
- Formato de regla (PROPUESTA): `condicion = {"presencia": "ocupado"|"vacio", "duracion_segundos"?: 0..86400}`,
  `accion = {"accion": "encender"|"apagar"}`.

## 5. Endpoints `/api/v1` (CONFIRMADO, Fase 4)

| Método            | Ruta                                              | Uso                                                       |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------- |
| GET               | `/salud`                                          | Estado de API, base de datos y driver (503 si la BD falla) |
| GET               | `/salon/estado`                                   | Todo el dashboard en una sola llamada                     |
| GET               | `/zonas` · `/zonas/{id}` · `/luces` · `/luces/{id}` · `/sensores` · `/sensores/{id}` | Listas y detalle |
| PATCH             | `/zonas/{id}/modo`                                | `{ "modo": "automatico" \| "manual" }`                    |
| POST              | `/luces/{id}/comando` · `/zonas/{id}/comando`     | `{ "accion": "encender" \| "apagar", "id_solicitud": "<uuid>" }` → `resultado`: `completada` · `pendiente` (HTTP 202) · `fallida` · `sin_cambio` |
| GET/POST/PUT/DELETE | `/reglas[/{id}]`                                | Gestión de reglas                                         |
| GET               | `/eventos?tipo&origen&severidad&desde&hasta&por_pagina&page` | Historial paginado (más reciente primero)      |
| GET               | `/estadisticas?rango`                             | PROPUESTA, Fase 7                                         |
| *                 | `/sim/...`                                        | Simulador, ver sección 6 (solo con `LUMICLASS_DRIVER=simulado`; si no, 404) |

**Formato de error** (todas las rutas `/api`): `{"error": {"codigo": "...", "mensaje": "...", "detalles"?: {...}}}`.

**Protecciones (CONFIRMADO, con pruebas en `tests/Feature/Api/`):**

- **Datos inválidos o JSON mal formado:** `400` `datos_invalidos`, con el detalle por campo en español.
- **Solicitudes duplicadas:** cada orden lleva `id_solicitud` (UUID). Si se repite, se devuelve la misma
  respuesta con la cabecera `X-Solicitud-Repetida: true`, sin ejecutarla otra vez. Reusar el id en otra
  ruta da `409 id_solicitud_reutilizado`. Las órdenes rechazadas no se guardan: se pueden reintentar.
- **Un servo, una orden:** servo ocupado → `409 actuador_ocupado`.
- **Estados imposibles:** servo en falla o inactivo → `409 actuador_no_disponible`; luz sin servo → `409 sin_actuador`.
  Todo rechazo queda en el historial como `comando.rechazado`.
- **Orden innecesaria:** si el estado **real** ya es el pedido, responde `200` con `"cambio": false` y no mueve el servo.
  Si el estado real es `desconocida`, la orden sí se envía (así el usuario recupera una luz tras una falla).
- **Orden por zona:** una luz rechazada no detiene a las demás; el detalle va en `resultados`.
- **Orden manual en zona automática:** la zona pasa a manual (si no, una regla la revertiría) y queda en el historial.
- **Ids no numéricos o inexistentes:** `404 no_encontrado`. Método incorrecto: `405`.
- **Errores internos:** `500 error_interno` sin detalles; el detalle queda en `storage/logs`.
- **API caída (Fase 6–7):** el frontend muestra "Sin conexión con el servidor" y conserva los últimos datos, marcados como desactualizados.

## 6. Simulación y automatización (CONFIRMADO, Fase 5)

**Interfaz del driver** (`app/Drivers/DriverHardware.php`, elegida con `LUMICLASS_DRIVER`):

```
accionar(actuador, "encender" | "apagar") → completada | pendiente | fallida
consultarPendiente(actuador)              → completada | pendiente | fallida
```

- `DriverSimulado`: responde según lo configurado para cada servo. `DriverReal`: llega en la Fase 8
  (por ahora toda orden responde `fallida` con el aviso).
- Las lecturas de los sensores no pasan por el driver: entran por `ServicioSensores`, desde el simulador
  o (Fase 8) desde la placa.

**Respuestas del servo simulado** (configurables en `.env`):

| Respuesta       | Qué pasa                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------ |
| `ok`            | La luz cambia al instante (por defecto).                                                    |
| `falla`         | Luz `desconocida`, evento `actuador.falla` (error) y alerta en el dashboard.               |
| `lento`         | HTTP 202; el servo queda ocupado `LUMICLASS_SERVO_SEGUNDOS_LENTO` (5 s) y luego confirma.   |
| `sin_respuesta` | HTTP 202; a los `LUMICLASS_SERVO_SEGUNDOS_ESPERA` (10 s) la orden vence: luz `desconocida`, evento `actuador.sin_respuesta`. |

La espera es de 10 s (y no 3 s) para que una respuesta `lento` de 5 s alcance a confirmar.

**Rutas del simulador** (`/api/v1/sim`, base para la página "Simulador" de la Fase 6):

| Método | Ruta                          | Cuerpo / uso                                                                 |
| ------ | ----------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/sim/estado`                 | Driver, tiempos y respuesta configurada de cada servo                        |
| POST   | `/sim/presencia`              | `{ "presencia": true\|false, "zona_id"?, "conteo_personas"? }` (sin zona = todo el salón) |
| PATCH  | `/sim/sensores/{id}`          | `{ "conexion": "activo"\|"inactivo"\|"falla" }`                               |
| PATCH  | `/sim/actuadores/{id}`        | `{ "respuesta"?: "ok"\|"falla"\|"lento"\|"sin_respuesta", "conexion"? }`       |
| POST   | `/sim/luces/{id}/interruptor` | `{ "estado": "encendida"\|"apagada" }`: alguien usó el interruptor a mano     |
| POST   | `/sim/tick`                   | Ejecuta un tick ahora                                                        |
| POST   | `/sim/reiniciar`              | Todo activo, sin lecturas, luces apagadas, zonas en automático              |

**Motor de reglas** (`app/Servicios/MotorReglas.php`):

- Solo en zonas en modo automático y con ocupación conocida. Evalúa las reglas activas de la zona y las
  globales por prioridad (menor número primero); **gana la primera cuya condición se cumple por completo**,
  incluida la duración (`duracion_segundos × LUMICLASS_FACTOR_TIEMPO_REGLAS`).
- Se ejecuta al cambiar la presencia o la conexión de un sensor, y en cada tick (reglas con duración).
- Reglas iniciales (seeder): `ocupado → encender` y `vacio durante 300 s → apagar`
  (la espera evita apagones por lecturas falsas del PIR).
- **Sensor en falla en la zona:** no se apaga nada automáticamente (podría haber gente que ese sensor no ve); el dashboard muestra la alerta.
- **No insiste:** si la orden de una regla falló (luz `desconocida`), no la repite en cada tick; el usuario sí puede reintentarla.
- Si alguien usa el interruptor a mano en una zona automática, el siguiente tick vuelve a aplicar la regla.

**Tick** (`app/Servicios/ServicioTick.php`): confirma o vence órdenes pendientes y evalúa reglas con duración.
Se ejecuta (1) al consultar `/salon/estado`, como máximo una vez por segundo, así la demo funciona con una sola
terminal; (2) con `php artisan schedule:work` cada 2 s, opcional; (3) a mano con `php artisan lumiclass:tick`.
Un candado evita que dos ticks procesen lo mismo a la vez.

**Prueba:** `php artisan test` (las pruebas de tiempo usan un reloj simulado). A mano: ver la guía de demo en el README.

## 7. Integración con hardware real (PROPUESTA, Fase 8)

1. **Placa con WiFi (p. ej. ESP32) — pendiente de confirmar:** la placa llama a la API por HTTP
   (reporta presencia y heartbeat) y consulta o recibe las órdenes pendientes. MQTT queda como alternativa
   si el profesor lo exige (requiere instalar un broker como Mosquitto).
2. **Placa por USB (p. ej. Arduino sin WiFi):** un comando de Artisan lee el puerto serie con mensajes JSON por línea. La interfaz del driver no cambia.
3. **Tiempos y fallas:**
   - Orden sin confirmar en `LUMICLASS_SERVO_SEGUNDOS_ESPERA` → evento de error, luz en `desconocida` y alerta (ya implementado en Fase 5).
   - Sin heartbeat durante 30 s → sensores y servo marcados `inactivo`.
4. **Seguridad eléctrica:** ver el aviso al inicio de este documento.

## 8. Pantallas (sujetas al diseño de `diseno/`)

**Inicio** (dashboard), **Control** (luces y zonas), **Sensores**, **Reglas**, **Historial**, **Simulador**.

| Estado              | Color    | Además                        |
| ------------------- | -------- | ----------------------------- |
| Luz encendida       | Amarillo | Ícono de foco + texto         |
| Luz apagada         | Gris     | Ícono de foco apagado + texto |
| Salón ocupado       | Verde    | Ícono de persona + texto      |
| Salón vacío         | Azul     | Ícono + texto                 |
| Error / falla       | Rojo     | Ícono de alerta + texto       |
| Automático / manual | —        | Insignia con ícono            |

Siempre ícono y texto además del color, para que se entienda a simple vista y sea accesible.

## Pendiente

- Respuestas a las preguntas de la Fase 1 (hardware, luces/zonas, login, entrega, presentación, exigencias del profesor).
- Capturas o código exportado de Figma en `diseno/`.
