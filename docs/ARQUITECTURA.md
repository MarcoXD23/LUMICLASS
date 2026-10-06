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
| Cuentas       | Laravel Sanctum                          | Navegador: cookie de sesión `lumiclass_session` + CSRF. Scripts y placa: token Bearer. |
| Pruebas       | PHPUnit (`php artisan test`)             | Viene con Laravel; base en memoria, no toca los datos locales.                  |
| Estilo        | Laravel Pint (`vendor/bin/pint`)         | Formato uniforme entre tres personas.                                           |
| Frontend      | Blade + Vite (PROPUESTA, Fase 6)         | Se define con las capturas de `diseno/`.                                        |

- Puerto **8001** y cookie **`lumiclass_session`** para convivir con otro proyecto Laravel en el mismo equipo.
- El proyecto anterior en Node.js quedó en el commit `d4e4b20` (rama `feature/fase-4-backend-api`).

## 2. Tiempo real (CONFIRMADO, Fase 7)

- **Qué:** consulta periódica (polling) cada 3 s a `/api/v1/salones/{id}/estado` (historial: cada 5 s en su primera
  página); las órdenes van por REST. Esa misma consulta hace avanzar el tick (sección 6).
- **Por qué:** `php artisan serve` en Windows atiende **una petición a la vez**; una conexión SSE abierta lo
  bloquearía. El polling es estable y fácil de presentar. Si se despliega con un servidor multi-proceso, se puede pasar a SSE.
- **Robustez** (`resources/js/sondeo.js`): si una consulta falla, se espera cada vez más (3 → 6 → 12 → máx. 30 s);
  se pausa con la pestaña oculta o sin red y consulta apenas vuelve; al recuperarse avisa "Conexión recuperada".
  Mientras tanto se conservan los últimos datos con la marca "Datos desactualizados (última actualización hace X s)".
- **Prueba:** dos navegadores abiertos; encender una luz en uno y verla cambiar en el otro en ≤ 3 s. Apagar el
  servidor: aparece la banda roja; encenderlo: "Conexión recuperada".

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

## 4. Entidades (CONFIRMADO)

**Cuentas (CONFIRMADO):** LUMICLASS se ofrece a varias personas. Registro libre; cada cuenta tiene **varios
salones** y puede hacer todo, pero **solo** sobre lo suyo. Un único rol (sin administrador).

| Tabla                    | Campos clave                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `users`                  | id, name, email (único, en minúsculas), password (cifrada)                                                     |
| `salones`                | id, user_id (dueño), nombre (único por cuenta). La ocupación se **calcula** a partir de los sensores.         |
| `zonas`                  | id, salon_id, nombre, modo (`automatico` / `manual`)                                                           |
| `luces`                  | id, zona_id, actuador_id (único), nombre, estado_deseado (`encendida`/`apagada`), estado_real (+ `desconocida`) |
| `sensores`               | id, zona_id, nombre, tipo, conexion (`activo`/`inactivo`/`falla`), presencia (null = sin lectura), presencia_desde, conteo_personas?, ultima_lectura |
| `actuadores` (servos)    | id, salon_id, nombre, conexion, ocupado, orden_pendiente, orden_iniciada_en, ultimo_resultado (`ok` o el error) |
| `reglas`                 | id, salon_id, zona_id? (null = todas las zonas de su salón), nombre, activa, prioridad (menor = primero), condicion (JSON), accion (JSON) |
| `eventos`                | id, salon_id, tipo, origen (`usuario`/`regla`/`sistema`/`simulador`), severidad, entidad_tipo, entidad_id, mensaje, datos, created_at |
| `solicitudes_procesadas` | user_id + id_solicitud (únicos juntos), ruta, codigo_http, respuesta: evita ejecutar dos veces la misma orden  |
| `personal_access_tokens` | tokens de Sanctum para scripts y (Fase 8) la placa                                                             |
| `cambios_luz` · `cambios_ocupacion` | desde cuándo cada luz/zona está en cada estado: base de las estadísticas (sección 5)          |

- Borrar un salón borra en cascada sus zonas, luces, servos, sensores, reglas e historial. Borrar una cuenta borra sus salones.

- `estado_deseado` y `estado_real` van separados: el servo puede fallar y, sin sensor de luz, el estado
  real es `desconocida`. La interfaz lo muestra como advertencia en lugar de un dato falso.
- **Ocupación:** `ocupado` si algún sensor activo detecta presencia, `vacio` si todos los activos con lectura
  dicen que no, `desconocida` si ningún sensor activo tiene lectura (un sensor en falla **no** cuenta como vacío).
- **eventos** es la única fuente del historial; de ahí salen historial, alertas y estadísticas.
- Formato de regla (PROPUESTA): `condicion = {"presencia": "ocupado"|"vacio", "duracion_segundos"?: 0..86400}`,
  `accion = {"accion": "encender"|"apagar"}`.

## 5. Endpoints `/api/v1` (CONFIRMADO)

**Públicos:**

