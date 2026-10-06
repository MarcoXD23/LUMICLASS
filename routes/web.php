<?php

use App\Http\Controllers\Web\PaginaController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(auth()->check() ? 'salones.index' : 'ingresar'));

Route::middleware('guest')->controller(PaginaController::class)->group(function () {
    Route::get('ingresar', 'ingresar')->name('ingresar');
    Route::get('registro', 'registro')->name('registro');
    Route::get('olvide', 'olvide')->name('olvide');
    // El nombre password.reset es el que Laravel espera para el enlace del correo.
    Route::get('restablecer/{token}', 'restablecer')->name('password.reset');
});

Route::middleware('auth')->controller(PaginaController::class)->group(function () {
    Route::get('salones', 'salones')->name('salones.index');
    Route::get('salones/{salon}', 'inicio')->name('salones.inicio');
    Route::get('salones/{salon}/control', 'control')->name('salones.control');
    Route::get('salones/{salon}/sensores', 'sensores')->name('salones.sensores');
    Route::get('salones/{salon}/reglas', 'reglas')->name('salones.reglas');
    Route::get('salones/{salon}/historial', 'historial')->name('salones.historial');
    Route::get('salones/{salon}/estadisticas', 'estadisticas')->name('salones.estadisticas');
    Route::get('salones/{salon}/simulador', 'simulador')->name('salones.simulador');
});
