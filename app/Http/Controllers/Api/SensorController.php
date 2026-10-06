<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SensorResource;
use App\Models\Salon;
use App\Models\Sensor;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SensorController extends Controller
{
    public function index(Salon $salon): AnonymousResourceCollection
    {
        return SensorResource::collection($salon->sensores()->orderBy('sensores.id')->get());
    }

    public function show(Sensor $sensor): SensorResource
    {
        return SensorResource::make($sensor);
    }
}
