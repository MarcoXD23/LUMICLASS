@extends('layouts.app', ['titulo' => 'Sensores', 'pagina' => 'sensores'])

@section('contenido')
    <div x-data="estadoSalon({{ $salon->id }})" class="space-y-4">
        <x-aviso-conexion />

        <div>
            <h1 class="text-2xl font-bold">Sensores</h1>
            <p class="text-sm text-slate-600">Un sensor en falla o inactivo no se usa para decidir si el salón está vacío.</p>
        </div>

        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        <ul class="grid gap-3 md:grid-cols-2">
            <template x-for="sensor in sensores" :key="sensor.id">
                <li class="tarjeta space-y-3"
                    :class="sensor.conexion === 'falla' ? 'border-error' : (sensor.conexion === 'inactivo' ? 'border-aviso' : '')">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-3">
                            <span class="grid size-10 place-items-center rounded-xl"
                                :class="sensor.conexion === 'activo' ? 'bg-marca-50 text-marca-600' : 'bg-slate-100 text-slate-400'">
                                <x-icono nombre="sensor" clase="size-6" />
                            </span>
                            <div>
                                <p class="font-semibold" x-text="sensor.nombre"></p>
                                <p class="text-sm lg:text-xs text-slate-500" x-text="`${sensor.zonaNombre} · ${sensor.tipo.toUpperCase()}`"></p>
                            </div>
                        </div>
                        <span><x-insignia-conexion estado="sensor.conexion" /></span>
                    </div>

                    <dl class="grid grid-cols-2 gap-2 text-sm">
                        <div class="rounded-lg bg-slate-50 p-2">
                            <dt class="text-sm lg:text-xs text-slate-500">Presencia</dt>
                            <dd class="font-medium">
                                <span x-show="sensor.presencia === true" class="flex items-center gap-1 text-ocupado-texto">
                                    <x-icono nombre="persona" clase="size-4" /> Detecta
                                </span>
                                <span x-show="sensor.presencia === false" class="flex items-center gap-1 text-vacio-texto">
                                    <x-icono nombre="sin-persona" clase="size-4" /> No detecta
                                </span>
                                <span x-show="sensor.presencia === null" class="text-slate-500">Sin lectura</span>
                            </dd>
                        </div>
                        <div class="rounded-lg bg-slate-50 p-2">
                            <dt class="text-sm lg:text-xs text-slate-500">Última lectura</dt>
                            <dd class="font-medium" x-text="hace(sensor.ultima_lectura)"></dd>
                        </div>
                        <div class="col-span-2 rounded-lg bg-slate-50 p-2" x-show="sensor.conteo_personas !== null">
                            <dt class="text-sm lg:text-xs text-slate-500">Personas contadas</dt>
                            <dd class="font-medium" x-text="sensor.conteo_personas"></dd>
                        </div>
                    </dl>
                </li>
            </template>
        </ul>
    </div>
@endsection
