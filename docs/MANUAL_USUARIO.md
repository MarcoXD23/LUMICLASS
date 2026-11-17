# LUMICLASS · Manual de usuario

**Sistema inteligente de control y monitoreo de iluminación de un salón de clases.**
Proyecto de Camilo, Marcos y Sofía.

Este manual es para quien **usa** LUMICLASS: no hace falta saber programar. Para instalarlo o modificarlo, ver el
[Manual del programador](MANUAL_PROGRAMADOR.md).

---

## 1. Qué hace LUMICLASS

- Sabe si cada zona del salón está **ocupada o vacía** gracias a sensores de presencia.
- **Enciende y apaga las luces** sola (modo automático) o cuando tú lo pides (modo manual).
- Cada luz puede ser **simulada** (para practicar y presentar) o real, con un **ESP32 con relé**.
- Guarda un **historial** de todo lo que pasa y muestra **estadísticas**, como las horas que las luces quedaron
  encendidas con el salón vacío.
- Funciona en el **computador, la tableta y el celular**.

### Cómo se ven los estados

Cada estado se muestra con **color, ícono y texto**, así se distingue aunque no se vean bien los colores.

| Estado | Significa |
| --- | --- |
| **Ocupado** (verde) | Algún sensor de la zona detecta personas |
| **Vacío** (azul) | Los sensores no detectan a nadie |
| **Sin datos** | Ningún sensor activo ha enviado lecturas todavía |
| **Encendida** (amarillo) | La luz está prendida |
| **Apagada** (gris) | La luz está apagada |
| **Desconocido** (naranja) | Se dio una orden pero el actuador no confirmó; no se sabe cómo quedó la luz |
| **Falla / Inactivo** (rojo) | Un sensor o un ESP32 no responde o está desconectado |
| **Automático / Manual** | Si la zona obedece las reglas o tus órdenes |

---

## 2. Entrar a LUMICLASS

Abre la dirección que te dé el equipo, por ejemplo la del hosting o `http://IP-del-PC:8001` en la misma red WiFi.

> Cada versión de LUMICLASS (el hosting, el PC del equipo, tu propio PC) tiene **su propia base de datos**. Una cuenta
> creada en una no existe en las otras.

### 2.1 Crear una cuenta

1. En **Ingresar**, toca **"Regístrate"**.
2. Escribe tu **nombre**, tu **correo** y una **contraseña** (mínimo 8 caracteres) dos veces.
3. Opcional y recomendado: un **correo alternativo**, distinto del principal. Sirve para recuperar la contraseña si
   pierdes acceso a tu correo.
4. Toca **Crear cuenta**. Recibes un **salón de ejemplo** con 2 zonas, 4 luces, 2 sensores y 2 reglas.

### 2.2 Ingresar

Escribe tu correo y tu contraseña. El botón del **ojo** muestra u oculta lo que escribes en la contraseña.
No importa si el correo lleva mayúsculas o espacios al principio o al final.

Si te equivocas varias veces seguidas, espera un minuto antes de volver a intentar. Es una protección contra quien
intenta adivinar contraseñas.

### 2.3 Recuperar la contraseña (3 formas)

En **Ingresar** → **"¿Olvidaste tu contraseña?"** elige una:

| Forma | Qué recibes | Vence en |
| --- | --- | --- |
| **1. Enlace por correo** | Un enlace para crear la contraseña nueva | 60 minutos, un solo uso |
| **2. Código de 6 dígitos por correo** | Un código que escribes en 6 casillas | 10 minutos, un solo uso |
| **3. Usar mi correo alternativo** | El mismo código, pero en tu **correo alternativo verificado** | 10 minutos, un solo uso |

- Revisa también la carpeta de **spam** o **correo no deseado**.
- Por seguridad, la página **nunca dice si un correo está registrado**: el mensaje es el mismo exista o no la cuenta.
- Máximo **3 códigos por hora**. Tras **5 códigos equivocados** hay que esperar 15 minutos.
- Al cambiar la contraseña se **cierran tus sesiones en otros equipos**.

### 2.4 Seguridad de mi cuenta

Toca tu **nombre** (o el ícono del escudo) arriba a la derecha. Ahí puedes:

- **Agregar o cambiar el correo alternativo.** Te pide tu contraseña actual y te envía un código a ese correo. Solo
  queda activo cuando escribes el código (estado **"Verificado"**).
- **Quitar el correo alternativo.**
- Ver la **actividad de la cuenta** (cambios de contraseña y del correo alternativo).

---

## 3. Mis salones

Es la primera pantalla después de ingresar. Muestra tus salones; cada cuenta solo ve los suyos.

- **Crear un salón:** escribe el nombre, cuántas zonas y cuántas luces por zona.
- Toca un salón para abrirlo. Arriba (o en el menú del celular) están sus secciones: **Inicio, Control, Sensores,
  Reglas, Historial, Estadísticas, Simulador** y **Configurar**.

---

## 4. Inicio (estado del salón)

Resume todo de un vistazo:

- **Salón:** ocupado, vacío o sin datos.
- **Luces encendidas**, **sensores activos** y **alertas**.
- Cada **zona** con su ocupación, su modo y sus luces.
- **Última actualización:** la pantalla se actualiza sola cada pocos segundos.

---

## 5. Control de luces

