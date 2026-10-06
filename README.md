# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.

Aplicación web que muestra si el salón está ocupado o vacío, controla las luces (manual o automático por reglas), registra todo en un historial y se actualiza en tiempo real. Usa sensores de presencia y servomotores; mientras llega el hardware funciona con un **simulador**.

**Equipo:** Camilo, Marcos y Sofía.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**. **Nunca** se conectan a la corriente de red (110/220 V). La placa y los servos usan su propia fuente de 5 V.

## Requisitos

- [Node.js](https://nodejs.org/) 20.12 o superior (incluye npm). Probado en Windows 11 con Node 24.
- Git.

## Instalación y primer arranque (Windows, macOS o Linux)

```
git clone https://github.com/MarcoXD23/LUMICLASS.git
cd LUMICLASS
npm install
npm run configurar
npm run dev
```

1. `npm run configurar` crea `apps/backend/.env` desde `.env.example` (solo la primera vez). **Cambia `ADMIN_CONTRASENA`** antes de presentar.
2. `npm run dev` crea la base SQLite (`apps/backend/prisma/dev.db`) con el salón de ejemplo y el **administrador inicial**.
3. Abre http://localhost:5173 e inicia sesión con `ADMIN_CORREO` / `ADMIN_CONTRASENA` del `.env` (por defecto `admin@lumiclass.local`).

Si no hay `.env`, la contraseña del admin se genera al azar y se muestra **una sola vez** en la consola.

### Abrirla desde celulares (misma WiFi)

```
npm run dev:red
```

La consola muestra las direcciones de red (`Network: http://192.168.x.x:5173`). Usa la que dice **Wi-Fi** (no las de adaptadores virtuales como VirtualBox) y ábrela en el celular. Si Windows pregunta por el firewall, permite el acceso a Node.js en **redes privadas**.

## Cuentas y roles

| Rol         | Puede                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| **Admin**   | Todo; además crea/edita/elimina reglas y gestiona usuarios. La cuenta admin no se desactiva ni cambia de rol. |
| **Usuario** | Ver todo, encender/apagar luces, cambiar automático/manual y usar el simulador. Se crea desde "Regístrate".   |

- Usuarios y sesiones se guardan en la base del servidor (cookie `httpOnly`): **Ctrl+F5 o limpiar el navegador no borra datos**. La sesión dura 8 h.
- Contraseñas con hash `scrypt` (nunca en texto plano); 5 intentos fallidos bloquean 15 min.
- **Recuperar contraseña:** "Olvidé mi contraseña" envía un enlace de un solo uso (30 min). Mientras no haya correo real, el correo es **simulado**: aparece en la consola del servidor y en la bandeja de prueba http://localhost:5173/correos.

## Borrado lógico

Nada se elimina de la base: "eliminar" una regla o desactivar una cuenta solo la marca como inactiva (con fecha y autor). Antes de editar una regla o una cuenta se guarda la versión anterior. Los eventos del historial se guardan siempre. Las listas normales muestran solo lo vigente; "Mostrar también…" muestra el resto.

## Pantallas

| Pantalla                     | Qué muestra o permite                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Login · Registro · Recuperar | Acceso, cuenta nueva y contraseña olvidada                                                       |
| Inicio                       | Salón ocupado/vacío, luces encendidas, sensores, hardware, alertas y estado por zona             |
| Control                      | Encender/apagar cada luz o toda una zona y cambiar entre automático y manual                     |
| Sensores                     | Conexión, presencia y última lectura de cada sensor                                              |
| Reglas                       | Ver reglas; el admin las crea, edita, activa/desactiva y elimina                                 |
| Historial                    | Eventos con filtros (tipo, origen, fechas) y estadísticas: tiempo encendido, ocupación y errores |
| Usuarios (admin)             | Desactivar/reactivar cuentas y nombrar administradores                                           |
| Simulador                    | Forzar presencia, fallas de sensor, respuesta de los servos e interruptor a mano                 |

Los datos se actualizan **en tiempo real** (SSE): el encabezado muestra "En vivo". Si se corta, la app consulta cada 5 s ("Reconectando…"); si el servidor no responde, lo avisa y marca los datos como desactualizados. El aspecto visual es **PROPUESTA** hasta tener el diseño de Figma (ver `diseno/`).

**Guía de demo y guion de pruebas:** [docs/GUIA_DEMO.md](docs/GUIA_DEMO.md).

## Scripts

| Comando                | Qué hace                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run configurar`   | Crea `apps/backend/.env` desde el ejemplo (si no existe)           |
| `npm run dev`          | Levanta backend y frontend juntos (Ctrl+C detiene ambos)           |
| `npm run dev:red`      | Igual, pero accesible desde otros equipos de la red (celulares)    |
| `npm test`             | Ejecuta las pruebas de todos los paquetes                          |
| `npm run verificar`    | Lint + formato + tipos + pruebas + compilación                     |
| `npm run build`        | Compila backend y frontend en `dist/`                              |
| `npm run db:reiniciar` | Herramienta de desarrollo: vuelve a crear la base local desde cero |

## API (`/api/v1`)

Todas las rutas exigen sesión salvo `/salud` y `/auth/*`. Sin sesión → `401`; sin permiso → `403`.

| Método           | Ruta                                                                                                 | Uso                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| GET              | `/salud`                                                                                             | Estado de la API, base de datos y hardware (pública)      |
| POST             | `/auth/registro` · `/auth/login` · `/auth/logout`                                                    | Cuenta y sesión                                           |
| GET              | `/auth/sesion`                                                                                       | Usuario conectado                                         |
| POST             | `/auth/recuperar` · `/auth/restablecer`                                                              | Recuperación de contraseña                                |
| GET              | `/auth/correos-simulados`                                                                            | Bandeja de prueba (solo con correo simulado)              |
| GET              | `/salon/estado`                                                                                      | Todo el dashboard en una llamada                          |
| GET              | `/zonas` · `/luces` · `/sensores` (y `/:id`)                                                         | Listas y detalle                                          |
| PATCH            | `/zonas/:id/modo`                                                                                    | `{ "modo": "automatico" }` o `"manual"`                   |
| POST             | `/luces/:id/comando` · `/zonas/:id/comando`                                                          | `{ "accion": "encender", "idSolicitud": "abc123…" }`      |
| GET · POST · PUT | `/reglas` · `/reglas/:id` (`?incluirEliminadas=true`)                                                | Reglas (modificar: solo admin)                            |
| POST · GET       | `/reglas/:id/eliminar` · `/reglas/:id/versiones`                                                     | Borrado lógico y versiones anteriores (admin)             |
| GET · PATCH      | `/usuarios` · `/usuarios/:id`                                                                        | Gestión de cuentas (admin)                                |
| GET              | `/eventos?tipo&origen&desde&hasta&pagina&porPagina`                                                  | Historial                                                 |
| GET              | `/estadisticas?desde&hasta`                                                                          | Tiempo encendido, ocupación, acciones por origen, errores |
| GET              | `/tiempo-real`                                                                                       | Flujo SSE con cada evento nuevo                           |
| POST             | `/sim/presencia` · `/sim/sensores/:id` · `/sim/actuadores/:id` · `/sim/luces/:id` · `/sim/reiniciar` | Simulador (solo con `DRIVER=simulado`)                    |

Los errores siempre responden `{ "error": { "codigo", "mensaje" } }`. Una orden repetida con el mismo `idSolicitud` no se ejecuta dos veces.

## Simulador y reglas

- **Datos de ejemplo** (CONFIRMADOS de forma provisional hasta conocer el hardware real): 2 zonas (Frente y Fondo), cada una con 1 luz, 1 servo y 1 sensor PIR.
- **Reglas iniciales:** zona ocupada → encender; zona vacía durante 300 s → apagar. Solo actúan en zonas en modo automático; una orden manual pasa la zona a manual. Si un sensor falla, el sistema no apaga la luz (no sabe si hay gente).
- **Hardware real:** en pausa hasta confirmar placa, sensores y servos. Solo habrá que escribir el driver real y poner `DRIVER=real`; pantallas, API y reglas no cambian.

## Estructura

```
apps/backend         API (Fastify + Prisma/SQLite + TypeScript)
apps/frontend        Interfaz web (React + Vite + Tailwind)
packages/compartido  Tipos y esquemas de validación compartidos
scripts/             Utilidades (configurar)
firmware/            Código de la placa (cuando haya hardware)
docs/                Arquitectura y guía de demo
diseno/              Referencia de Figma
```

Arquitectura: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Reglas de trabajo: [CLAUDE.md](CLAUDE.md).
