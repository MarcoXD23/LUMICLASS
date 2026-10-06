# LUMICLASS — Arquitectura (Fase 2)

> **Estado:** todo este documento es **PROPUESTA** hasta que se respondan las preguntas de la Fase 1
> (hardware, luces/zonas, login, entrega, presentación). Lo que depende del hardware queda aislado
> detrás de la interfaz del driver, así que la simulación avanza sin esos datos.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**
> (con un soporte impreso o de madera). **Nunca** se conectan a la corriente de red (110/220 V).
> La placa y los servos usan su propia fuente de 5 V.

---

## 1. Stack

| Capa          | Elección                              | Por qué                                                                                          |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Lenguaje      | TypeScript en todo el proyecto        | Un solo lenguaje para el equipo; los tipos se comparten entre front y back.                      |
| Repositorio   | npm workspaces (monorepo)             | `npm install` + `npm run dev` levanta todo en Windows.                                           |
| Backend       | Node.js 20 + Fastify                  | Liviano, rápido, valida entradas con esquemas.                                                   |
| Base de datos | SQLite + Prisma                       | Sin servidor que instalar (es un archivo); migraciones y seeds incluidos. Migrable a PostgreSQL. |
| Validación    | Zod (esquemas compartidos)            | Las mismas reglas en la API y en los formularios.                                                |
| Frontend      | React + Vite + Tailwind CSS           | Arranque rápido; Tailwind facilita replicar proporciones de Figma, mobile-first.                 |
| Pruebas       | Vitest (+ Supertest, Testing Library) | Una sola herramienta para back y front.                                                          |
| Calidad       | ESLint + Prettier                     | Estilo uniforme entre tres personas.                                                             |

**Prueba:** en Windows, `git clone` → `npm install` → `npm run dev` debe funcionar (Fase 3).

## 2. Tiempo real: SSE + REST

- **Qué:** el servidor empuja cambios al navegador por **SSE** (`EventSource`); las órdenes van por REST.
- **Por qué:** reconexión automática, HTTP normal, sin librerías y fácil de depurar. El flujo es casi
  siempre servidor → cliente. Si SSE falla, el cliente pasa a consultar cada 5 s (polling).
- **Prueba:** dos navegadores abiertos; encender una luz en uno y verla cambiar en el otro en < 1 s.
- **Implementado (Fase 7):** cada evento del historial se envía como `event: evento`; el navegador agrupa los
  avisos (300 ms) y recarga lo que muestra. Latido cada 15 s, máximo 50 conexiones (503 si se supera).
  Con SSE activo el polling baja a 30 s (respaldo); sin SSE, 5 s. El encabezado muestra "En vivo" o "Reconectando…".
- MQTT se reserva para backend ↔ placa (sección 7), no para el navegador.

## 3. Estructura de carpetas

```
LUMICLASS/
├─ package.json            # workspaces + scripts globales
├─ apps/
│  ├─ backend/
│  │  ├─ prisma/           # schema, migraciones, seed
│  │  ├─ src/
│  │  │  ├─ config/        # variables de entorno (DRIVER=simulado|real)
│  │  │  ├─ drivers/       # interfaz + simulado/ + real/
│  │  │  ├─ dominio/       # máquina de estados de luces, validaciones
│  │  │  ├─ servicios/     # luces, sensores, automatizacion, eventos
│  │  │  ├─ api/           # rutas REST + SSE
│  │  │  └─ servidor.ts
│  │  └─ test/
│  └─ frontend/
│     └─ src/
│        ├─ api/           # cliente HTTP + SSE con reconexión
│        ├─ componentes/   # TarjetaEstado, InterruptorLuz, Insignia, Alerta…
│        ├─ paginas/       # Inicio, Control, Sensores, Reglas, Historial, Simulador
│        ├─ hooks/
│        └─ estilos/       # tokens de color de estados
├─ packages/compartido/    # tipos + esquemas Zod
├─ firmware/               # Fase 8, solo con hardware confirmado
├─ docs/
└─ diseno/
```

## 4. Entidades

