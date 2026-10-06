<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventoController;
use App\Http\Controllers\Api\LuzController;
use App\Http\Controllers\Api\ReglaController;
use App\Http\Controllers\Api\SalonController;
use App\Http\Controllers\Api\SaludController;
use App\Http\Controllers\Api\SensorController;
use App\Http\Controllers\Api\SimuladorController;
use App\Http\Controllers\Api\ZonaController;
use App\Http\Middleware\SoloSimulador;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Support\Facades\Route;

// Un id que no es número responde 404 en vez de llegar a la base de datos.
foreach (['salon', 'zona', 'luz', 'sensor', 'regla', 'actuador'] as $parametro) {
    Route::pattern($parametro, '[0-9]+');
}

// Cada {parámetro} solo encuentra recursos de la cuenta que inició sesión.
// Lo de otras cuentas responde 404, igual que si no existiera: no se revela que existe.
$delUsuario = fn (string $modelo) => fn (string $id) => $modelo::query()->delUsuario(request()->user()?->id)->findOrFail($id);
Route::bind('salon', $delUsuario(Salon::class));
Route::bind('zona', $delUsuario(Zona::class));
Route::bind('luz', $delUsuario(Luz::class));
Route::bind('sensor', $delUsuario(Sensor::class));
Route::bind('regla', $delUsuario(Regla::class));
Route::bind('actuador', $delUsuario(Actuador::class));

Route::prefix('v1')->name('api.')->group(function () {
    Route::get('salud', SaludController::class);

    // 5 intentos por minuto: frena a quien prueba contraseñas.
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('auth/registro', [AuthController::class, 'registro']);
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/token', [AuthController::class, 'token']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/yo', [AuthController::class, 'yo']);

        Route::apiResource('salones', SalonController::class)->parameters(['salones' => 'salon']);
        Route::get('salones/{salon}/estado', [SalonController::class, 'estado']);
        Route::get('salones/{salon}/zonas', [ZonaController::class, 'index']);
        Route::get('salones/{salon}/luces', [LuzController::class, 'index']);
        Route::get('salones/{salon}/sensores', [SensorController::class, 'index']);
        Route::get('salones/{salon}/reglas', [ReglaController::class, 'index']);
        Route::post('salones/{salon}/reglas', [ReglaController::class, 'store']);
        Route::get('salones/{salon}/eventos', [EventoController::class, 'index']);

        Route::get('zonas/{zona}', [ZonaController::class, 'show']);
        Route::patch('zonas/{zona}/modo', [ZonaController::class, 'modo']);
        Route::post('zonas/{zona}/comando', [ZonaController::class, 'comando']);

        Route::get('luces/{luz}', [LuzController::class, 'show']);
        Route::post('luces/{luz}/comando', [LuzController::class, 'comando']);

        Route::get('sensores/{sensor}', [SensorController::class, 'show']);

        Route::get('reglas/{regla}', [ReglaController::class, 'show']);
        Route::match(['put', 'patch'], 'reglas/{regla}', [ReglaController::class, 'update']);
        Route::delete('reglas/{regla}', [ReglaController::class, 'destroy']);

        Route::middleware(SoloSimulador::class)->controller(SimuladorController::class)->group(function () {
            Route::get('salones/{salon}/sim/estado', 'estado');
            Route::post('salones/{salon}/sim/presencia', 'presencia');
            Route::post('salones/{salon}/sim/tick', 'tick');
            Route::post('salones/{salon}/sim/reiniciar', 'reiniciar');
            Route::patch('sim/sensores/{sensor}', 'sensor');
            Route::patch('sim/actuadores/{actuador}', 'actuador');
            Route::post('sim/luces/{luz}/interruptor', 'interruptor');
        });
    });
});
