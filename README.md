# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.

Aplicación web que muestra si el salón está ocupado o vacío, controla las luces (manual o automático) y registra el historial, usando sensores y servomotores. Funciona primero con hardware simulado.

**Equipo:** Camilo, Marcos y Sofía.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**. **Nunca** se conectan a la corriente de red (110/220 V). La placa y los servos usan su propia fuente de 5 V.

## Requisitos

- [Node.js](https://nodejs.org/) 20.12 o superior (incluye npm). Probado en Windows 11 con Node 24.
- Git.

## Instalación (Windows, macOS o Linux)

```
git clone https://github.com/MarcoXD23/LUMICLASS.git
cd LUMICLASS
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1/salud

La primera vez, `npm run dev` crea la base de datos SQLite (`apps/backend/prisma/dev.db`) con datos de ejemplo. La página debe mostrar **"API: conectada"**. Para cambiar puerto o driver, copia `apps/backend/.env.example` como `apps/backend/.env` (es opcional; sin él se usan los valores por defecto).

## Pantallas

| Pantalla  | Qué muestra o permite                                                                            |
| --------- | ------------------------------------------------------------------------------------------------ |
| Inicio    | Salón ocupado/vacío, luces encendidas, sensores, hardware, alertas y estado por zona             |
| Control   | Encender/apagar cada luz o toda una zona y cambiar entre automático y manual                     |
| Sensores  | Conexión, presencia y última lectura de cada sensor                                              |
| Reglas    | Crear, editar, activar/desactivar y borrar reglas automáticas                                    |
| Historial | Eventos con filtros (tipo, origen, fechas) y estadísticas: tiempo encendido, ocupación y errores |
| Simulador | Forzar presencia, fallas de sensor, respuesta de los servos e interruptor a mano                 |

Los datos se actualizan **en tiempo real** (SSE): el encabezado muestra "En vivo". Si el tiempo real se corta, la app consulta cada 5 s y muestra "Reconectando…". Si el servidor no responde, la app lo avisa y muestra los últimos datos marcados como desactualizados. El aspecto visual es **PROPUESTA** hasta tener las capturas de Figma en `diseno/`.

## Scripts

| Comando                | Qué hace                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Levanta backend y frontend juntos (Ctrl+C detiene ambos)         |
| `npm test`             | Ejecuta las pruebas de todos los paquetes                        |
| `npm run lint`         | Revisa el código con ESLint                                      |
| `npm run typecheck`    | Revisa los tipos de TypeScript                                   |
| `npm run build`        | Compila backend y frontend en `dist/`                            |
| `npm run format`       | Formatea el código con Prettier                                  |
| `npm run db:reiniciar` | Borra la base local y la vuelve a crear con los datos de ejemplo |
| `npm run verificar`    | Lint + formato + tipos + pruebas + compilación (antes de PR)     |

## API (`/api/v1`)

| Método              | Ruta                                                | Uso                                                                                                    |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET                 | `/salud`                                            | Estado de la API, base de datos y hardware                                                             |
| GET                 | `/salon/estado`                                     | Todo el dashboard en una llamada                                                                       |
| GET                 | `/zonas` · `/luces` · `/sensores` (y `/:id`)        | Listas y detalle                                                                                       |
| PATCH               | `/zonas/:id/modo`                                   | `{ "modo": "automatico" }` o `"manual"`                                                                |
| POST                | `/luces/:id/comando` · `/zonas/:id/comando`         | `{ "accion": "encender", "idSolicitud": "abc123…" }`                                                   |
| GET/POST/PUT/DELETE | `/reglas` · `/reglas/:id`                           | Reglas de automatización                                                                               |
| GET                 | `/eventos?tipo&origen&desde&hasta&pagina&porPagina` | Historial                                                                                              |
| GET                 | `/estadisticas?desde&hasta`                         | Tiempo encendido por luz, ocupación por zona, acciones por origen, errores (por defecto: últimas 24 h) |
| GET                 | `/tiempo-real`                                      | Flujo SSE: un `event: evento` por cada evento nuevo del historial                                      |

Los eventos de más de 90 días (`DIAS_RETENCION_EVENTOS`) se borran solos una vez al día. Los errores siempre responden `{ "error": { "codigo", "mensaje" } }`. Una orden repetida con el mismo `idSolicitud` no se ejecuta dos veces. Los datos de ejemplo (2 zonas; 1 luz, 1 servo y 1 sensor PIR por zona) están **CONFIRMADOS de forma provisional** hasta conocer el hardware real.

## Simulador (`DRIVER=simulado`)

Sin hardware, el simulador permite probar todo el sistema. Las reglas automáticas reaccionan como con sensores reales.

| Ruta (POST)           | Cuerpo de ejemplo                                | Qué simula                                     |
| --------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `/sim/presencia`      | `{ "zonaId": "zona-frente", "presencia": true }` | Alguien entra (sin `zonaId`: todo el salón)    |
| `/sim/sensores/:id`   | `{ "conexion": "falla" }`                        | Sensor en falla, desconectado o recuperado     |
| `/sim/actuadores/:id` | `{ "respuesta": "sin_respuesta" }`               | Servo `ok`, `falla`, `lento` o `sin_respuesta` |
| `/sim/luces/:id`      | `{ "estado": "on" }`                             | Alguien usó el interruptor a mano              |
| `/sim/reiniciar`      | —                                                | Todo vuelve al estado inicial                  |

`GET /sim/estado` muestra el estado interno del simulador.

**Reglas iniciales:** zona ocupada → encender; zona vacía durante 300 s → apagar. Solo actúan en zonas en modo automático; una orden manual pasa la zona a manual. Si un sensor falla, el sistema no apaga la luz (no sabe si hay gente).

## Estructura

```
apps/backend         API (Fastify + TypeScript)
apps/frontend        Interfaz web (React + Vite + Tailwind)
packages/compartido  Tipos y esquemas compartidos
firmware/            Código de la placa (Fase 8)
docs/                Arquitectura y documentación
diseno/              Referencia de Figma
```

La arquitectura completa está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Las reglas de trabajo están en [CLAUDE.md](CLAUDE.md).

**Estado:** Fase 7 completada (tiempo real, historial, estadísticas y manejo de errores).
