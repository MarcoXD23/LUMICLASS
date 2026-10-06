# LUMICLASS

Sistema inteligente de control y monitoreo de iluminación de un salón de clases.

Aplicación web que muestra si el salón está ocupado o vacío, controla las luces (manual o automático) y registra el historial, usando sensores y servomotores. Funciona primero con hardware simulado.

**Equipo:** Camilo, Marcos y Sofía.

> ⚠️ **Seguridad eléctrica:** los servomotores **solo accionan el interruptor de pared de forma mecánica**. **Nunca** se conectan a la corriente de red (110/220 V). La placa y los servos usan su propia fuente de 5 V.

## Requisitos

- [PHP](https://www.php.net/) 8.3 o superior (probado con PHP 8.4 en Windows 11).
- [Composer](https://getcomposer.org/) 2.
- [Node.js](https://nodejs.org/) 20 o superior (solo para compilar CSS/JS con Vite).
- Git.

## Instalación (Windows, macOS o Linux)

```
git clone https://github.com/MarcoXD23/LUMICLASS.git
cd LUMICLASS
composer install
copy .env.example .env        # en macOS/Linux: cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve --port=8001
```

- Aplicación: http://localhost:8001 (entra con la cuenta demo de abajo o crea una cuenta)
- API: http://localhost:8001/api/v1/salud
- **Desde el celular** (misma red WiFi): `php artisan serve --host=0.0.0.0 --port=8001` y abre `http://IP-DEL-PC:8001` (la IP sale con `ipconfig`). Si Windows pregunta por el firewall, permite el acceso en redes privadas.

`npm run build` compila la interfaz una vez. Si vas a cambiar vistas, CSS o JS, deja `npm run dev` corriendo en otra consola y los cambios se ven al instante.

**Cuentas:** cada persona se registra y solo ve y controla **sus** salones (puede tener varios). `--seed` crea una cuenta de demostración:

| Correo                | Contraseña  |
| --------------------- | ----------- |
| `demo@lumiclass.test` | `demo12345` |

Es solo para desarrollo y presentación: cámbiala si el sistema se publica. Cada cuenta nueva recibe un salón de ejemplo (2 zonas, 4 luces con su servo, 2 sensores PIR y 2 reglas; cantidades **PROPUESTA**). Los endpoints y protecciones están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#5-endpoints-apiv1-confirmado).

Si ya tenías una base de una versión anterior, recréala con `php artisan migrate:fresh --seed` (**borra los datos** de la base configurada en `.env`: revisa `DB_DATABASE` antes).

**Base de datos:** por defecto SQLite (un archivo, nada que instalar). Para usar **MySQL de WAMP**, crea la base `lumiclass` (utf8mb4) y en `.env` usa el bloque MySQL comentado de `.env.example` (puerto 3306 o 3308 según tu WAMP). Laravel crea las tablas con InnoDB (`config/database.php`), necesario porque WAMP trae MyISAM por defecto.

Se usa el puerto **8001** y la cookie de sesión **`lumiclass_session`** para que LUMICLASS pueda correr al mismo tiempo que otro proyecto Laravel (que normalmente usa el 8000 y la cookie `laravel_session`) sin que se mezclen las sesiones.

## Comandos

| Comando                         | Qué hace                                            |
| ------------------------------- | --------------------------------------------------- |
| `php artisan serve --port=8001` | Levanta la aplicación en http://localhost:8001      |
| `npm run dev`                   | Compila CSS/JS en caliente con Vite (en otra consola) |
| `npm run build`                 | Compila CSS/JS para producción                      |
| `php artisan test`              | Pruebas del backend (no toca tu base de datos)      |
| `npm run prueba:js`             | Pruebas del JavaScript                              |
| `npm run prueba:navegador`      | Recorrido completo en Edge/Chrome (servidor encendido) |
| `vendor\bin\pint`               | Formatea el código PHP (`--test` solo revisa)       |
| `php artisan migrate`           | Aplica las migraciones de la base de datos          |
| `php artisan migrate:fresh --seed` | Recrea la base local desde cero con datos de ejemplo |
| `php artisan lumiclass:tick`    | Revisa órdenes pendientes de los servos y reglas con tiempo |
| `php artisan schedule:work`     | (Opcional, otra consola) ejecuta el tick cada 2 s   |

## Qué mostrar en la interfaz

1. Entra con la cuenta demo y abre el salón. En **Simulador** pulsa "Entra gente": en **Inicio** y **Control** las luces se encienden solas.
2. Pulsa "Queda vacío": tras la espera de la regla (5 min, o 30 s con `LUMICLASS_FACTOR_TIEMPO_REGLAS=0.1`) se apagan.
3. En **Simulador**, pon un servo en "Falla" y da una orden en **Control**: la luz queda "Desconocido" y aparece la alerta.
4. **Estadísticas** muestra cuántas horas estuvieron encendidas las luces y cuántas con la zona vacía. **Historial** se puede descargar en CSV.
5. Apaga el servidor con Ctrl+C: aparece "Datos desactualizados". Vuelve a encenderlo: "Conexión recuperada".

## Probar el simulador (PowerShell)

Con el servidor encendido (`php artisan serve --port=8001`), en otra consola:

```powershell
$api = "http://localhost:8001/api/v1"
$json = @{ "Content-Type" = "application/json"; "Accept" = "application/json" }

# 0. Iniciar sesión con la cuenta demo y usar su primer salón
$login = Invoke-RestMethod -Method Post "$api/auth/token" -Headers $json -Body '{"email": "demo@lumiclass.test", "password": "demo12345", "nombre_dispositivo": "PowerShell"}'
$json["Authorization"] = "Bearer $($login.token)"
$salon = (Invoke-RestMethod "$api/salones" -Headers $json).data[0].id

# 1. Escenario limpio: todo activo y luces apagadas
Invoke-RestMethod -Method Post "$api/salones/$salon/sim/reiniciar" -Headers $json

# 2. Alguien entra al salón: la regla enciende las luces
Invoke-RestMethod -Method Post "$api/salones/$salon/sim/presencia" -Headers $json -Body '{"presencia": true}'
(Invoke-RestMethod "$api/salones/$salon/estado" -Headers $json).data.luces

# 3. El salón queda vacío: se apagan tras la espera de la regla (300 s)
Invoke-RestMethod -Method Post "$api/salones/$salon/sim/presencia" -Headers $json -Body '{"presencia": false}'

# 4. Simular fallas: servo que no responde y sensor dañado
Invoke-RestMethod -Method Patch "$api/sim/actuadores/1" -Headers $json -Body '{"respuesta": "sin_respuesta"}'
Invoke-RestMethod -Method Patch "$api/sim/sensores/1" -Headers $json -Body '{"conexion": "falla"}'

# 5. Ver el historial del salón
(Invoke-RestMethod "$api/salones/$salon/eventos" -Headers $json).data | Format-Table fecha, tipo, origen, mensaje

# 6. Cerrar sesión (revoca el token)
Invoke-RestMethod -Method Post "$api/auth/logout" -Headers $json
```

Para la demo conviene acortar las esperas en `.env`: `LUMICLASS_FACTOR_TIEMPO_REGLAS=0.1` hace que los 300 s pasen a 30 s. El sistema avanza solo mientras se consulte `/salon/estado` (o con `php artisan schedule:work`).

## Pruebas

Qué cubre cada prueba y cómo correrlas (también contra MySQL): [docs/PRUEBAS.md](docs/PRUEBAS.md). En GitHub corren solas en cada push (`.github/workflows/pruebas.yml`).

## Estructura

```
app/         Lógica de la aplicación (modelos, controladores, servicios)
routes/      Rutas web y de la API
database/    Migraciones, seeders y base SQLite local
resources/   Vistas, CSS y JS
tests/       Pruebas (PHPUnit)
firmware/    Código de la placa (Fase 8)
docs/        Arquitectura y documentación
diseno/      Referencia de Figma
```

Las reglas de trabajo están en [CLAUDE.md](CLAUDE.md).

## Sobre Laravel

LUMICLASS está construido con [Laravel](https://laravel.com), un framework web de PHP. Documentación oficial: https://laravel.com/docs. Laravel es software de código abierto con licencia [MIT](https://opensource.org/licenses/MIT).

**Estado:** Fase 9 completada (pruebas de backend, JavaScript y navegador; funciona con SQLite y MySQL). La Fase 8 (hardware real) está pendiente de confirmar los sensores.