| Entidad               | Campos clave                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Salon**             | id, nombre, ocupado (calculado), ultimaActualizacion                                                                                 |
| **Zona**              | id, salonId, nombre, modo (`automatico` / `manual`)                                                                                  |
| **Luz**               | id, zonaId, nombre, estadoDeseado (`on`/`off`), estadoReal (`on`/`off`/`desconocido`), actuadorId                                    |
| **Sensor**            | id, zonaId, tipo, conexion (`activo`/`inactivo`/`falla`), presencia, ultimaLectura, conteoPersonas? (solo si el hardware lo permite) |
| **Actuador** (servo)  | id, conexion, ocupado (ejecutando orden), ultimoResultado                                                                            |
| **Regla**             | id, nombre, activa, prioridad, condicion (JSON), accion (JSON), horario?                                                             |
| **Evento**            | id, fecha, tipo, origen (`usuario`/`regla`/`sistema`/`simulador`), entidad, datos, severidad                                         |
| **Usuario**           | id, nombre, correo (único), hashContrasena (scrypt), rol (`admin`/`usuario`), inactivoDesde?, inactivadoPorId?                       |
| **Sesion**            | id, usuarioId, tokenHash (SHA-256 del token de la cookie), creadaEn, expiraEn (8 h), activa, cerradaEn?                              |
| **TokenRecuperacion** | id, usuarioId, tokenHash, creadoEn, expiraEn (30 min), estado (`pendiente`/`usado`/`vencido`)                                        |
| **CorreoSimulado**    | id, para, asunto, cuerpo, enlace, creadoEn (bandeja de prueba mientras no haya SMTP)                                                 |
| **VersionRegistro**   | id, entidad, entidadId, datos (JSON de la versión anterior), reemplazadoEn, reemplazadoPorId                                         |

- `estadoDeseado` y `estadoReal` van separados: el servo puede fallar y, sin sensor de luz, el estado
  real es `desconocido`. La interfaz lo muestra como advertencia en lugar de un dato falso.
- **Evento** es la única fuente del historial; de ahí salen historial, alertas y estadísticas.

## 5. Endpoints (`/api/v1`)

| Método       | Ruta                                                | Uso                                               |
| ------------ | --------------------------------------------------- | ------------------------------------------------- |
| GET          | `/salud`                                            | Estado de API, driver y base de datos             |
| GET          | `/salon/estado`                                     | Todo el dashboard en una sola llamada             |
| GET          | `/zonas` · `/luces` · `/sensores` · `/sensores/:id` | Listas y detalle                                  |
| PATCH        | `/zonas/:id/modo`                                   | `{ modo: "automatico" \| "manual" }`              |
| POST         | `/luces/:id/comando` · `/zonas/:id/comando`         | `{ accion: "encender" \| "apagar", idSolicitud }` |
| GET/POST/PUT | `/reglas[/:id]`                                     | Gestión de reglas (solo admin modifica)           |
| GET          | `/eventos?tipo&desde&hasta&pagina`                  | Historial con filtros                             |
| GET          | `/estadisticas?desde&hasta`                         | Horas encendidas, ocupación, número de fallas     |
| GET          | `/tiempo-real`                                      | Flujo SSE                                         |
| POST         | `/sim/...`                                          | Solo si `DRIVER=simulado` (sección 6)             |

**Protecciones:**

- **Solicitudes duplicadas:** cada orden lleva `idSolicitud`; si se repite, se devuelve la misma respuesta sin ejecutarla otra vez.
- **Un servo, una orden:** si el servo está ocupado, la API responde `409`.
- **Orden innecesaria:** si la luz ya está en el estado pedido, no se mueve el servo.
- **Datos inválidos:** Zod responde `400` con mensaje en español.
- **Estados imposibles:** todo cambio pasa por una máquina de estados en `dominio/` (p. ej., no se enciende una luz cuyo actuador está en falla).
- **API caída:** el frontend muestra "Sin conexión con el servidor" y conserva los últimos datos, marcados como desactualizados.

## 6. Simulación y automatización

**Interfaz del driver** (implementada por `DriverSimulado` y `DriverReal`, elegida con `DRIVER`):

```
iniciar() · detener() · estadoConexion()
alCambiarPresencia(callback) · leerSensores()
accionar(actuadorId, "encender" | "apagar") → { ok, estadoReal, error? }
```

**Controles del simulador** (página "Simulador" y rutas `/sim`):

- Forzar salón ocupado o vacío, en general o por zona.
- Forzar una luz encendida o apagada (simula que alguien usó el interruptor a mano).
- Poner un sensor en `falla` o desconectarlo.
- Elegir la respuesta del servo: `ok`, `falla`, `lento` (2 s, configurable con `SIM_DEMORA_LENTO_MS`; debe ser menor que el límite de 3 s) o `sin_respuesta` (provoca el error por tiempo).
- Reiniciar el escenario.

