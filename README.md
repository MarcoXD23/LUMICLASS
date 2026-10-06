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

**Estado:** Fase 4 completada (backend, API y base de datos en Laravel, con pruebas). El proyecto anterior en Node.js quedó guardado en el commit `d4e4b20` de la rama `feature/fase-4-backend-api`.
