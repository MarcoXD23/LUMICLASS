<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Placa;
use App\Models\Salon;
use App\Servicios\DireccionRed;
use App\Servicios\ServicioPlaca;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Sección "Conectar placa" de Configurar salón (la usa la persona, con su sesión). */
class ConexionPlacaController extends Controller
{
    public function __construct(
        private readonly ServicioPlaca $servicio,
        private readonly DireccionRed $red,
    ) {}

    public function show(Request $request, Salon $salon): JsonResponse
    {
        return response()->json(['data' => $this->datos($request, $salon)]);
    }

    /** Genera o regenera la clave. Es la ÚNICA respuesta que trae la clave en texto. */
    public function generarClave(Request $request, Salon $salon): JsonResponse
    {
        $clave = $this->servicio->generarClave($salon);

        return response()->json(['data' => [...$this->datos($request, $salon), 'clave' => $clave]], 201);
    }

    /** @return array<string, mixed> */
    private function datos(Request $request, Salon $salon): array
    {
        /** @var Placa|null $placa */
        $placa = $salon->placa()->first();
        $puerto = (int) $request->getPort();

        return [
            'driver' => config('lumiclass.driver'),
            'placa' => Placa::estado($placa),
            'puerto' => $puerto,
            'direcciones' => array_map(
                fn (array $d) => [...$d, 'servidor' => "http://{$d['ip']}:{$puerto}"],
                $this->red->detectar(),
            ),
            'servos' => $salon->actuadores()->with('luz')->orderBy('numero_en_placa')->get()
                ->map(fn ($a) => ['numero' => $a->numero_en_placa, 'nombre' => $a->nombre, 'luz' => $a->luz?->nombre])->all(),
            'sensores' => $salon->sensores()->orderBy('numero_en_placa')->get()
                ->map(fn ($s) => ['numero' => $s->numero_en_placa, 'nombre' => $s->nombre])->all(),
        ];
    }
}
