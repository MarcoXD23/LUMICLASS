# LUMICLASS · Manual del programador

Guía técnica para Camilo, Marcos, Sofía y quien continúe el proyecto. Para el uso diario de la aplicación, ver el
[Manual de usuario](MANUAL_USUARIO.md). Detalles completos: [ARQUITECTURA.md](ARQUITECTURA.md),
[HARDWARE.md](HARDWARE.md) y [PRUEBAS.md](PRUEBAS.md). Reglas de trabajo del equipo: [CLAUDE.md](../CLAUDE.md).

---

## 1. Tecnologías

| Capa | Tecnología |
| --- | --- |
| Backend y API | **PHP 8.4** + **Laravel 13**, API REST en `/api/v1`, autenticación con **Sanctum** |
| Interfaz | Blade + **Alpine.js** + **Tailwind CSS 4**, compilado con **Vite** |
| Base de datos | **MySQL / MariaDB** (WAMP, hosting) o **SQLite** (desarrollo y pruebas) |
| Tiempo real | *Polling*: la interfaz consulta el estado cada pocos segundos |
| Hardware | **ESP32 con relé** por luz (sketch de Arduino en C++) |
| Pruebas | PHPUnit (PHP), Vitest (JavaScript) y un recorrido en navegador (Playwright) |

> **PHP 8.4 es obligatorio.** El `composer.lock` usa Symfony 8, que exige PHP ≥ 8.4.1. Con PHP 8.3, `composer install`
> falla. El hosting también debe usar PHP 8.4.

---

## 2. Instalación en Windows

Requisitos: PHP 8.4, Composer 2, Node.js 20 o superior, Git. Opcional: MySQL (por ejemplo el de WAMP).

```
git clone https://github.com/MarcoXD23/LUMICLASS.git
cd LUMICLASS
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve --port=8001
```

Abre `http://localhost:8001`. Cuenta demo: `demo@lumiclass.test` / `demo12345` (solo para desarrollo y presentación).

- **Desde el celular o con un ESP32 por IP local:** `php artisan serve --host=0.0.0.0 --port=8001`, abre el puerto
  8001 en el firewall de Windows (redes privadas) y usa `http://IP-del-PC:8001` (la IP sale con `ipconfig`).
- **MySQL de WAMP:** crea la base `lumiclass` (utf8mb4), usa el bloque MySQL de `.env.example` (puerto 3306 o 3308
  según tu WAMP) y luego `php artisan migrate`. La conexión `mysql` ya usa el motor **InnoDB**
  (`config/database.php`), necesario para las claves foráneas.
- **Puerto 8001 y cookie `lumiclass_session`:** permiten correr LUMICLASS junto a otro proyecto Laravel.

### Actualizar tu copia

```
git checkout main
git pull
composer install
npm install
npm run build
php artisan migrate
```

> **Nunca** uses `php artisan migrate:fresh` sobre una base con datos reales: borra todo.

---

## 3. Estructura del proyecto

```
app/
  Drivers/       Cómo se mueve cada luz: simulado, ESP32 por IP o ESP32 por internet
  Http/          Controladores (Api/ y Web/), validaciones (Requests/), recursos JSON, middlewares
  Models/        Salon, Zona, Luz, Sensor, Actuador, Regla, Evento, User, CodigoVerificacion…
  Servicios/     Lógica: luces, sensores, motor de reglas, tick, simulador, ESP32, estadísticas, contraseñas
  Console/       Comandos de Artisan (lumiclass:tick, lumiclass:demo, lumiclass:cambiar-contrasena)
config/lumiclass.php   Driver, tiempos del simulador y del ESP32
database/
  migrations/    Estructura de la base
  seeders/       Cuenta demo y salón de ejemplo
  sql/           Cambios para el hosting sin terminal (phpMyAdmin)
resources/       Vistas Blade, CSS (Tailwind) y JavaScript (Alpine)
routes/          web.php (pantallas) y api.php (API /api/v1)
firmware/        Sketch del ESP32 con relé (lumiclass_esp32)
tests/           Feature y Unit (PHP), js (Vitest), navegador
docs/            Manuales, arquitectura, hardware, pruebas, guía de demo
scripts/         vitest.mjs (arreglo de c: y C: en Windows)
```

