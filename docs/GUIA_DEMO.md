# LUMICLASS — Guía de demo y guion de pruebas

Duración sugerida: **12–15 minutos**. Funciona con el **simulador** (sin hardware).

> ⚠️ Recordar en la presentación: los servos **solo empujan el interruptor de forma mecánica**; nunca se conectan a 110/220 V.

## Antes de presentar (10 min antes)

1. En el portátil (Windows): `npm install` (solo si es la primera vez en ese equipo) y `npm run configurar`.
2. Edita `apps/backend/.env` y cambia `ADMIN_CONTRASENA`. Anótala.
3. Arranca con `npm run dev:red` (o `npm run dev` si no usarán celulares).
4. Anota la dirección `Network: http://192.168.x.x:5173` marcada como **Wi-Fi** en la consola (ignora las de adaptadores virtuales). Si Windows pregunta por el firewall, **permitir en redes privadas**.
5. Abre en el portátil http://localhost:5173 e inicia sesión como admin. Comprueba que el encabezado diga **"En vivo"**.
6. En **Simulador**, pulsa **Reiniciar simulación** para empezar limpio (no borra el historial).
7. En el celular (misma WiFi) abre la dirección de red y deja la pantalla de login lista.

Reparto sugerido: **Camilo** maneja el portátil, **Sofía** el celular y **Marcos** narra.

## Guion de la demo

| #   | Quién / dónde    | Acción                                                                                | Qué debe verse                                                                                                    |
| --- | ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Celular          | **Regístrate** con un correo nuevo                                                    | Entra directo al dashboard como **Usuario**; no ve "Usuarios" en el menú                                          |
| 2   | Portátil (admin) | Mostrar **Inicio**                                                                    | Salón **Vacío** (azul), 0 de 2 luces encendidas, sin alertas, "En vivo"                                           |
| 3   | Portátil         | **Simulador → zona Frente → "Entra gente"**                                           | En ambos equipos, en <1 s: zona Frente **Ocupada** y su luz **Encendida** (amarillo)                              |
| 4   | Celular          | **Control → "Apagar Luces frente"**                                                   | La luz se apaga y la zona pasa a **Manual**: la regla ya no la vuelve a encender                                  |
| 5   | Celular          | En la zona Frente, botón **Automático**                                               | Las reglas se aplican de inmediato: la luz vuelve a encenderse (hay gente)                                        |
| 6   | Portátil         | **Simulador → servo frente: "No responde"** y luego **Control → apagar Luces frente** | Mensaje claro de error; la luz queda **"Estado desconocido"** y aparece una alerta                                |
| 7   | Portátil         | **Simulador → sensor PIR fondo: "En falla"**                                          | Alerta roja "Sensor en falla"; la zona Fondo muestra **"Sin datos de presencia"** y las reglas no la apagan solas |
| 8   | Portátil         | **Reglas → Nueva regla** (p. ej. "Encender el fondo de 14:00 a 18:00")                | Se crea; el celular la ve pero **sin botones** (solo el admin cambia reglas)                                      |
| 9   | Portátil         | **Eliminar** esa regla y marcar **"Mostrar también las reglas eliminadas"**           | Sale de la lista pero **sigue guardada** como "Eliminada" (borrado lógico)                                        |
| 10  | Portátil         | **Historial → Eventos** (filtrar por origen "Regla automática")                       | Encendidos, apagados, presencia, errores, cambios de modo e **inicios de sesión**                                 |
| 11  | Portátil         | **Historial → Estadísticas**                                                          | Tiempo con luz encendida, tiempo con presencia, quién encendió/apagó y errores                                    |
| 12  | Celular          | **Cerrar sesión → "Olvidé mi contraseña"** con el correo del paso 1                   | Mensaje neutro; en **bandeja de correos de prueba** está el enlace (simulado)                                     |
| 13  | Celular          | Abrir el enlace y crear una contraseña nueva; iniciar sesión                          | Entra con la nueva contraseña; el enlace no sirve una segunda vez                                                 |
| 14  | Portátil (admin) | **Usuarios → Desactivar** la cuenta del celular                                       | El celular vuelve al login ("Tu sesión venció"); la cuenta sigue guardada como desactivada                        |
| 15  | Portátil         | **Ctrl+F5**                                                                           | La sesión y todos los datos siguen ahí (se guardan en el servidor)                                                |

