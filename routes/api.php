<?php

use App\Http\Controllers\Api\EventoController;
use App\Http\Controllers\Api\LuzController;
use App\Http\Controllers\Api\ReglaController;
use App\Http\Controllers\Api\SalonController;
use App\Http\Controllers\Api\SaludController;
use App\Http\Controllers\Api\SensorController;
use App\Http\Controllers\Api\SimuladorController;
use App\Http\Controllers\Api\ZonaController;
use App\Http\Middleware\SoloSimulador;
use Illuminate\Support\Facades\Route;

// Un id que no es número responde 404 en vez de llegar a la base de datos.
Route::pattern('zona', '[0-9]+');
Route::pattern('luz', '[0-9]+');
Route::pattern('sensor', '[0-9]+');
Route::pattern('regla', '[0-9]+');
Route::pattern('actuador', '[0-9]+');

Route::prefix('v1')->group(function () {
    Route::get('salud', SaludController::class);
    Route::get('salon/estado', [SalonController::class, 'estado']);

    Route::get('zonas', [ZonaController::class, 'index']);
    Route::get('zonas/{zona}', [ZonaController::class, 'show']);
    Route::patch('zonas/{zona}/modo', [ZonaController::class, 'modo']);
    Route::post('zonas/{zona}/comando', [ZonaController::class, 'comando']);

    Route::get('luces', [LuzController::class, 'index']);
    Route::get('luces/{luz}', [LuzController::class, 'show']);
    Route::post('luces/{luz}/comando', [LuzController::class, 'comando']);

    Route::get('sensores', [SensorController::class, 'index']);
    Route::get('sensores/{sensor}', [SensorController::class, 'show']);

    Route::apiResource('reglas', ReglaController::class)->parameters(['reglas' => 'regla']);

    Route::get('eventos', [EventoController::class, 'index']);

    Route::prefix('sim')->middleware(SoloSimulador::class)->controller(SimuladorController::class)->group(function () {
        Route::get('estado', 'estado');
        Route::post('presencia', 'presencia');
        Route::patch('sensores/{sensor}', 'sensor');
        Route::patch('actuadores/{actuador}', 'actuador');
        Route::post('luces/{luz}/interruptor', 'interruptor');
        Route::post('tick', 'tick');
        Route::post('reiniciar', 'reiniciar');
    });
});
