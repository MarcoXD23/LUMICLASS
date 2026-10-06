# LUMICLASS — Guion de pruebas manuales

Para ejecutar frente al profesor (o antes de entregar). Preparación: `php artisan lumiclass:demo`, servidor encendido
(`php artisan serve --port=8001`), `LUMICLASS_FACTOR_TIEMPO_REGLAS=0.1` en `.env`, sesión con `demo@lumiclass.test` /
`demo12345`. Llenar la columna **Obtenido** y marcar ✔ o ✘.

Las mismas situaciones están cubiertas por pruebas automáticas (ver [PRUEBAS.md](PRUEBAS.md)).

## Funciones

| ID | Qué se prueba | Pasos | Resultado esperado | Obtenido | ✔/✘ |
| -- | ------------- | ----- | ------------------ | -------- | --- |
| F01 | Registro | `/registro` → llenar nombre, correo nuevo, contraseña de 8+ caracteres dos veces → "Crear cuenta" | Entra a Inicio de su "Salón 101" con 2 zonas y 4 luces | | |
| F02 | Ingreso | "Salir" → `/ingresar` con la cuenta demo | Entra a "Mis salones" | | |
| F03 | Crear salón | Mis salones → Nombre "Aula 204", Zonas 3, Luces por zona 1 → "Crear" | Aparece "Aula 204 · 3 zona(s) · 3 luz(ces)" | | |
| F04 | Encendido automático | Simulador → "Entra gente" → ir a Inicio | Salón "Ocupado" y luces 4/4 en ≤ 3 s | | |
| F05 | Apagado automático con espera | Simulador → "Queda vacío" → esperar 30 s en Inicio | Luces 0/4; antes de los 30 s siguen encendidas | | |
| F06 | Control individual | Control → "Apagar" en una luz encendida | Aviso "… apagada."; la zona pasa a "Manual" | | |
| F07 | Control por zona | Control → "Encender zona" | Las luces de esa zona quedan "Encendida" | | |
| F08 | Cambiar modo | Control → "Automático" en una zona manual | La insignia cambia a "Automático"; las reglas vuelven a actuar | | |
| F09 | Crear regla | Reglas → "Nueva regla" → Nombre, "Vacío", 2 minutos, "Apagar las luces" → "Guardar" | Aparece en la lista: "Si está vacío durante 2 min → apagar" | | |
| F10 | Desactivar regla | Reglas → "Activa" en una regla | Pasa a "Inactiva" y se ve atenuada | | |
| F11 | Sensores | Sensores | Cada sensor con conexión, presencia y "última lectura hace X" | | |
| F12 | Historial y filtro | Historial → Severidad "Error" → "Filtrar" | Solo eventos de error | | |
| F13 | CSV | Historial → "Descargar CSV" → abrir en Excel | Columnas fecha, tipo, origen, severidad, mensaje; tildes correctas | | |
| F14 | Estadísticas | Estadísticas → "7 días" → tocar una barra → "Ver como tabla" | Totales, detalle del día y tabla por día | | |
| F15 | Celular | Abrir en el celular (o F12 → vista celular, 375 px) | Barra inferior; sin scroll horizontal; botones fáciles de tocar | | |

## Robustez (regla 6 del proyecto)

| ID | Qué se prueba | Pasos | Resultado esperado | Obtenido | ✔/✘ |
| -- | ------------- | ----- | ------------------ | -------- | --- |
| R01 | Sensor desconectado | Simulador → sensor "Sensor PIR 1" → "Falla" | Inicio: alerta roja; sensores activos 1/2; ese sensor no cuenta como "vacío" | | |
| R02 | No apaga con sensor en falla | Simulador → "Reiniciar" → "Presencia en esta zona" en la zona frontal (se encienden) → "Sensor PIR 1" → "Falla" → esperar 30 s | La zona queda "Sin datos" y sus luces **siguen encendidas** (podría haber gente que el sensor no ve) | | |
| R03 | Servo en falla | Simulador → "Servo 1: respuesta" → "Falla" → Control → "Encender" en esa luz | Aviso rojo; luz "Desconocido"; alerta en Inicio | | |
| R04 | Servo lento | Simulador → "Servo 2: respuesta" → "Lento" → Control → "Encender" en esa luz | "Servo trabajando…"; los botones de esa luz se bloquean; a los 5 s queda "Encendida" | | |
| R05 | Servo sin respuesta | Simulador → "No responde" → orden desde Control → esperar 10 s | Luz "Desconocido" y evento "Servo sin respuesta" en Historial | | |
| R06 | Servo desconectado | Simulador → "Conexión del servo" → "Desconectado" → orden desde Control | Mensaje "… está inactivo; no se puede accionar." | | |
| R07 | Servidor caído | Ctrl+C en la consola del servidor con Inicio abierto | Banda roja "Datos desactualizados"; los datos siguen visibles | | |
| R08 | Servidor recuperado | Volver a ejecutar `php artisan serve --port=8001` | Aviso "Conexión recuperada" (puede tardar hasta 30 s) | | |
| R09 | Datos inválidos | Reglas → "Nueva regla" → "Guardar" sin nombre | Error en español bajo el campo: "El campo nombre es obligatorio." | | |
| R10 | Registro inválido | `/registro` con el correo de la cuenta demo en MAYÚSCULAS | "Ese correo ya está en uso." | | |
| R11 | Doble clic | Control → doble clic rápido en "Encender" | Una sola orden en Historial | | |
| R12 | Interruptor de pared | Zona en "Automático" y ocupada → Simulador → "Off" en una luz | La luz se apaga y la regla la vuelve a encender en ≤ 3 s | | |

## Seguridad y cuentas

| ID | Qué se prueba | Pasos | Resultado esperado | Obtenido | ✔/✘ |
| -- | ------------- | ----- | ------------------ | -------- | --- |
| S01 | Salones de otra cuenta | Con la cuenta de F01, copiar la URL de su salón (p. ej. `/salones/5`); ingresar con la demo y abrir esa URL | "Página no encontrada" (404) | | |
| S02 | Sin sesión | "Salir" y abrir `/salones` | Lleva a `/ingresar` | | |
| S03 | Contraseña incorrecta | `/ingresar` con contraseña mala | "Correo o contraseña incorrectos." | | |
| S04 | Muchos intentos | 6 ingresos fallidos seguidos | "Demasiados intentos. Espera un minuto…" | | |
| S05 | Código en nombres | Crear un salón llamado `<b>hola</b>` | Se ve el texto tal cual, sin negrita | | |
| S06 | Recuperar contraseña | Ingresar → "¿Olvidaste tu contraseña?" → correo de una cuenta → "Enviar enlace" → abrir el enlace del correo (o de `storage/logs/laravel.log`) → contraseña nueva dos veces → "Guardar contraseña" | Entra a "Mis salones"; la contraseña vieja ya no sirve; abrir el mismo enlace otra vez dice "El enlace no es válido o ya venció" | | |
| S07 | Recuperar con correo inexistente | "¿Olvidaste tu contraseña?" con un correo que no tiene cuenta | El mismo mensaje que con un correo real (no revela qué correos existen) | | |
