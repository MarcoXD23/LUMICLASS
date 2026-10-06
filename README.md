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
php artisan serve --port=8001
```

- Aplicación: http://localhost:8001
- API: http://localhost:8001/api/v1/salud y http://localhost:8001/api/v1/salon/estado

`--seed` crea un salón de ejemplo (2 zonas, 4 luces con su servo, 2 sensores PIR y 2 reglas). Son cantidades **PROPUESTA**; se cambian en `database/seeders/SalonDemoSeeder.php`. Los endpoints y protecciones están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#5-endpoints-apiv1-confirmado-fase-4).

Se usa el puerto **8001** y la cookie de sesión **`lumiclass_session`** para que LUMICLASS pueda correr al mismo tiempo que otro proyecto Laravel (que normalmente usa el 8000 y la cookie `laravel_session`) sin que se mezclen las sesiones.

## Comandos

| Comando                         | Qué hace                                            |
| ------------------------------- | --------------------------------------------------- |
| `php artisan serve --port=8001` | Levanta la aplicación en http://localhost:8001      |
| `npm run dev`                   | Compila CSS/JS en caliente con Vite (en otra consola) |
| `npm run build`                 | Compila CSS/JS para producción                      |
| `php artisan test`              | Ejecuta las pruebas                                 |
| `vendor\bin\pint`               | Formatea el código PHP (`--test` solo revisa)       |
| `php artisan migrate`           | Aplica las migraciones de la base de datos          |
| `php artisan migrate:fresh --seed` | Recrea la base local desde cero con datos de ejemplo |
| `php artisan lumiclass:tick`    | Revisa órdenes pendientes de los servos y reglas con tiempo |
| `php artisan schedule:work`     | (Opcional, otra consola) ejecuta el tick cada 2 s   |

## Probar el simulador (PowerShell)

Con el servidor encendido (`php artisan serve --port=8001`), en otra consola:

```powershell
$api = "http://localhost:8001/api/v1"
$json = @{ "Content-Type" = "application/json"; "Accept" = "application/json" }

# 1. Escenario limpio: todo activo y luces apagadas
Invoke-RestMethod -Method Post "$api/sim/reiniciar" -Headers $json

# 2. Alguien entra al salón: la regla enciende las luces
Invoke-RestMethod -Method Post "$api/sim/presencia" -Headers $json -Body '{"presencia": true}'
(Invoke-RestMethod "$api/salon/estado").data.luces

# 3. El salón queda vacío: se apagan tras la espera de la regla (300 s)
Invoke-RestMethod -Method Post "$api/sim/presencia" -Headers $json -Body '{"presencia": false}'

# 4. Simular fallas: servo que no responde y sensor dañado
Invoke-RestMethod -Method Patch "$api/sim/actuadores/1" -Headers $json -Body '{"respuesta": "sin_respuesta"}'
Invoke-RestMethod -Method Patch "$api/sim/sensores/1" -Headers $json -Body '{"conexion": "falla"}'

# 5. Ver el historial
(Invoke-RestMethod "$api/eventos").data | Format-Table fecha, tipo, origen, mensaje
```

Para la demo conviene acortar las esperas en `.env`: `LUMICLASS_FACTOR_TIEMPO_REGLAS=0.1` hace que los 300 s pasen a 30 s. El sistema avanza solo mientras se consulte `/salon/estado` (o con `php artisan schedule:work`).

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

**Estado:** Fase 5 completada (simulador de sensores y servos, motor de reglas, con pruebas). El proyecto anterior en Node.js quedó guardado en el commit `d4e4b20` de la rama `feature/fase-4-backend-api`.