**Motor de reglas:**

- Escucha eventos de presencia y evalúa las reglas activas por prioridad, solo en zonas en modo automático.
- Reglas iniciales: `presencia=ocupado → encender` y `presencia=vacío durante 300 s → apagar`
  (la espera evita apagones por lecturas falsas del PIR).
- Si un sensor está en falla, la zona **no** se apaga automáticamente; queda como está y se genera una alerta.
- Una orden manual sobre una zona en automático la pasa a manual, y queda registrado en el historial.

**Prueba (Fase 5):** marcar el salón vacío en el simulador, esperar el tiempo configurado (corto en
pruebas) y comprobar que la luz se apaga y aparece el evento.

## 7. Integración con hardware real (Fase 8)

1. **Placa con WiFi (p. ej. ESP32) — pendiente de confirmar:** MQTT con broker integrado en el backend
   (Aedes), sin instalar Mosquitto en Windows.
   - Sensor publica en `lumiclass/sensor/{id}/presencia`.
   - Servo recibe órdenes en `lumiclass/actuador/{id}/comando` y confirma en `.../ack`.
   - La placa envía un heartbeat cada 10 s.
2. **Placa por USB (p. ej. Arduino sin WiFi):** `serialport` con mensajes JSON por línea. La interfaz del driver no cambia.
3. **Tiempos y fallas:**
   - Orden sin confirmar en 3 s → evento de error, luz en `desconocido` y alerta.
   - Sin heartbeat durante 30 s → sensores y servo marcados `inactivos`.
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

## 9. Autenticación, roles y borrado lógico (Fases 4 y 5)

- **Contraseñas:** `scrypt` de Node (sin dependencias nativas, funciona igual en Windows), con sal aleatoria por usuario.
- **Sesión:** cookie `httpOnly` + `SameSite=Lax` con un token aleatorio; en la base solo se guarda su hash.
  Dura 8 h; al vencer o cerrar sesión queda `activa = false` (no se borra). Ctrl+F5 no la pierde.
- **Rutas protegidas:** toda la API (incluido `/tiempo-real`) exige sesión, salvo `/salud` y `/auth/*`.
  Sin sesión → `401 NO_AUTENTICADO`; sin permiso → `403 SOLO_ADMIN`.
- **Fuerza bruta:** 5 intentos fallidos de login por correo e IP en 15 min → `429`.
- **Recuperación:** `POST /auth/recuperar` siempre responde lo mismo (no revela si el correo existe). Token de un solo
  uso, 30 min. Correo simulado: consola del servidor + bandeja `/correos` (solo con `CORREO_MODO=simulado`).
- **Roles:** _admin_ (intocable; único que gestiona reglas y usuarios) y _usuario_ (registro abierto: ve todo,
  controla luces, cambia el modo y usa el simulador). El primer admin se crea con los datos iniciales desde `.env`.
- **Borrado lógico:** `inactivoDesde` / `inactivadoPorId` en usuarios, reglas, zonas, luces, sensores y servos.
  Antes de reemplazar un dato se guarda la versión anterior en `VersionRegistro`. Sin DELETE en la aplicación.
  Los eventos no se borran; órdenes duplicadas y tokens vencidos se marcan como vencidos.

| Método      | Ruta                                              | Uso                                              |
| ----------- | ------------------------------------------------- | ------------------------------------------------ |
| POST        | `/auth/registro` · `/auth/login` · `/auth/logout` | Cuenta y sesión                                  |
| GET         | `/auth/sesion`                                    | Usuario actual (o 401)                           |
| POST        | `/auth/recuperar` · `/auth/restablecer`           | Recuperación de contraseña                       |
| GET         | `/auth/correos-simulados`                         | Bandeja de prueba (solo modo simulado)           |
| GET / PATCH | `/usuarios` · `/usuarios/:id`                     | Admin: listar, desactivar/reactivar, cambiar rol |
| POST        | `/reglas/:id/desactivar`                          | Admin: "eliminar" una regla (borrado lógico)     |

## Pendiente

- Respuestas a las preguntas de la Fase 1 (hardware, luces/zonas, login, entrega, presentación, exigencias del profesor).
- Capturas o código exportado de Figma en `diseno/`.
