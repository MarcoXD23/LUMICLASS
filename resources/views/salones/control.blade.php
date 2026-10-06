@extends('layouts.app', ['titulo' => 'Control', 'pagina' => 'control'])

@section('contenido')
    <div x-data="control({{ $salon->id }})" class="space-y-4">
        <x-aviso-conexion />

        <div>
            <h1 class="text-2xl font-bold">Control de luces</h1>
            <p class="text-sm text-slate-600">Una orden manual pasa la zona a <strong>manual</strong> para que las reglas no la
                reviertan. Vuelve a <strong>automático</strong> cuando quieras.</p>
        </div>

        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        <template x-for="zona in zonas" :key="zona.id">
            <section class="tarjeta space-y-4" :aria-label="zona.nombre">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 class="text-lg font-semibold" x-text="zona.nombre"></h2>
                        <div class="mt-1 flex flex-wrap gap-1"><x-insignia-ocupacion estado="zona.ocupacion" /></div>
                    </div>

                    {{-- Automático / manual --}}
                    <div class="inline-flex rounded-xl border border-slate-300 p-1" role="group" aria-label="Modo de la zona">
                        <button type="button" class="btn min-h-9 px-3"
                            :class="zona.modo === 'automatico' ? 'bg-marca-600 text-white' : 'text-slate-700'"
                            :aria-pressed="zona.modo === 'automatico'" :disabled="ocupado(`modo-${zona.id}`)"
                            @click="cambiarModo(zona, 'automatico')">
                            <x-icono nombre="automatico" clase="size-4" /> Automático
                        </button>
                        <button type="button" class="btn min-h-9 px-3"
                            :class="zona.modo === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-700'"
                            :aria-pressed="zona.modo === 'manual'" :disabled="ocupado(`modo-${zona.id}`)"
                            @click="cambiarModo(zona, 'manual')">
                            <x-icono nombre="manual" clase="size-4" /> Manual
                        </button>
                    </div>
                </div>

                {{-- Toda la zona --}}
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" class="btn btn-encender" :disabled="ocupado(`zona-${zona.id}`)"
                        @click="ordenarZona(zona, 'encender')">
                        <x-icono nombre="foco" /> Encender zona
                    </button>
                    <button type="button" class="btn btn-apagar" :disabled="ocupado(`zona-${zona.id}`)"
                        @click="ordenarZona(zona, 'apagar')">
                        <x-icono nombre="foco" /> Apagar zona
                    </button>
                </div>

                {{-- Cada luz --}}
                <ul class="grid gap-2 sm:grid-cols-2">
                    <template x-for="luz in zona.luces" :key="luz.id">
                        <li class="rounded-xl border p-3"
                            :class="{
                                'border-encendida bg-encendida-suave': luz.estado_real === 'encendida',
                                'border-slate-200 bg-slate-50': luz.estado_real === 'apagada',
                                'border-aviso bg-aviso-suave': luz.estado_real === 'desconocida',
                            }">
                            <div class="flex items-center justify-between gap-2">
                                <p class="font-medium" x-text="luz.nombre"></p>
                                <span><x-insignia-luz estado="luz.estado_real" /></span>
                            </div>

                            <p class="mt-1 text-xs text-slate-600" x-show="luz.actuador?.ocupado">
                                Servo trabajando… esperando confirmación.
                            </p>
                            <p class="mt-1 text-xs text-error-texto"
                                x-show="luz.actuador && luz.actuador.conexion !== 'activo'"
                                x-text="`Servo ${etiqueta('conexion', luz.actuador?.conexion).toLowerCase()}: no se puede accionar.`"></p>
                            <p class="mt-1 text-xs text-aviso-texto"
                                x-show="luz.estado_real === 'desconocida' && luz.actuador?.ultimo_resultado && luz.actuador.ultimo_resultado !== 'ok'"
                                x-text="luz.actuador?.ultimo_resultado"></p>

                            <div class="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" class="btn btn-encender min-h-10"
                                    :disabled="ocupado(`luz-${luz.id}`) || luz.actuador?.ocupado"
                                    @click="ordenarLuz(luz, 'encender')" :aria-label="`Encender ${luz.nombre}`">
                                    Encender
                                </button>
                                <button type="button" class="btn btn-apagar min-h-10"
                                    :disabled="ocupado(`luz-${luz.id}`) || luz.actuador?.ocupado"
                                    @click="ordenarLuz(luz, 'apagar')" :aria-label="`Apagar ${luz.nombre}`">
                                    Apagar
                                </button>
                            </div>
                        </li>
                    </template>
                </ul>
            </section>
        </template>
    </div>
@endsection
