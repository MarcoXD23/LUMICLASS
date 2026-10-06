# LUMICLASS — Pruebas

Tres niveles de pruebas. Las dos primeras no necesitan el servidor encendido y no tocan tu base de datos.

| Comando                     | Qué prueba                                            | Cuánto tarda |
| --------------------------- | ----------------------------------------------------- | ------------ |
| `php artisan test`          | Backend: API, reglas de negocio, seguridad, páginas   | ~15 s        |
| `npm run prueba:js`         | Lógica del navegador (JavaScript) sin abrir navegador | ~1 s         |
| `npm run prueba:navegador`  | Recorrido completo en Edge o Chrome reales            | ~1 min       |

Antes de entregar o subir cambios: `vendor\bin\pint --test`, `npm run build` y los tres comandos de arriba.

## 1. Backend — `php artisan test` (`tests/Feature/`)

Usa una base SQLite **en memoria** (se crea y se borra en cada prueba). El reloj se simula, así que las
reglas de "5 minutos vacío" se prueban sin esperar.

| Archivo                     | Cubre                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `Api/AuthTest`              | Registro, login, logout, token, mensajes en español, 5 intentos por minuto                |
| `Api/SalonesTest`           | Crear (con N zonas y luces), renombrar, borrar en cascada, límite de 20 por cuenta        |
| `Api/AislamientoTest`       | Una cuenta nunca ve ni toca lo de otra (todo responde 404)                                |
| `Api/SaludYSalonTest`       | Dashboard: ocupación, alertas, listas                                                     |
| `Api/ComandoLucesTest`      | Órdenes: duplicadas, servo ocupado/en falla, sin servo, por zona, paso a manual          |
| `Api/AccionamientoTest`     | Respuestas del servo: ok, falla, lento, sin respuesta (vence por tiempo)                  |
| `Api/MotorReglasTest`       | Reglas por prioridad y duración, sensor en falla, zona manual, no insistir tras una falla |
| `Api/SimuladorTest`         | Rutas del simulador; con driver real no existen                                           |
| `Api/ReglasTest`            | CRUD de reglas y validaciones                                                             |
| `Api/EventosYErroresTest`   | Historial, filtros por día local, CSV, 404/405/400 en español                             |
| `Api/EstadisticasTest`      | Horas encendidas/ocupado/desperdicio calculadas a mano, días por zona horaria             |
| `Api/RobustezTest`          | Regla 6: id de orden reutilizado, carreras, tick que falla, textos largos, tipos raros, N+1 |
| `Api/SeguridadTest`         | XSS, asignación masiva, contraseñas cifradas, cookie de sesión, tokens falsos             |
| `Web/PaginasTest`           | Redirecciones sin sesión, páginas del dueño, 404 a otra cuenta, errores en español        |

**Con MySQL:** las mismas pruebas pasan contra MySQL. Para comprobarlo, crea una base vacía **aparte**
(por ejemplo `lumiclass_pruebas`; las pruebas la borran) y en PowerShell:

```powershell
$env:DB_CONNECTION="mysql"; $env:DB_PORT="3308"; $env:DB_DATABASE="lumiclass_pruebas"; vendor\bin\phpunit
```

Nunca uses tu base de trabajo (`lumiclass`) para esto.

## 2. JavaScript — `npm run prueba:js` (`tests/js/`, Vitest)

| Archivo              | Cubre                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| `api.test.js`        | CSRF, errores por campo, 401 → ingresar, 419 → reintenta una vez, sin conexión, UUID  |
| `sondeo.test.js`     | Refresco cada 3 s, espera creciente hasta 30 s, pausa sin red o con pestaña oculta    |
| `formato.test.js`    | Duraciones, "hace X", textos de reglas                                                |
| `mezclar.test.js`    | Los getters de Alpine siguen vivos al combinar componentes                            |
| `reglas.test.js`     | Editar una regla no cambia su duración en segundos                                    |

## 3. Navegador — `npm run prueba:navegador` (`tests/navegador/recorrido.mjs`)

Necesita el servidor encendido (`php artisan serve --port=8001`) y la cuenta demo (`php artisan migrate --seed`).
Usa el Edge o Chrome ya instalados (no descarga navegadores). Recorre en tamaño celular: ingresar (también con
contraseña mala), simulador, control, servo en falla, sensores, reglas, historial y CSV, estadísticas, servidor
caído y recuperado, página 404, escritorio y registro. Revisa además que en celular no haya scroll horizontal
ni botones de menos de 44 px. Deja capturas en `tests/navegador/capturas/` (no se suben a git).

**Ojo:** modifica el salón demo (reinicia el simulador, crea una regla y una cuenta de prueba).

## Errores encontrados y corregidos en la Fase 9

1. Reenviar "apagar" con el `id_solicitud` de un "encender" anterior respondía como si se hubiera hecho (la luz
   seguía encendida). Ahora: 409 `id_solicitud_reutilizado`.
2. El filtro de fechas del historial usaba días UTC (en Colombia, lo de después de las 19:00 caía al día siguiente).
3. Editar una regla redondeaba su duración a minutos (una de 20 s pasaba a 0 s).
4. Pulsar "Encender" sobre una luz ya encendida en zona automática no la pasaba a manual: la regla la apagaba después.
5. Dependencia `shell-quote` con vulnerabilidad crítica: forzada a una versión corregida (`overrides` en `package.json`).

## GitHub

`.github/workflows/pruebas.yml` corre Pint, la compilación, las pruebas PHP y las de JavaScript en cada push o PR.
