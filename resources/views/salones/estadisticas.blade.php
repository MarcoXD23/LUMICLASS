@extends('layouts.app', ['titulo' => 'Estadísticas', 'pagina' => 'estadisticas'])

@section('contenido')
    <div x-data="estadisticas({{ $salon->id }})" class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold">Estadísticas</h1>
                <p class="text-sm text-slate-600">Cuánto tiempo estuvieron encendidas las luces y cuánto de ese tiempo el salón
                    estaba vacío.</p>
            </div>

            {{-- Filtro de periodo: una sola fila, arriba de todo --}}
            <div class="inline-flex rounded-xl border border-slate-300 bg-white p-1" role="group" aria-label="Periodo">
                @foreach (['hoy' => 'Hoy', '7d' => '7 días', '30d' => '30 días'] as $valor => $texto)
                    <button type="button" class="btn min-h-11 lg:min-h-9 px-3"
                        :class="rango === '{{ $valor }}' ? 'bg-marca-600 text-white' : 'text-slate-700'"
                        :aria-pressed="rango === '{{ $valor }}'" @click="cambiarRango('{{ $valor }}')">{{ $texto }}</button>
                @endforeach
            </div>
        </div>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

        <template x-if="datos">
            <div class="space-y-4" :class="cargando && 'opacity-60'">
                {{-- Totales --}}
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div class="tarjeta">
                        <p class="titulo-seccion">Luces encendidas</p>
                        <p class="mt-1 text-2xl font-bold" x-text="duracion(totales.segundos_encendidas)"></p>
                        <p class="text-sm lg:text-xs text-slate-500">suma de todas las luces</p>
                    </div>
                    <div class="tarjeta">
                        <p class="titulo-seccion">Salón ocupado</p>
                        <p class="mt-1 text-2xl font-bold" x-text="duracion(totales.segundos_ocupado)"></p>
                        <p class="text-sm lg:text-xs text-slate-500">alguna zona con gente</p>
                    </div>
                    <div class="tarjeta" :class="totales.segundos_desperdicio && 'border-serie-2'">
                        <p class="titulo-seccion">Con la zona vacía</p>
                        <p class="mt-1 text-2xl font-bold" x-text="duracion(totales.segundos_desperdicio)"></p>
                        <p class="text-sm lg:text-xs text-slate-500"
                            x-text="`${porcentajeDesperdicio}% del tiempo encendidas`"></p>
                    </div>
                    <div class="tarjeta">
                        <p class="titulo-seccion">Actividad</p>
                        <dl class="mt-1 space-y-0.5 text-sm">
                            <div class="flex justify-between"><dt>Encendidos</dt><dd class="font-semibold" x-text="totales.encendidos"></dd></div>
                            <div class="flex justify-between"><dt>Apagados</dt><dd class="font-semibold" x-text="totales.apagados"></dd></div>
                            <div class="flex justify-between"><dt>Órdenes manuales</dt><dd class="font-semibold" x-text="totales.ordenes.usuario"></dd></div>
                            <div class="flex justify-between"><dt>Órdenes por regla</dt><dd class="font-semibold" x-text="totales.ordenes.regla"></dd></div>
                            <div class="flex justify-between" :class="totales.fallas && 'text-error-texto'">
                                <dt class="flex items-center gap-1"><x-icono nombre="alerta" clase="size-4" /> Fallas</dt>
                                <dd class="font-semibold" x-text="totales.fallas"></dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {{-- Leyenda común a los dos gráficos --}}
                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700" aria-hidden="true">
                    <span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-serie-1"></span> Encendidas con gente o
                        sin datos</span>
                    <span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-serie-2"></span> Encendidas con la zona
                        vacía</span>
                </div>

                {{-- Horas por día --}}
                <section class="tarjeta" x-show="dias.length > 1" aria-labelledby="titulo-dias">
                    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 id="titulo-dias" class="font-semibold">Horas encendidas por día</h2>
                        <button type="button" class="min-h-11 text-sm font-semibold text-marca-600 lg:min-h-0" @click="verTabla = !verTabla"
                            x-text="verTabla ? 'Ver gráfico' : 'Ver como tabla'"></button>
                    </div>

                    <div x-show="!verTabla">
                        {{-- Lectura del día elegido (al pasar el mouse o tocar una barra) --}}
                        <p class="mb-2 min-h-10 text-sm text-slate-700" aria-live="polite">
                            <template x-if="seleccionado">
                                <span>
                                    <strong x-text="seleccionado.etiquetaLarga"></strong>:
                                    <span x-text="duracion(seleccionado.segundos_encendidas)"></span> encendidas,
                                    <span x-text="duracion(seleccionado.segundos_desperdicio)"></span> con la zona vacía.
                                </span>
                            </template>
                            <span x-show="!seleccionado" class="text-slate-500">Toca o pasa el mouse sobre un día para ver el
                                detalle.</span>
                        </p>

                        <div class="relative flex h-52 gap-2 pl-10">
                            {{-- Eje y y líneas guía (recesivas). Base de las barras: 32 px (rótulos); alto de barras: 176 px (h-44). --}}
                            <template x-for="paso in [1, 0.5, 0]" :key="paso">
                                <div class="pointer-events-none absolute inset-x-0 flex translate-y-1/2 items-center"
                                    :style="`bottom: ${32 + paso * 176}px`">
                                    <span class="w-9 pr-1 text-right text-sm lg:text-xs text-slate-500"
                                        x-text="`${+(maximoHorasDia * paso).toFixed(1)} h`"></span>
                                    <span class="h-px flex-1 bg-slate-200"></span>
                                </div>
                            </template>

                            <template x-for="(dia, i) in dias" :key="dia.fecha">
                                <button type="button"
                                    class="group relative flex flex-1 flex-col items-center justify-end focus-visible:outline-2 focus-visible:outline-marca-600"
                                    @mouseenter="seleccionado = dia" @focus="seleccionado = dia" @click="seleccionado = dia"
                                    :aria-label="`${dia.etiquetaLarga}: ${duracion(dia.segundos_encendidas)} encendidas, ${duracion(dia.segundos_desperdicio)} con la zona vacía`">
                                    <div class="flex h-44 w-full max-w-10 flex-col-reverse"
                                        :class="seleccionado?.fecha === dia.fecha && 'opacity-100' || (seleccionado ? 'opacity-60' : '')">
                                        <div class="w-full bg-serie-1" :style="`height: ${alto(dia.segundos_utiles)}`"
                                            :class="!dia.segundos_desperdicio && 'rounded-t-[4px]'"></div>
                                        <div class="w-full bg-serie-2 rounded-t-[4px]" x-show="dia.segundos_desperdicio"
                                            :style="`height: ${alto(dia.segundos_desperdicio)}; margin-bottom: 2px`"></div>
                                    </div>
                                    <span class="mt-2 h-6 whitespace-nowrap text-sm text-slate-500 lg:hidden"
                                        x-text="rotular(i) ? dia.numero : ''"></span>
                                    <span class="mt-2 hidden h-6 whitespace-nowrap text-[11px] text-slate-500 lg:inline"
                                        x-text="rotular(i) ? dia.etiqueta : ''"></span>
                                </button>
                            </template>
                        </div>
                    </div>

                    <div x-show="verTabla" class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="text-sm lg:text-xs uppercase text-slate-500">
                                <tr>
                                    <th class="py-2">Día</th>
                                    <th class="py-2 text-right">Encendidas</th>
                                    <th class="py-2 text-right">Con la zona vacía</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <template x-for="dia in dias" :key="dia.fecha">
                                    <tr>
                                        <td class="py-2" x-text="dia.etiquetaLarga"></td>
                                        <td class="py-2 text-right" x-text="duracion(dia.segundos_encendidas)"></td>
                                        <td class="py-2 text-right" x-text="duracion(dia.segundos_desperdicio)"></td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </section>

                {{-- Horas por luz --}}
                <section class="tarjeta" aria-labelledby="titulo-luces">
                    <h2 id="titulo-luces" class="mb-3 font-semibold">Tiempo encendida por luz</h2>
                    <ul class="space-y-3">
                        <template x-for="luz in luces" :key="luz.id">
                            <li>
                                <div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                                    <span><span class="font-medium" x-text="luz.nombre"></span> <span class="text-slate-500"
                                            x-text="`· ${luz.zona}`"></span></span>
                                    <span class="text-slate-700">
                                        <span x-text="duracion(luz.segundos_encendida)"></span>
                                        <span x-show="luz.segundos_desperdicio" class="text-slate-500"
                                            x-text="`(${duracion(luz.segundos_desperdicio)} con la zona vacía)`"></span>
                                    </span>
                                </div>
                                <div class="flex h-3 w-full gap-[2px] rounded bg-slate-100" aria-hidden="true">
                                    <div class="h-full rounded-l-[4px] bg-serie-1"
                                        :class="!luz.segundos_desperdicio && 'rounded-r-[4px]'"
                                        :style="`width: ${ancho(luz.segundos_encendida - luz.segundos_desperdicio)}`"
                                        x-show="luz.segundos_encendida - luz.segundos_desperdicio > 0"></div>
                                    <div class="h-full rounded-r-[4px] bg-serie-2"
                                        :class="luz.segundos_encendida === luz.segundos_desperdicio && 'rounded-l-[4px]'"
                                        :style="`width: ${ancho(luz.segundos_desperdicio)}`" x-show="luz.segundos_desperdicio"></div>
                                </div>
                            </li>
                        </template>
                    </ul>
                </section>

                <p class="text-sm lg:text-xs text-slate-500">
                    Los tiempos salen de los cambios registrados desde que se instaló esta versión. Una luz o zona "sin datos" no
                    suma. El consumo en kWh se agregará cuando se confirme la potencia de los focos.
                </p>
            </div>
        </template>
    </div>
@endsection
