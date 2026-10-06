@extends('layouts.app', ['titulo' => 'Inicio', 'pagina' => 'inicio'])

@section('contenido')
    <div x-data="estadoSalon({{ $salon->id }})" class="space-y-4">
        <x-aviso-conexion />

        <div class="flex items-end justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold">Estado del salón</h1>
                <p class="text-sm text-slate-500">
                    Última actualización: <span x-text="hace(estado?.ultima_actualizacion)">…</span>
                </p>
            </div>
            <button type="button" class="btn btn-secundario min-h-9 px-3" @click="recargar" aria-label="Actualizar ahora">
                <x-icono nombre="recargar" clase="size-4" />
            </button>
        </div>

        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        <template x-if="estado">
            <div class="space-y-4">
                {{-- Resumen --}}
                <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div class="tarjeta"
                        :class="{
                            'border-ocupado bg-ocupado-suave': estado.ocupacion === 'ocupado',
                            'border-vacio bg-vacio-suave': estado.ocupacion === 'vacio',
                        }">
                        <p class="titulo-seccion">Salón</p>
                        <div class="mt-2"><x-insignia-ocupacion estado="estado.ocupacion" /></div>
                        <p class="mt-2 text-sm text-slate-600" x-show="estado.personas_detectadas !== null"
                            x-text="`${estado.personas_detectadas} persona(s) detectada(s)`"></p>
                    </div>

                    <div class="tarjeta" :class="estado.luces.encendidas && 'border-encendida bg-encendida-suave'">
                        <p class="titulo-seccion">Luces encendidas</p>
                        <p class="mt-1 flex items-center gap-2 text-3xl font-bold">
                            <x-icono nombre="foco" clase="size-7 text-encendida" />
                            <span x-text="`${estado.luces.encendidas}/${estado.luces.total}`"></span>
                        </p>
                        <p class="text-sm text-aviso-texto" x-show="estado.luces.desconocidas"
                            x-text="`${estado.luces.desconocidas} en estado desconocido`"></p>
                    </div>

                    <div class="tarjeta">
                        <p class="titulo-seccion">Sensores activos</p>
                        <p class="mt-1 flex items-center gap-2 text-3xl font-bold">
                            <x-icono nombre="sensor" clase="size-7 text-marca-600" />
                            <span x-text="`${estado.sensores.activos}/${estado.sensores.total}`"></span>
                        </p>
                    </div>

                    <div class="tarjeta" :class="estado.alertas.length && 'border-error bg-error-suave'">
                        <p class="titulo-seccion">Alertas</p>
                        <p class="mt-1 flex items-center gap-2 text-3xl font-bold"
                            :class="estado.alertas.length ? 'text-error-texto' : 'text-ocupado-texto'">
                            <x-icono nombre="alerta" clase="size-7" />
                            <span x-text="estado.alertas.length"></span>
                        </p>
                    </div>
                </div>

                {{-- Alertas --}}
                <section x-show="estado.alertas.length" class="tarjeta border-error" aria-labelledby="titulo-alertas">
                    <h2 id="titulo-alertas" class="mb-2 flex items-center gap-2 font-semibold text-error-texto">
                        <x-icono nombre="alerta" /> Requiere atención
                    </h2>
                    <ul class="space-y-2">
                        <template x-for="(alerta, i) in estado.alertas" :key="i">
                            <li class="flex items-start gap-2 rounded-lg p-2 text-sm"
                                :class="alerta.nivel === 'error' ? 'bg-error-suave text-error-texto' : 'bg-aviso-suave text-aviso-texto'">
                                <x-icono nombre="alerta" clase="size-4 mt-0.5 shrink-0" />
                                <span x-text="alerta.mensaje"></span>
                            </li>
                        </template>
                    </ul>
                </section>

                {{-- Zonas --}}
                <div class="grid gap-3 md:grid-cols-2">
                    <template x-for="zona in zonas" :key="zona.id">
                        <section class="tarjeta space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <h2 class="font-semibold" x-text="zona.nombre"></h2>
                                <div class="flex flex-wrap gap-1">
                                    <x-insignia-ocupacion estado="zona.ocupacion" />
                                    <x-insignia-modo estado="zona.modo" />
                                </div>
                            </div>
                            <ul class="divide-y divide-slate-100">
                                <template x-for="luz in zona.luces" :key="luz.id">
                                    <li class="flex items-center justify-between gap-2 py-2">
                                        <span class="text-sm" x-text="luz.nombre"></span>
                                        <span><x-insignia-luz estado="luz.estado_real" /></span>
                                    </li>
                                </template>
                            </ul>
                        </section>
                    </template>
                </div>

                <div class="flex flex-col gap-2 sm:flex-row">
                    <a href="{{ route('salones.control', $salon) }}" class="btn btn-primario">
                        <x-icono nombre="control" /> Ir a controlar las luces
                    </a>
                    <a href="{{ route('salones.estadisticas', $salon) }}" class="btn btn-secundario">
                        <x-icono nombre="estadisticas" /> Ver estadísticas
                    </a>
                </div>
            </div>
        </template>
    </div>
@endsection