| Método | Ruta              | Uso                                                                                       |
| ------ | ----------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/salud`          | Estado de API, base de datos y driver (503 si la BD falla)                                 |
| POST   | `/auth/registro`  | `{ nombre, email, password, password_confirmation }` → crea la cuenta + salón de ejemplo e inicia sesión |
| POST   | `/auth/login`     | `{ email, password }` → sesión del navegador (antes: `GET /sanctum/csrf-cookie`)          |
| POST   | `/auth/token`     | `{ email, password, nombre_dispositivo? }` → token para scripts y placa                    |
| POST   | `/auth/olvide`    | `{ email }` → envía el enlace para crear contraseña nueva. Respuesta **siempre igual** (no revela si el correo existe) |
| POST   | `/auth/restablecer` | `{ token, email, password, password_confirmation }` → cambia la contraseña, revoca tokens, cierra otras sesiones e ingresa |

Las rutas de `/auth` sin sesión admiten 5 intentos por minuto (`429 demasiados_intentos`). El enlace de recuperación
vence a los 60 min, sirve una sola vez y no se reenvía más de una vez por minuto al mismo correo (`config/auth.php`).
Un enlace inválido, vencido o de otra cuenta responde siempre `400 enlace_invalido` con el mismo mensaje.

**Con sesión o token** (sin ellos: `401 no_autenticado`):

| Método              | Ruta                                              | Uso                                                       |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| POST · GET          | `/auth/logout` · `/auth/yo`                       | Cerrar sesión (o revocar el token) · datos de la cuenta   |
| GET · POST          | `/salones`                                        | Mis salones · crear `{ nombre, zonas?: 1..10, luces_por_zona?: 1..10 }` (máx. 20 por cuenta) |
| GET · PATCH · DELETE | `/salones/{id}`                                  | Ver · renombrar `{ nombre }` · borrar con todo lo suyo    |
| GET                 | `/salones/{id}/estado`                            | Todo el dashboard de un salón en una sola llamada         |
| GET                 | `/salones/{id}/zonas` · `/luces` · `/sensores` · `/reglas` | Listas del salón                                 |
| GET                 | `/salones/{id}/eventos?tipo&origen&severidad&desde&hasta&por_pagina&page` | Historial paginado (más reciente primero) |
| POST                | `/salones/{id}/reglas`                            | Crear regla (su `zona_id` debe ser de ese salón)          |
| GET                 | `/zonas/{id}` · `/luces/{id}` · `/sensores/{id}` · `/reglas/{id}` | Detalle                                   |
| PATCH               | `/zonas/{id}/modo`                                | `{ "modo": "automatico" \| "manual" }`                    |
| POST                | `/luces/{id}/comando` · `/zonas/{id}/comando`     | `{ "accion": "encender" \| "apagar", "id_solicitud": "<uuid>" }` → `resultado`: `completada` · `pendiente` (HTTP 202) · `fallida` · `sin_cambio` |
| PUT · DELETE        | `/reglas/{id}`                                    | Reemplazar · borrar regla                                 |
| GET                 | `/salones/{id}/eventos.csv?…mismos filtros`       | Historial en CSV (Excel: `;` y UTF-8 con BOM; máx. 10 000 filas) |
| GET                 | `/salones/{id}/estadisticas?rango=hoy\|7d\|30d&zona_horaria=America/Bogota` | Estadísticas (ver abajo)        |
| *                   | `/salones/{id}/sim/...` · `/sim/...`              | Simulador, ver sección 6 (solo con `LUMICLASS_DRIVER=simulado`; si no, 404) |

**Aislamiento entre cuentas:** cada `{id}` de la ruta se busca solo entre los recursos de la cuenta que
inició sesión (`Route::bind` en `routes/api.php`). Lo de otra cuenta responde `404 no_encontrado`, igual
que si no existiera, para no revelar qué existe. Lo prueba `tests/Feature/Api/AislamientoTest.php`.

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
- **Cuentas:** correo repetido (sin importar mayúsculas) → `400`; login fallido → `401 credenciales_invalidas`
  con el mismo mensaje exista o no el correo; sesión vencida o sin token CSRF → `419 sesion_expirada`.
- **Errores internos:** `500 error_interno` sin detalles; el detalle queda en `storage/logs`.
- **API caída:** el frontend muestra "Sin conexión con el servidor" y conserva los últimos datos, marcados como desactualizados (sección 2).
- **Sesión vencida en el navegador (419):** el cliente pide un token CSRF nuevo y reintenta la orden una vez, sin molestar al usuario.
- **Errores de JavaScript no previstos y pérdida de red:** se muestran como aviso en español.
- **Páginas web de error** (404, 419, 429, 500, 503) en español, con estilos en línea para verse aunque falle Vite.

**Estadísticas (CONFIRMADO, Fase 7)** — `app/Servicios/EstadisticasSalon.php`:

- Se basan en dos tablas de cambios: `cambios_luz` (luz_id, estado, created_at; la escribe el modelo `Luz` al cambiar
  `estado_real`) y `cambios_ocupacion` (zona_id, ocupacion, created_at; la escribe `RegistroOcupacion` cuando cambian los sensores).
- Con ellas arma tramos de tiempo y calcula: horas encendidas (por luz y total), horas ocupado (unión de zonas),
  **horas encendidas con la zona vacía** (intersección: el "desperdicio" que el sistema evita), encendidos/apagados,
  fallas y órdenes manuales frente a órdenes por regla.
- Los días se cortan a la medianoche **local del usuario** (`zona_horaria` la envía el navegador); el servidor guarda en UTC.
- Una luz o zona "desconocida" no suma. El consumo en kWh queda pendiente: requiere la potencia real de los focos.

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

**Rutas del simulador** (`/api/v1`, con sesión; base para la página "Simulador" de la Fase 6):

| Método | Ruta                             | Cuerpo / uso                                                                 |
| ------ | -------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/salones/{id}/sim/estado`       | Driver, tiempos y respuesta configurada de cada servo del salón              |
| POST   | `/salones/{id}/sim/presencia`    | `{ "presencia": true\|false, "zona_id"?, "conteo_personas"? }` (sin zona = todo el salón) |
| POST   | `/salones/{id}/sim/tick`         | Ejecuta un tick ahora                                                        |
| POST   | `/salones/{id}/sim/reiniciar`    | Solo ese salón: todo activo, sin lecturas, luces apagadas, zonas en automático |
| PATCH  | `/sim/sensores/{id}`             | `{ "conexion": "activo"\|"inactivo"\|"falla" }`                               |
| PATCH  | `/sim/actuadores/{id}`           | `{ "respuesta"?: "ok"\|"falla"\|"lento"\|"sin_respuesta", "conexion"? }`       |
| POST   | `/sim/luces/{id}/interruptor`    | `{ "estado": "encendida"\|"apagada" }`: alguien usó el interruptor a mano     |

