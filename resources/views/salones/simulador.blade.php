@extends('layouts.app', ['titulo' => 'Simulador', 'pagina' => 'simulador'])

@section('contenido')
    <div x-data="simulador({{ $salon->id }})" class="space-y-4">
        <x-aviso-conexion />

        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 class="flex items-center gap-2 text-2xl font-bold"><x-icono nombre="simulador" clase="size-7" /> Simulador</h1>
                <p class="text-sm text-slate-600">Hardware simulado: fuerza situaciones y mira cómo reacciona el sistema en
                    Inicio y Control.</p>
            </div>
            <button type="button" class="btn btn-peligro shrink-0" @click="reiniciar" :disabled="trabajando">Reiniciar</button>
        </div>

        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        <template x-if="estado">
            <div class="space-y-4">
                {{-- Presencia --}}
                <section class="tarjeta space-y-3" aria-labelledby="sim-presencia">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="sim-presencia" class="font-semibold">Presencia en todo el salón</h2>
                        <x-insignia-ocupacion estado="estado.ocupacion" />
                    </div>
                    <div class="grid gap-2 sm:grid-cols-[1fr_1fr_10rem]">
                        <button type="button" class="btn bg-ocupado text-white" :disabled="trabajando" @click="presencia(true)">
                            <x-icono nombre="persona" /> Entra gente
                        </button>
                        <button type="button" class="btn bg-vacio text-white" :disabled="trabajando" @click="presencia(false)">
                            <x-icono nombre="sin-persona" /> Queda vacío
                        </button>
                        <x-campo etiqueta="Personas (opcional)" type="number" min="0" max="500" x-model="conteo" />
                    </div>
                    <p class="text-sm lg:text-xs text-slate-500">
                        Las reglas con espera (p. ej. "vacío durante 5 min") se cumplen solas mientras esta página está abierta.
                        Factor de tiempo actual: <strong x-text="sim?.tiempos.factor_tiempo_reglas ?? '…'"></strong>
                        (cámbialo con LUMICLASS_FACTOR_TIEMPO_REGLAS en .env).
                    </p>
                    <button type="button" class="btn btn-secundario" :disabled="trabajando" @click="tick">Avanzar ahora (tick)</button>
                </section>

                {{-- Por zona --}}
                <template x-for="zona in zonas" :key="zona.id">
                    <section class="tarjeta space-y-4" :aria-label="`Zona ${zona.nombre}`">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h2 class="font-semibold" x-text="zona.nombre"></h2>
                            <div class="flex flex-wrap gap-1">
                                <x-insignia-ocupacion estado="zona.ocupacion" />
                                <x-insignia-modo estado="zona.modo" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button type="button" class="btn btn-secundario" :disabled="trabajando" @click="presencia(true, zona)">
                                Presencia en esta zona
                            </button>
                            <button type="button" class="btn btn-secundario" :disabled="trabajando" @click="presencia(false, zona)">
                                Zona vacía
                            </button>
                        </div>

                        {{-- Sensores --}}
                        <div>
                            <h3 class="titulo-seccion mb-2">Sensores</h3>
                            <ul class="space-y-2">
                                <template x-for="sensor in zona.sensores" :key="sensor.id">
                                    <li class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-medium" x-text="sensor.nombre"></span>
                                            <x-insignia-conexion estado="sensor.conexion" />
                                        </div>
                                        <label class="sr-only" :for="`sim-sensor-${sensor.id}`">Conexión del sensor</label>
                                        <select :id="`sim-sensor-${sensor.id}`" class="campo w-auto min-h-11 lg:min-h-9"
                                            :value="sensor.conexion" :disabled="trabajando"
                                            @change="conexionSensor(sensor, $event.target.value)">
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Desconectado</option>
                                            <option value="falla">Falla</option>
                                        </select>
                                    </li>
                                </template>
                            </ul>
                        </div>

                        {{-- Luces y servos --}}
                        <div>
                            <h3 class="titulo-seccion mb-2">Luces y servos</h3>
                            <ul class="space-y-2">
                                <template x-for="luz in zona.luces" :key="luz.id">
                                    <li class="space-y-2 rounded-xl bg-slate-50 p-3">
                                        <div class="flex flex-wrap items-center justify-between gap-2">
                                            <span class="text-sm font-medium" x-text="luz.nombre"></span>
                                            <x-insignia-luz estado="luz.estado_real" />
                                        </div>
                                        <div class="grid gap-2 sm:grid-cols-3" x-show="luz.actuador">
                                            <div>
                                                <label class="etiqueta text-sm lg:text-xs" :for="`sim-resp-${luz.id}`"
                                                    x-text="`${luz.actuador?.nombre}: respuesta`"></label>
                                                <select :id="`sim-resp-${luz.id}`" class="campo min-h-11 lg:min-h-9"
                                                    :value="respuestaDe(luz.actuador?.id)" :disabled="trabajando"
                                                    @change="respuestaServo(luz.actuador, $event.target.value)">
                                                    <option value="ok">Responde bien</option>
                                                    <option value="lento">Lento</option>
                                                    <option value="sin_respuesta">No responde</option>
                                                    <option value="falla">Falla</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="etiqueta text-sm lg:text-xs" :for="`sim-con-${luz.id}`">Conexión del servo</label>
                                                <select :id="`sim-con-${luz.id}`" class="campo min-h-11 lg:min-h-9"
                                                    :value="luz.actuador?.conexion" :disabled="trabajando"
                                                    @change="conexionServo(luz.actuador, $event.target.value)">
                                                    <option value="activo">Activo</option>
                                                    <option value="inactivo">Desconectado</option>
                                                    <option value="falla">Falla</option>
                                                </select>
                                            </div>
                                            <div>
                                                <span class="etiqueta text-sm lg:text-xs">Interruptor de pared</span>
                                                <div class="grid grid-cols-2 gap-1">
                                                    <button type="button" class="btn btn-encender min-h-11 lg:min-h-9 px-2" :disabled="trabajando"
                                                        @click="interruptor(luz, 'encendida')">On</button>
                                                    <button type="button" class="btn btn-apagar min-h-11 lg:min-h-9 px-2" :disabled="trabajando"
                                                        @click="interruptor(luz, 'apagada')">Off</button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                </template>
                            </ul>
                        </div>
                    </section>
                </template>
            </div>
        </template>
    </div>
@endsection
