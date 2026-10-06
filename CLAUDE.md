# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.
Proyecto universitario de Camilo, Marcos y Sofía. Aplicación web (frontend + backend + API + base de datos)
que usa sensores de presencia y servomotores. Funciona primero con hardware simulado y luego con el real.
Debe sentirse como una app real, responsive (PC, tablet, celular) y compatible con Windows.

## Reglas fijas (valen en todas las fases)

1. Trabajar por FASES. Al terminar una fase, DETENERSE y esperar que el usuario escriba "continúa". Nunca empezar la siguiente por cuenta propia.
2. Antes de crear o modificar archivos, listar cuáles se van a tocar y esperar el "apruebo". Hacer solo lo que pide la fase actual.
3. No inventar datos técnicos. Marcar siempre "CONFIRMADO" o "PROPUESTA". Si falta un dato de hardware, preguntar; no bloquear la simulación.
4. Explicar cada decisión importante en máximo 3 líneas: qué, por qué y cómo probarla. Son estudiantes, pero quieren avanzar.
5. Código modular, nombres claros, componentes reutilizables, nada en un solo archivo. Interfaz en español, mobile-first, responsive.
6. Validar y no romperse ante: sensor o actuador desconectado, API caída, datos inválidos, solicitudes duplicadas, estados imposibles.
7. Al cerrar cada fase: ejecutar pruebas, compilación y revisión de errores (incluidos navegador y endpoints); corregir y volver a probar. Resumir en máximo 10 líneas: qué se hizo, archivos creados/modificados, cómo probarlo, qué falta, comandos Git y rama.
8. Git: ramas por fase o funcionalidad (`feature/...`). Indicar los comandos y la rama sugerida. NO hacer push ni comandos destructivos sin preguntar.
9. Windows debe ser plataforma soportada; instalación en pocos comandos.
10. Seguridad eléctrica: los servos solo accionan el interruptor mecánicamente, nunca se conectan a la corriente de red. Recordarlo en la documentación.
11. Borrado lógico: nunca se elimina información. "Eliminar" = marcar como inactivo. Si un dato se reemplaza, la versión anterior queda inactiva con fecha y autor. Las consultas normales muestran solo lo activo; el historial puede ver lo inactivo. Sin DELETE en el código de la aplicación.

## Autenticación (obligatoria)

- Registro abierto (queda como rol _usuario_), inicio de sesión, cierre de sesión y recuperación de contraseña. Al iniciar sesión se entra al dashboard.
- Usuarios y sesiones se guardan en la base de datos del servidor, nunca solo en el navegador: Ctrl+F5 o limpiar datos no borra nada.
- Contraseñas con hash (nunca en texto plano), validación de datos, rutas protegidas (API, tiempo real y pantallas) y errores claros en español.
- Sesión de 8 h, sin "recordarme" (PC compartido del salón). PROPUESTA aceptada por el equipo.
- Recuperación: enlace con token de un solo uso que vence en 30 min; correo simulado (consola/pantalla) mientras no haya SMTP real. Preguntar antes de configurar correo real. CONFIRMADO.
- Los inicios de sesión quedan en el historial.

## Roles (PROPUESTA aceptada; confirmar con Juan David)

- **Admin:** la cuenta admin nunca se desactiva ni se reemplaza (siempre existe al menos una). Solo el admin desactiva o reemplaza datos, crea/edita/desactiva reglas, configura zonas, luces y sensores, y gestiona usuarios. El primer admin se crea con los datos iniciales; su contraseña se define en `.env`, nunca en el código.
- **Usuario (docente):** ve todo, enciende/apaga luces, cambia automático/manual y usa el simulador.

## Diseño

Referencia: Figma Make "Meditation app design" (requiere sesión; no accesible sin el conector de Figma autorizado) o la carpeta `diseno/` (código exportado o capturas). Reutilizar estructura, jerarquía, tarjetas, navegación, proporciones y estilo, pero cambiar por completo el contenido a iluminación de un salón. Incluir login, registro y recuperación con el mismo estilo. No copiar textos ni imágenes de meditación. Si no hay acceso ni capturas, pedirlas; no adivinar.
Debe distinguirse a simple vista: ocupado/vacío, luces on/off, automático/manual, errores, sensores activos/inactivos. Sin abusar de animaciones.

