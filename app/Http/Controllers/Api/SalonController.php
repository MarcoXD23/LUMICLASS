<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarSalonRequest;
use App\Http\Resources\SalonResource;
use App\Http\Resources\ZonaResource;
use App\Http\RespuestaError;
use App\Models\Salon;
use App\Servicios\CreadorSalon;
use App\Servicios\EstadoSalon;
use App\Servicios\ServicioTick;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/** Los salones de la cuenta que inició sesión. Los de otras cuentas responden 404 (ver routes/api.php). */
class SalonController extends Controller
{
    /** PROPUESTA: evita que una cuenta llene la base de datos. */
    public const MAXIMO_POR_CUENTA = 20;

    public function index(Request $request): AnonymousResourceCollection
    {
        return SalonResource::collection(
            $request->user()->salones()->withCount(['zonas', 'luces'])->orderBy('id')->get(),
        );
    }

    public function store(GuardarSalonRequest $request, CreadorSalon $creador): JsonResponse
    {
        $usuario = $request->user();

        if ($usuario->salones()->count() >= self::MAXIMO_POR_CUENTA) {
            return RespuestaError::json('limite_salones', 'Llegaste al máximo de '.self::MAXIMO_POR_CUENTA.' salones por cuenta.', 409);
        }

        $salon = $creador->crear(
            $usuario,
            $request->validated('nombre'),
            (int) $request->validated('zonas', 2),
            (int) $request->validated('luces_por_zona', 2),
        );

        return SalonResource::make($salon->loadCount(['zonas', 'luces']))->response()->setStatusCode(201);
    }

    public function show(Salon $salon): SalonResource
    {
        return SalonResource::make($salon->loadCount(['zonas', 'luces']));
    }

    public function update(GuardarSalonRequest $request, Salon $salon): SalonResource
    {
        $salon->update(['nombre' => $request->validated('nombre')]);

        return SalonResource::make($salon->loadCount(['zonas', 'luces']));
    }

    /** Borra el salón con sus zonas, luces, servos, sensores, reglas e historial. */
    public function destroy(Salon $salon): Response
    {
        $salon->delete();

        return response()->noContent();
    }

    /** Todo el dashboard de un salón en una sola llamada. */
    public function estado(Salon $salon, EstadoSalon $estadoSalon, ServicioTick $tick): JsonResponse
    {
        // Así la demo avanza (órdenes lentas, reglas con duración) con solo tener el dashboard abierto.
        $tick->ejecutarSiCorresponde();

        $salon->load(['zonas' => fn ($q) => $q->orderBy('id'), 'zonas.luces.actuador', 'zonas.sensores']);

        return response()->json([
            'data' => [
                'salon' => ['id' => $salon->id, 'nombre' => $salon->nombre],
                ...$estadoSalon->resumen($salon),
                'alertas' => $estadoSalon->alertas($salon),
                'zonas' => ZonaResource::collection($salon->zonas)->resolve(),
            ],
        ]);
    }
}
