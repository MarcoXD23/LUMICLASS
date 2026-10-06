<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class SaludController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $baseDatos = 'ok';
        } catch (Throwable $error) {
            report($error);
            $baseDatos = 'error';
        }

        $ok = $baseDatos === 'ok';

        return response()->json([
            'estado' => $ok ? 'ok' : 'degradado',
            'base_datos' => $baseDatos,
            'driver' => config('lumiclass.driver'),
            'version' => config('lumiclass.version'),
            'hora_servidor' => now()->toIso8601String(),
        ], $ok ? 200 : 503);
    }
}