**Cierre (1 min):** el hardware real se conecta escribiendo un driver nuevo y cambiando `DRIVER=real`; pantallas, API y reglas no cambian. Faltan: el hardware confirmado y aplicar el diseño de Figma.

## Guion de pruebas (lista de verificación)

Marca cada punto antes de entregar. Entre paréntesis, el resultado esperado.

### Autenticación

- [ ] Registro con contraseña sin números (error "debe incluir al menos un número").
- [ ] Registro con un correo ya usado (error "Ya existe una cuenta con ese correo").
- [ ] Login con contraseña incorrecta (mensaje "Correo o contraseña incorrectos", sin decir cuál falló).
- [ ] 5 intentos fallidos seguidos (el 6.º responde "Demasiados intentos…").
- [ ] Entrar a http://localhost:5173/control sin sesión (redirige al login).
- [ ] Ctrl+F5 con sesión iniciada (sigue dentro).
- [ ] Recuperar contraseña: el enlace funciona una sola vez.
- [ ] Usuario normal en Reglas (no ve botones) y en `/usuarios` ("solo para el administrador").
- [ ] Admin intenta desactivarse a sí mismo (no aparece el botón; la API responde 409).

### Funcionamiento del salón

- [ ] Presencia en una zona en automático (luz encendida al instante).
- [ ] Zona vacía (la luz se apaga a los 300 s; si alguien vuelve antes, no se apaga).
- [ ] Orden manual (la zona pasa a manual y la regla no la deshace).
- [ ] Encender/apagar toda una zona (resultado por luz).
- [ ] Doble clic rápido en una luz (una sola orden; el botón se bloquea mientras espera).

### Fallas (no debe romperse)

- [ ] Servo "Falla al mover" (error claro, luz "desconocido", evento de error).
- [ ] Servo "No responde" (error por tiempo en ~3 s; el resto de la app sigue funcionando).
- [ ] Servo "Lento" (responde a los ~2 s; mientras, el botón dice "Enviando orden…").
- [ ] Sensor "En falla" o "Desconectado" (alerta; la luz no se apaga sola).
- [ ] Detener el backend con la app abierta (aviso "Sin conexión con el servidor"; datos marcados como desactualizados). Al volver a arrancarlo se recupera solo.

### Tiempo real e historial

- [ ] Dos navegadores abiertos: un cambio en uno aparece en el otro en <1 s.
- [ ] Historial con filtros por tipo, origen y fechas; paginación.
- [ ] Estadísticas de 24 h / 7 días / 30 días.

### Borrado lógico

- [ ] Eliminar una regla (desaparece de la lista; con "Mostrar también las reglas eliminadas" aparece marcada).
- [ ] Editar una regla dos veces (las versiones anteriores quedan en `GET /api/v1/reglas/:id/versiones`).
- [ ] Desactivar un usuario (no puede entrar; aparece con "Mostrar también las cuentas desactivadas").

### Automático

- [ ] `npm run verificar` (lint, formato, tipos, 240+ pruebas y compilación: todo en verde).

## Si algo falla durante la demo

| Problema                            | Solución rápida                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| El celular no abre la página        | Misma WiFi, usar `npm run dev:red`, permitir Node.js en el firewall (red privada) |
| "Sin conexión con el servidor"      | Revisar que la consola muestre `LUMICLASS API lista`; volver a `npm run dev`      |
| No recuerdo la contraseña del admin | Usar "Olvidé mi contraseña" con `ADMIN_CORREO` y la bandeja `/correos`            |
| El encabezado dice "Reconectando…"  | La app sigue funcionando (consulta cada 5 s); recargar la página                  |
| Estado raro tras muchas pruebas     | Simulador → **Reiniciar simulación**                                              |