---

## 4. Modelo de datos

| Tabla | Para qué |
| --- | --- |
| `users` | Cuentas. Incluye el correo alternativo y si está verificado |
| `codigos_verificacion` | Códigos de 6 dígitos (con hash) para recuperar la contraseña y verificar el correo alternativo |
| `salones` → `zonas` → `luces` | Cada cuenta tiene salones; cada salón, zonas; cada zona, luces |
| `actuadores` | Lo que mueve cada luz. Si tiene `direccion` es un ESP32 por IP; si tiene `clave_hash`, un ESP32 por internet; si no, se usa el driver del `.env` |
| `sensores` | Sensores de presencia por zona |
| `reglas` | Automatización: condición (ocupado/vacío + minutos) y acción (encender/apagar) |
| `eventos` | Historial y alertas |
| `solicitudes_procesadas` | Evita ejecutar dos veces la misma orden (idempotencia) |

Reglas de diseño:
- **Cada cuenta solo ve lo suyo.** Lo de otra cuenta responde **404** (`Route::bind` en `routes/api.php`).
- `estado_deseado` y `estado_real` van separados: una orden puede fallar.
- Sin enums de base de datos: los valores fijos se validan en la aplicación.

---

## 5. API (`/api/v1`)

Resumen de los grupos de rutas (detalle en `routes/api.php` y `docs/ARQUITECTURA.md`):

| Grupo | Rutas principales |
| --- | --- |
| Salud | `GET /salud` |
| Autenticación (máx. 5 intentos/min) | `POST auth/registro`, `auth/login`, `auth/token`, `auth/olvide`, `auth/restablecer`, `auth/codigo`, `auth/codigo/restablecer` |
| Cuenta | `GET cuenta/seguridad`, `POST cuenta/alternativo`, `.../reenviar`, `.../verificar`, `DELETE cuenta/alternativo` |
| Salones | `apiResource salones`, `GET salones/{id}/estado`, `/zonas`, `/luces`, `/sensores`, `/reglas`, `/eventos`, `/eventos.csv`, `/estadisticas` |
| Configurar | Crear, renombrar y quitar zonas, luces y sensores |
| ESP32 de una luz | `PATCH actuadores/{id}/esp32` (IP), `POST .../probar`, `POST .../clave`, `DELETE .../esp32` |
| Control | `PATCH zonas/{id}/modo`, `POST zonas/{id}/comando`, `POST luces/{id}/comando` |
| Reglas | `GET/PUT/PATCH/DELETE reglas/{id}`, `POST salones/{id}/reglas` |
| Simulador (solo `LUMICLASS_DRIVER=simulado`) | `salones/{id}/sim/...`, `sim/sensores/{id}`, `sim/actuadores/{id}`, `sim/luces/{id}/interruptor` |
| ESP32 por internet | `POST dispositivo/latido` (máx. 240/min) |

Las respuestas de error usan un formato común (`codigo` + `mensaje` en español). Las órdenes aceptan un id de
solicitud para no repetirse si el usuario pulsa dos veces.

---

## 6. Drivers: cómo se mueve cada luz

`app/Drivers/DriverHardware.php` define la interfaz:

```
accionar(actuador, encender | apagar)  → completada | pendiente | fallida
consultarPendiente(actuador)           → completada | pendiente | fallida
```

`DriverSegunActuador` elige el driver **por luz**:

| Si el actuador… | Driver | Cómo funciona |
| --- | --- | --- |
| tiene clave (`clave_hash`) | `DriverRemoto` | La orden queda pendiente; el ESP32 la recoge en su latido y confirma con su estado |
| tiene `direccion` | `DriverReal` + `ClienteEsp32` | El servidor llama a `http://IP/on`, `/off` y `/estado` (responden `{"on": true\|false}`) |
| no tiene ninguna | el de `LUMICLASS_DRIVER` | `simulado` (por defecto) o `real` con `LUMICLASS_ESP32_URL` como respaldo |

