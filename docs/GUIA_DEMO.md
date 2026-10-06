# LUMICLASS — Guía de demo (10–12 minutos)

Guion para presentar LUMICLASS en vivo. Los nombres entre comillas son los botones tal como aparecen en pantalla.
El reparto entre presentadores es **PROPUESTA**: cámbienlo según quién domine cada parte.

## Antes de la presentación (15 min antes)

1. En `.env`, acortar las esperas de las reglas para que se vean en vivo (5 min → 30 s):
   ```
   LUMICLASS_FACTOR_TIEMPO_REGLAS=0.1
   ```
2. Preparar la cuenta demo (simulador limpio + 7 días de historia de ejemplo para Estadísticas):
   ```
   php artisan lumiclass:demo --zona-horaria=America/Bogota
   ```
3. Encender el servidor (con `--host=0.0.0.0` si se va a mostrar desde un celular):
   ```
   php artisan serve --host=0.0.0.0 --port=8001
   ```
4. Dejar abiertas **dos ventanas** del navegador, ingresadas con `demo@lumiclass.test` / `demo12345`:
   - **Ventana A (proyector):** Inicio del Salón 101.
   - **Ventana B (al lado o en el celular):** Simulador del mismo salón.
5. Tener una **segunda consola** lista para volver a ejecutar `php artisan serve --host=0.0.0.0 --port=8001` (paso 9).
6. Comprobar: Inicio muestra "Sin datos", luces 0/4 y alertas 0; Estadísticas → "7 días" muestra barras.

## Guion

| Min | Quién (PROPUESTA) | Qué hacer | Qué decir |
| --- | ----------------- | --------- | --------- |
| 0:00 | Presentador 1 | Ventana A en Inicio. | El problema: luces encendidas en salones vacíos. LUMICLASS detecta presencia y acciona el interruptor de pared con un servo. **Seguridad eléctrica:** el servo solo empuja el interruptor; nunca toca los 110/220 V. Hoy el hardware está simulado. |
| 1:00 | Presentador 1 | Abrir una pestaña privada → `/registro` → crear una cuenta → "Crear cuenta". | Cualquiera se registra y recibe un salón de ejemplo. Cada cuenta solo ve **sus** salones. |
| 2:00 | Presentador 2 | Volver a la ventana A (cuenta demo). Recorrer Inicio. | Colores con ícono y texto: verde ocupado, azul vacío, amarillo encendida, rojo falla. Se actualiza solo cada 3 s. |
| 3:00 | Presentador 2 | Ventana B (Simulador): "Entra gente". Mirar la ventana A. | El sensor detecta presencia y la regla "Encender al detectar presencia" enciende las 4 luces **sola**, en 1–3 s. |
| 4:00 | Presentador 2 | Ventana B: "Queda vacío". En la ventana A abrir **Reglas** mientras tanto. | La regla espera (aquí 30 s, en la vida real 5 min) para no apagar por un falso negativo del sensor. Las reglas se editan: prioridad, zona, duración. |
| 5:00 | Presentador 2 | Volver a Inicio: las luces ya se apagaron. | Pasaron los 30 s sin presencia → regla "Apagar tras 5 minutos sin presencia". |
| 5:30 | Presentador 3 | Ventana B: en "Luz frontal izquierda", "Servo 1: respuesta" → "Falla". Ventana A: **Control** → "Encender" en esa luz. | Aviso rojo; la luz queda **"Desconocido"** (no fingimos que se encendió) y en Inicio aparece "Requiere atención". |
| 6:30 | Presentador 3 | Ventana B: volver a "Responde bien". Ventana A: "Encender" otra vez. | El sistema se recupera: el usuario puede reintentar. |
| 7:00 | Presentador 3 | En **Control**, "Encender" una luz de la zona posterior (el salón sigue vacío). Esperar 30 s. | Una orden manual pasa la zona a **Manual**: aunque el salón esté vacío, la regla ya no la apaga. "Automático" la devuelve a las reglas. |
| 8:00 | Presentador 1 | **Estadísticas** → "7 días" → tocar una barra → "Ver como tabla". | Horas encendidas, horas ocupado y **horas encendidas con la zona vacía** (lo que el sistema ahorra). Los días anteriores son datos de ejemplo cargados para la demo (lo dice el historial). |
| 9:00 | Presentador 1 | **Historial** → Severidad "Error" → "Filtrar" → "Descargar CSV". | Todo queda registrado: quién (usuario, regla, sistema, simulador), qué y cuándo. Sirve para el informe. |
| 9:45 | Presentador 3 | En la consola del servidor, **Ctrl+C**. Esperar la banda roja en la ventana A. Volver a encenderlo. | Si el servidor se cae, la página no se rompe: avisa "Datos desactualizados", reintenta sola y dice "Conexión recuperada". |
| 10:45 | Presentador 2 | (Opcional) Mostrar el celular. | Funciona igual en celular: barra inferior y botones grandes. |
| 11:15 | Presentador 1 | Cierre. | 126 pruebas automáticas del backend, 38 del JavaScript y un recorrido en navegador real. Siguiente paso: la placa real (Fase 8), que se conecta sin cambiar la aplicación (interfaz `DriverHardware`). |

## Plan B

| Si pasa esto | Hacer |
| ------------ | ----- |
| El servidor no arranca ("Failed to listen…") | Otra consola lo tiene abierto: cerrarla, o usar `--port=8003` y entrar a ese puerto. |
| Error 500 al entrar | Revisar `storage/logs/laravel.log`. Con MySQL caído, cambiar en `.env` a `DB_CONNECTION=sqlite`, `php artisan migrate --seed` y `php artisan lumiclass:demo`. |
| La página se ve sin estilos | `npm run build`. |
| Las luces no se encienden/apagan solas | Revisar que la zona esté en "Automático" (Control). En el Simulador, "Avanzar ahora (tick)". |
| El celular no conecta | Mostrar la vista de celular en el computador: F12 → ícono de celular. |
| Nada funciona | Mostrar las capturas de `docs/capturas/` y explicar el flujo. |

## Preguntas probables

| Pregunta | Respuesta corta |
| -------- | --------------- |
| ¿Por qué un servo y no un relé? | Seguridad: el servo mueve el interruptor existente desde afuera; nadie toca la instalación de 110/220 V. |
| ¿Qué pasa si el sensor falla? | Se marca en rojo, no se usa su lectura y **no se apaga nada automáticamente** (podría haber gente que no ve). |
| ¿Y si dos personas pulsan a la vez? | Cada orden lleva un id único y el servo acepta una sola orden a la vez: la segunda recibe "el servo está ejecutando otra orden". |
| ¿Cómo es el "tiempo real"? | La página consulta cada 3 s. Es lo más estable con el servidor de desarrollo en Windows; si se cae, reintenta con espera creciente. |
| ¿Cómo se conecta el hardware real? | Con la interfaz `DriverHardware`: se cambia `LUMICLASS_DRIVER=real` y el resto no cambia (Fase 8). |
| ¿Es seguro? | Contraseñas cifradas, sesión con protección CSRF, 5 intentos de login por minuto, y una cuenta nunca ve lo de otra (todo responde 404). |
| ¿Cuánta energía ahorra? | Se mide en horas (Estadísticas). Los kWh se calcularán cuando se confirme la potencia de los focos reales. |

## Después de la presentación

Volver a `LUMICLASS_FACTOR_TIEMPO_REGLAS=1` en `.env`.
