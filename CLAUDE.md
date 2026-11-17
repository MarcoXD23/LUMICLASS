# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.
Proyecto universitario de Camilo, Marcos y Sofía. Aplicación web (frontend + backend + API + base de datos)
que usa sensores de presencia y, por cada luz, un ESP32 con relé (diseño definitivo de Sofía). Funciona con hardware simulado y con el real.

## Reglas fijas (valen en todas las fases)

1. Trabajar por FASES. Al terminar una fase, DETENERSE y esperar que el usuario escriba "continúa". Nunca empezar la siguiente por cuenta propia.
2. Antes de crear o modificar archivos, listar cuáles se van a tocar y esperar el "apruebo". Hacer solo lo que pide la fase actual.
3. No inventar datos técnicos. Marcar siempre "CONFIRMADO" o "PROPUESTA". Si falta un dato de hardware, preguntar; no bloquear la simulación.
4. Explicar cada decisión importante en máximo 3 líneas: qué, por qué y cómo probarla. Son estudiantes, pero quieren avanzar.
5. Código modular, nombres claros, componentes reutilizables, nada en un solo archivo. Interfaz en español, mobile-first, responsive.
6. Validar y no romperse ante: sensor o actuador desconectado, API caída, datos inválidos, solicitudes duplicadas, estados imposibles.
7. Al cerrar cada fase: ejecutar pruebas, compilación y revisión de errores; corregir y volver a probar. Resumir en máximo 10 líneas: qué se hizo, archivos creados/modificados, cómo probarlo, qué falta.
8. Git: ramas por fase o funcionalidad (`feature/...`). Indicar los comandos y la rama sugerida. NO hacer push ni comandos destructivos sin preguntar.
9. Windows debe ser plataforma soportada; instalación en pocos comandos.
10. Seguridad eléctrica: no se toca la instalación del salón. El relé del ESP32 maneja una lámpara de bajo voltaje (5–12 V) en una maqueta; 110/220 V solo con supervisión de un profesor o electricista. Recordarlo en la documentación (docs/HARDWARE.md).

## Diseño

La referencia está en la carpeta `diseno/` (código exportado o capturas de Figma). Reutilizar estructura, jerarquía, tarjetas, navegación y proporciones, pero cambiar por completo el contenido a iluminación de un salón. No copiar textos ni imágenes de meditación. Si `diseno/` está vacía, pedir las capturas necesarias; no adivinar.
Debe distinguirse a simple vista: ocupado/vacío, luces on/off, automático/manual, errores, sensores activos/inactivos.

## Funciones

- Cuentas: registro libre; cada cuenta tiene varios salones y solo ve y controla lo suyo (un solo rol). Lo de otra cuenta responde 404.
- Dashboard: estado del salón, luces, modo, sensores, actuadores, personas detectadas (solo si el hardware lo permite), última actualización, alertas.
- Control de luces individual o por zona: encender, apagar, cambiar modo.
- Sensores: estado, última lectura, presencia, datos relevantes.
- Automatización por reglas editables (ocupado → encender y vacío → apagar es solo la primera regla).
- Historial: cambios de estado, encendidos, apagados, presencia, modo, errores.
- Tiempo real: elegir entre WebSocket, SSE, MQTT o polling según estabilidad y facilidad para presentar.

## Hardware y simulación

- El backend usa una interfaz de "driver" para sensores y actuadores, con dos implementaciones: simulada y real, elegidas por configuración.
- La simulación permite forzar salón ocupado/vacío, luces on/off, fallas de sensor y respuesta del actuador, y probar el modo automático.

## Fases

1. Análisis: objetivo, diseño de referencia, qué se puede reutilizar y lista ÚNICA de preguntas (hardware, cantidad de luces/zonas, login, fecha de entrega, forma de presentación). Sin código.
2. Tecnologías y arquitectura: stack justificado, estructura de carpetas, entidades, endpoints, tiempo real, simulación e integración con hardware real. Sin código.
3. Estructura inicial del proyecto y configuración (git, scripts, lint).
4. Backend, API y base de datos con migraciones y seeds mínimos, con pruebas.
5. Simulador de sensores y actuadores + motor de automatización, con pruebas.
6. Frontend adaptado de `diseno/`, conectado a la API con datos del simulador.
7. Tiempo real, historial, estadísticas y manejo de errores.
8. Capa de integración para hardware real (solo con componentes confirmados).
9. Pruebas completas y corrección de errores.
10. Preparación de la presentación: README, guía de demo, guion de pruebas.

Estado actual: Fases 1–10 completadas en Laravel 13 (PHP 8.4, puerto 8001, cookie lumiclass_session): API /api/v1 con cuentas multiusuario (Sanctum), simulador, motor de reglas, estadísticas, historial CSV e interfaz Blade + Alpine + Tailwind con diseño propio PROPUESTA (no hay capturas en `diseno/`). Hardware (Fase 8, CONFIRMADO, diseño de Sofía): cada luz con su ESP32 con relé, por IP local (`DriverReal` + `ClienteEsp32`) o por internet (`DriverRemoto`, latido en /api/v1/dispositivo/latido); `DriverSegunActuador` elige por luz y las luces sin ESP32 usan el driver del .env. La primera Fase 8 (placa por salón con servos, commit 0a373b3) se retiró; la migración 2026_11_18_000001 limpia sus tablas. Base de datos: MySQL de WAMP (puerto 3308, InnoDB) en el equipo del usuario; SQLite sigue siendo opción. Pruebas: php artisan test, npm run prueba:js y npm run prueba:navegador (docs/PRUEBAS.md). Recuperar contraseña de 3 formas (enlace, código de 6 dígitos y correo alternativo verificado), "Seguridad de mi cuenta", "Configurar salón" (zonas, luces, sensores y ESP32 de cada luz) y comando lumiclass:cambiar-contrasena. Hosting sin terminal: SQL para phpMyAdmin en database/sql/ (cambios_hosting.sql y luego esp32_sofia.sql). Manuales: docs/MANUAL_USUARIO.md y docs/MANUAL_PROGRAMADOR.md; hardware: docs/HARDWARE.md. Pendiente: sensores PIR conectados a un ESP32 (hoy la presencia viene del simulador) y capturas de Figma si existen.