### Protocolo del ESP32 por internet

```
POST /api/v1/dispositivo/latido
Authorization: Bearer <clave de 40 caracteres>
{"on": true|false}            ← estado actual del relé

Respuesta: {"orden": "on" | "off" | null}
```

- La clave se genera en Configurar salón (`POST actuadores/{id}/esp32/clave`), se muestra una vez y se guarda solo su
  SHA-256.
- Sin latido en `LUMICLASS_ESP32_SEGUNDOS_SIN_LATIDO` (15 s) la luz pasa a `inactivo` con alerta.
- Si alguien cambia la luz desde la página del ESP32, la app corrige el estado y lo anota en el historial.

### Variables de `.env` del hardware

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `LUMICLASS_DRIVER` | `simulado` | Driver de las luces sin ESP32 propio |
| `LUMICLASS_ESP32_URL` | vacío | Respaldo para `real` en luces sin IP propia |
| `LUMICLASS_ESP32_TIMEOUT` | `2` | Segundos de espera de cada petición al ESP32 |
| `LUMICLASS_ESP32_SEGUNDOS_SINCRONIZAR` | `5` | Cada cuánto el tick consulta `/estado` de los ESP32 por IP |
| `LUMICLASS_ESP32_SEGUNDOS_LATIDO` / `_SIN_LATIDO` | `2` / `15` | Latido del ESP32 por internet y tiempo para darlo por desconectado |
| `LUMICLASS_SERVO_SEGUNDOS_ESPERA` | `10` | Tiempo para confirmar una orden antes de marcarla "desconocida" |
| `LUMICLASS_FACTOR_TIEMPO_REGLAS` | `1` | `0.1` acelera las reglas con tiempo (útil en la demo) |

### Firmware

`firmware/lumiclass_esp32/lumiclass_esp32.ino`: WiFi, relé en el **GPIO 26** (activo en LOW), página local con `/on`,
`/off`, `/toggle` y `/estado`, mDNS `bombillo.local`, y latido HTTPS cada 2 s. Armado y carga: [HARDWARE.md](HARDWARE.md).

**Limitaciones conocidas:**
- El sketch usa `setInsecure()` (no valida el certificado HTTPS del servidor). Para un uso real habría que agregar el
  certificado raíz del hosting.
- WiFi y clave se escriben en el código: **nunca hagas commit con valores reales.**
- Los sensores PIR conectados a un ESP32 están pendientes: la presencia viene del simulador.

---

## 7. Lógica principal

- **Ocupación:** una zona está `ocupado` si algún sensor activo detecta presencia, `vacio` si todos los activos con
  lectura dicen que no, y `desconocida` si no hay lecturas. Un sensor en falla **no** cuenta como vacío.
- **Motor de reglas (`MotorReglas`):** se evalúa al cambiar sensores y en cada tick; respeta la prioridad y la
  duración mínima. Solo actúa sobre zonas en **automático**.
- **Tick (`php artisan lumiclass:tick`, `ServicioTick`):** vence órdenes sin confirmar, aplica reglas con tiempo y
  sincroniza los ESP32. En el PC también lo dispara la interfaz al consultar el estado.
- **Recuperar contraseña:** `CodigosVerificacion` (6 dígitos con hash, 10 min, 3 envíos/hora, 5 fallos → 15 min),
  `CorreoAlternativo` y `CambioDeContrasena` (revoca tokens y cierra las otras sesiones).

### Comandos de Artisan

| Comando | Para qué |
| --- | --- |
| `php artisan lumiclass:tick` | Revisa órdenes pendientes, reglas con tiempo y ESP32 |
| `php artisan lumiclass:demo --zona-horaria=America/Bogota` | Prepara la cuenta demo con 7 días de historia |
| `php artisan lumiclass:cambiar-contrasena {correo}` | Cambia una contraseña desde la terminal (la pide oculta) |

---

## 8. Pruebas