- **Encender zona / Apagar zona:** todas las luces de esa zona.
- **Encender / Apagar** cada luz por separado.
- **Automático / Manual:** una orden manual pasa la zona a **manual**, para que las reglas no la reviertan. Vuelve a
  **automático** cuando quieras que el salón se maneje solo.

Si una luz responde **"Desconocido"** o aparece una alerta, el actuador no confirmó la orden (por ejemplo, el ESP32 está
apagado). Revisa la conexión y vuelve a intentar.

---

## 6. Sensores

Muestra cada sensor de presencia: si está **activo, inactivo o en falla**, su **última lectura** y si detecta presencia.

> Un sensor en falla **no** cuenta como "vacío": LUMICLASS no apaga luces solo porque un sensor dejó de funcionar,
> porque podría haber gente que ese sensor no ve.

Hoy la presencia viene del **simulador**. Los sensores conectados a un ESP32 están pendientes.

---

## 7. Reglas (automatización)

Las reglas dicen qué hacer en el **modo automático**:

> **Cuando** el salón esté **Ocupado / Vacío**, durante al menos **X minutos**, **entonces** **Encender / Apagar** las
> luces, en **una zona o en todas**.

- **Durante al menos:** evita apagones por lecturas falsas (por ejemplo, alguien quieto unos minutos). 0 = de inmediato.
- **Prioridad:** si dos reglas aplican, va primero la de número menor.
- Botones para **Nueva regla**, **Editar**, **Borrar** y activar o desactivar cada regla.

Las 2 reglas de ejemplo: **ocupado → encender** y **vacío por 5 minutos → apagar**.

---

## 8. Historial

Lista todo lo que pasa: encendidos, apagados, cambios de presencia, cambios de modo, alertas y errores.

- Filtra por **fechas**, **tipo** y **severidad** (Info, Advertencia, Error).
- **Descargar CSV:** baja el historial para abrirlo en Excel.

---

## 9. Estadísticas

- **Horas encendidas por día**, separando las horas con gente de las horas **con la zona vacía** (energía desperdiciada).
- **Tiempo encendida por luz.**

Sirven para mostrar cuánto ahorra el modo automático.

---

## 10. Simulador

Permite **probar y presentar sin hardware**. Solo aparece cuando LUMICLASS corre en modo simulado.

- **Presencia en todo el salón:** marcar el salón ocupado o vacío (y opcionalmente cuántas personas).
- **Sensores:** cambiar cada uno a activo, desconectado o en falla.
- **Luces:** decidir cómo responde cada actuador simulado: **responde bien, lento, no responde o falla**.
- **Interruptor de pared:** simular que alguien prende o apaga la luz a mano.
- **Avanzar ahora (tick):** aplicar ya las reglas con tiempo, sin esperar.
- **Reiniciar:** dejar el simulador como al principio.

Las luces con un ESP32 conectado funcionan con el ESP32 real aunque el resto esté simulado.

---

## 11. Configurar salón

### 11.1 Zonas, luces y sensores

Agrega, renombra, mueve y quita **zonas**, **luces** y **sensores**. LUMICLASS no deja quitar la última zona, ni
mover o quitar una luz mientras se está ejecutando una orden. Cada cambio queda en el historial.

### 11.2 Conectar el ESP32 de una luz

Cada luz puede tener su propio **ESP32 con relé**. Hay dos formas:

**Por internet** (cuando LUMICLASS está en un hosting):
1. En la luz, toca **Conectar por internet (hosting)**.
2. Copia **SERVIDOR** y **CLAVE**. La clave **solo se muestra una vez**.
3. Quien programa el ESP32 pega esos datos en su código y lo carga (ver `docs/HARDWARE.md`).
4. Cuando el ESP32 se conecte, la luz dice **"Conectado por internet"**.

**Por la red local** (cuando LUMICLASS corre en un PC de la misma red WiFi):
1. En **IP en la red local**, escribe la IP que muestra el ESP32 (por ejemplo `192.168.1.40`).
2. Toca **Guardar** y luego **Probar**.

**Quitar ESP32:** la luz vuelve al simulador y la clave deja de servir.

> ⚠️ El relé debe manejar una **lámpara de bajo voltaje (5–12 V)** en una maqueta. No se toca la instalación
> eléctrica del salón. Un bombillo de 110/220 V solo con la supervisión de un profesor o electricista.

---

## 12. Preguntas frecuentes

**No me deja entrar y la contraseña está bien.** Revisa que estés en la dirección correcta (el hosting y cada PC son
bases distintas), que no tengas Bloq Mayús y que el navegador no esté autocompletando una contraseña vieja. Si nada
funciona, usa "¿Olvidaste tu contraseña?".

**No me llega el correo.** Revisa spam. Si sigue sin llegar, avisa al equipo: puede que el servidor no tenga
configurado el envío de correos.

**La luz dice "Desconocido".** El actuador no confirmó la orden. Revisa que el ESP32 tenga corriente y WiFi.

**La luz dice "Inactivo".** El ESP32 dejó de comunicarse (más de 15 segundos sin señal).

**Las luces se apagaron solas.** La zona estaba en automático y una regla lo decidió. Pasa la zona a manual o
cambia la regla.

**Veo datos distintos en el celular y en el computador.** Seguramente estás en dos versiones distintas de LUMICLASS.
Revisa la dirección en la barra del navegador.
