<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarLuzRequest;
use App\Http\Requests\GuardarSensorRequest;
use App\Http\Requests\GuardarZonaRequest;
use App\Http\Resources\LuzResource;
use App\Http\Resources\SensorResource;
use App\Http\Resources\ZonaResource;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use App\Servicios\ConfiguracionSalon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Configurar un salón: zonas, luces (con su servo) y sensores. Los {id} ya vienen filtrados por dueño
 * (routes/api.php): lo de otra cuenta responde 404. Las reglas de negocio están en ConfiguracionSalon.
 */
class ConfiguracionController extends Controller
{
    private const RELACIONES = ['luces.actuador', 'sensores'];

    public function __construct(private readonly ConfiguracionSalon $configuracion) {}

    public function crearZona(GuardarZonaRequest $request, Salon $salon): JsonResponse
    {
        $zona = $this->configuracion->crearZona(
            $salon,
            $request->validated('nombre'),
            (int) $request->validated('luces', 2),
            (int) $request->validated('sensores', 1),
        );

        return ZonaResource::make($zona->load(self::RELACIONES))->response()->setStatusCode(201);
    }

    public function renombrarZona(GuardarZonaRequest $request, Zona $zona): ZonaResource
    {
        $this->configuracion->renombrarZona($zona, $request->validated('nombre'));

        return ZonaResource::make($zona->load(self::RELACIONES));
    }

    public function quitarZona(Zona $zona): Response
    {
        $this->configuracion->quitarZona($zona);

        return response()->noContent();
    }

    public function agregarLuz(GuardarLuzRequest $request, Zona $zona): JsonResponse
    {
        $luz = $this->configuracion->agregarLuz($zona, $request->validated('nombre'));

        return LuzResource::make($luz)->response()->setStatusCode(201);
    }

    public function editarLuz(GuardarLuzRequest $request, Luz $luz): LuzResource
    {
        $destino = $request->has('zona_id') ? Zona::findOrFail($request->integer('zona_id')) : null;

        return LuzResource::make($this->configuracion->editarLuz($luz, $request->validated('nombre'), $destino));
    }

    public function quitarLuz(Luz $luz): Response
    {
        $this->configuracion->quitarLuz($luz);

        return response()->noContent();
    }

    public function agregarSensor(GuardarSensorRequest $request, Zona $zona): JsonResponse
    {
        $sensor = $this->configuracion->agregarSensor($zona, $request->validated('nombre'));

        return SensorResource::make($sensor)->response()->setStatusCode(201);
    }

    public function renombrarSensor(GuardarSensorRequest $request, Sensor $sensor): SensorResource
    {
        $this->configuracion->renombrarSensor($sensor, $request->validated('nombre'));

        return SensorResource::make($sensor->fresh());
    }

    /** ?confirmar=1 (o {"confirmar": true}) para quitar el último sensor de una zona en automático. */
    public function quitarSensor(Request $request, Sensor $sensor): Response
    {
        $this->configuracion->quitarSensor($sensor, $request->boolean('confirmar'));

        return response()->noContent();
    }
}