## Funciones

- Dashboard: estado del salón, luces, modo, sensores, actuadores, personas detectadas (solo si el hardware lo permite), última actualización, alertas.
- Control de luces individual o por zona: encender, apagar, cambiar modo.
- Sensores: estado, última lectura, presencia, datos relevantes.
- Automatización por reglas editables (ocupado → encender y vacío → apagar es solo la primera regla).
- Historial: cambios de estado, encendidos, apagados, presencia, modo, errores e inicios de sesión.
- Estadísticas cuando sea viable. Tiempo real: SSE con polling de respaldo (ver `docs/ARQUITECTURA.md`).

## Hardware y simulación

- El backend usa una interfaz de "driver" para sensores y actuadores, con dos implementaciones: simulada y real, elegidas por configuración.
- La simulación permite forzar salón ocupado/vacío, luces on/off, fallas de sensor y respuesta del actuador, y probar el modo automático.
- No inventar componentes: preguntar modelo de sensor, microcontrolador, servos, cantidad de luces/zonas, pines, protocolo y voltajes.

## Fases

1. Análisis: requisitos, diseño de referencia, qué se reutiliza y lista ÚNICA de preguntas. Sin código.
2. Arquitectura y tecnologías: stack justificado, carpetas, entidades/tablas (con borrado lógico), endpoints, tiempo real, simulación e integración con hardware. Sin código.
3. Estructura inicial del proyecto y configuración (git, scripts, lint, base de datos).
4. Autenticación completa: registro, login, recuperación, sesión y entrada al dashboard, con pruebas.
5. Backend, API y modelos del salón (luces, sensores, actuadores, eventos) con borrado lógico y pruebas.
6. Simulador de sensores y actuadores + motor de automatización, con pruebas.
7. Frontend adaptado del diseño, conectado a la API con datos del simulador.
8. Tiempo real, historial, estadísticas y manejo de errores.
9. Integración con hardware real (solo componentes confirmados).
10. Pruebas completas, corrección de errores y preparación de la presentación (README, guía de demo, guion de pruebas).

## Estado actual (2026-10-06)

| Fase                      | Estado                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 Análisis                | Completada (versión ampliada)                                                                       |
| 2 Arquitectura            | Completada (incluye autenticación, roles y borrado lógico)                                          |
| 3 Estructura              | Completada                                                                                          |
| 4 Autenticación           | Completada (registro, login, recuperación simulada, roles, sesiones en BD)                          |
| 5 Backend del salón       | Completada (con borrado lógico y versiones)                                                         |
| 6 Simulador y reglas      | Completada                                                                                          |
| 7 Frontend                | Lógica completa; estilo visual PROPUESTA hasta tener el diseño de Figma                             |
| 8 Tiempo real e historial | Completada (incluye inicios de sesión)                                                              |
| 9 Hardware real           | En pausa hasta tener el hardware                                                                    |
| 10 Presentación           | Completada: README, `docs/GUIA_DEMO.md` (demo y guion de pruebas), `npm run dev:red` para celulares |

## Decisiones del equipo

- Se trabaja en este repositorio (`LUMICLASS\LUMICLASS`); la carpeta padre `LUMICLASS\` queda en desuso. CONFIRMADO.
- Datos de ejemplo: 2 zonas (Frente y Fondo), con 1 luz, 1 servo y 1 sensor PIR cada una. CONFIRMADO de forma provisional hasta conocer el hardware real.
- Hardware (placa, sensor, servos): aún no disponible; por ahora la app funciona con el simulador. CONFIRMADO.
- Fecha de entrega: 2026-10-06. CONFIRMADO.
- Borrado lógico: aplica a datos de configuración (usuarios, reglas, zonas, luces, sensores, servos) con versiones; los cambios de estado quedan como eventos que nunca se borran. Sin limpieza de eventos antiguos; órdenes duplicadas y tokens vencidos se marcan como vencidos. PROPUESTA.

- Presentación: en vivo con simulador desde un portátil y celulares en la misma WiFi. CONFIRMADO.

Pendiente: diseño de Figma (capturas o acceso) y hardware real; confirmar con Juan David la interpretación del rol admin.