| Comando | Qué prueba |
| --- | --- |
| `php artisan test` | Pruebas de PHP (API, reglas, ESP32, contraseñas, pantallas). Usan SQLite en memoria |
| `npm run prueba:js` | Pruebas de JavaScript con Vitest |
| `npm run prueba:navegador` | Recorrido completo en Edge o Chrome (modifica el salón demo) |
| `vendor/bin/pint --test` | Formato del código PHP |

> Usa siempre `npm run prueba:js`, no `npx vitest run`: en Windows, si la terminal abre la carpeta como `c:\`
> (minúscula), Vitest falla. El script `scripts/vitest.mjs` lo corrige.

Toda regla de negocio nueva lleva su prueba. Antes de subir un cambio, las tres deben pasar.

---

## 9. Cómo trabajar en equipo (Git)

1. `git checkout main` y `git pull`.
2. Rama nueva: `git checkout -b feature/lo-que-vas-a-hacer`.
3. Programa, prueba (sección 8) y guarda: `git add .` y `git commit -m "Qué hiciste"`.
4. `git push -u origin feature/...` y abre un **Pull Request** hacia `main` en GitHub. Otro integrante lo revisa.
5. **Nunca** subas `.env`, bases de datos, `.sql` exportados con datos, ni el sketch con WiFi o claves reales.
6. Si tu rama salió de una versión vieja de `main`, une `main` a tu rama antes del Pull Request (`git merge main`) y
   resuelve los conflictos. **No** uses `rebase` ni `push --force` en ramas compartidas.

---

## 10. Publicar en un hosting

**Requisitos:** PHP 8.4, MySQL/MariaDB, HTTPS y, para el ESP32 por internet, **sin protección anti-bots**
(InfinityFree la tiene y bloquea al ESP32). Mejor si tiene SSH y cron.

### Hosting con terminal (SSH) o Laravel Cloud

```
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize
```

### Hosting sin terminal (InfinityFree y similares)

1. En tu PC: `composer install --no-dev --optimize-autoloader` y `npm run build`.
2. En **phpMyAdmin** → la base → pestaña **SQL**, pega cada archivo de `database/sql/` que aún no hayas corrido,
   **una sola vez y en orden**:
   1. `cambios_hosting.sql` (correo alternativo y códigos)
   2. `esp32_sofia.sql` (columnas del ESP32 de cada luz; su PARTE 2 solo si corriste la Fase 8 antigua)
3. Sube por FileZilla las carpetas cambiadas y `public/build`. **Nunca** subas tu `.env` local.
4. En el `.env` del hosting: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`, `QUEUE_CONNECTION=sync`
   y los datos de la base. Para correos: Gmail con **contraseña de aplicación** (`MAIL_MAILER=smtp`).
5. Borra `bootstrap/cache/config.php` y `routes-*.php` si existen, y los archivos de `storage/framework/views/`.

---

## 11. Problemas frecuentes

| Problema | Causa y solución |
| --- | --- |
| `composer install` pide PHP ≥ 8.4.1 | Instala PHP 8.4 |
| "Specified key was too long" en MySQL | La conexión no está usando InnoDB: revisa `engine` en `config/database.php` |
| `Connection refused` a MySQL | WAMP apagado o puerto distinto (3306 / 3308) |
| Contraseña correcta pero no entra | Estás en otra base (hosting, tu PC u otro PC) |
| No llega el correo | `MAIL_MAILER=log` (queda en `storage/logs/laravel.log`) o contraseña normal en vez de la de aplicación |
| El ESP32 no se conecta al hosting | Protección anti-bots del hosting, clave equivocada o WiFi de 5 GHz |
| `npm run prueba:js` falla con `reading 'config'` | Usaste `npx vitest` directo; usa `npm run prueba:js` |
| La página no muestra cambios en el hosting | Falta subir `public/build` o limpiar `bootstrap/cache` |

---

## 12. Historia del hardware

- **Fases 1–7:** todo con el simulador.
- **Fase 8 (primera versión):** placa por salón con servos y sensores PIR (commit `0a373b3`). **Retirada.**
- **Fase 8 (definitiva, Sofía):** ESP32 con relé por luz, por IP local o por internet. La migración
  `2026_11_18_000001_quitar_placa_del_salon` borra lo que dejó la primera versión.