**Motor de reglas** (`app/Servicios/MotorReglas.php`):

- Solo en zonas en modo automático y con ocupación conocida. Evalúa las reglas activas de la zona y las
  globales **de su mismo salón** por prioridad (menor número primero); **gana la primera cuya condición se cumple por completo**,
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

## 8. Pantallas (CONFIRMADO, Fase 6; diseño PROPUESTA)

> No hay capturas de Figma en `diseno/`: el diseño es **propio (PROPUESTA)**, mobile-first. Los colores de
> estado están en `resources/css/app.css` (`@theme`) para cambiarlos en un solo lugar cuando llegue Figma.

**Tecnología:** Blade + Alpine.js + Tailwind (Vite), servido por el mismo Laravel en el puerto 8001. Las vistas
solo entregan la estructura; cada pantalla pide sus datos a `/api/v1` con la cookie de sesión y CSRF
(`resources/js/api.js`) y se refresca cada 3 s (`resources/js/sondeo.js`).

| Ruta web                         | Pantalla                                                                  |
| -------------------------------- | ------------------------------------------------------------------------- |
| `/ingresar` · `/registro`        | Cuentas (sin sesión). Con sesión llevan a `/salones`.                     |
| `/salones`                       | Mis salones: crear (zonas y luces por zona), renombrar, borrar            |
| `/salones/{id}`                  | **Inicio**: ocupación, luces encendidas, sensores activos, alertas, zonas |
| `/salones/{id}/control`          | **Control**: cada luz y cada zona, automático/manual                      |
| `/salones/{id}/sensores`         | **Sensores**: conexión, presencia, última lectura, personas               |
| `/salones/{id}/reglas`           | **Reglas**: crear, editar, activar/desactivar, borrar                     |
| `/salones/{id}/historial`        | **Historial** con filtros, paginación, actualización sola y descarga CSV  |
| `/salones/{id}/estadisticas`     | **Estadísticas**: totales, horas por día (barras apiladas + tabla) y por luz |
| `/salones/{id}/simulador`        | **Simulador** (solo con `LUMICLASS_DRIVER=simulado`)                      |

Sin sesión, toda página lleva a `/ingresar`; el salón de otra cuenta responde 404.
Navegación: barra inferior en celular y barra lateral en escritorio.

**Componentes reutilizables** (`resources/views/components/`): `icono` (SVG en línea, sin internet),
`insignia-luz`, `insignia-ocupacion`, `insignia-modo`, `insignia-conexion`, `campo`, `navegacion`, `avisos`,
`aviso-conexion`. Un componente Alpine por pantalla en `resources/js/paginas/`.

| Estado              | Color    | Además                        |
| ------------------- | -------- | ----------------------------- |
| Luz encendida       | Amarillo | Ícono de foco + texto         |
| Luz apagada         | Gris     | Ícono de foco apagado + texto |
| Salón ocupado       | Verde    | Ícono de persona + texto      |
| Salón vacío         | Azul     | Ícono + texto                 |
| Error / falla       | Rojo     | Ícono de alerta + texto       |
| Automático / manual | —        | Insignia con ícono            |

Siempre ícono y texto además del color, para que se entienda a simple vista y sea accesible. Una luz
"desconocida" (el servo falló o no respondió) se muestra en naranja con el motivo.

## Pendiente

- Respuestas a las preguntas de la Fase 1 (hardware, luces/zonas, login, entrega, presentación, exigencias del profesor).
- Capturas o código exportado de Figma en `diseno/`.
