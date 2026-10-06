@extends('layouts.app', ['titulo' => 'Configurar salón', 'pagina' => 'configuracion'])

@section('contenido')
    <div x-data="configuracion({{ $salon->id }})" class="space-y-4">
        <div>
            <h1 class="text-2xl font-bold">Configurar salón</h1>
            <p class="text-sm text-slate-600">Agrega, renombra, mueve o quita zonas, luces y sensores. Cada luz nueva trae su
                servo. Los cambios quedan en el Historial.</p>
        </div>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>
        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        <template x-for="zona in zonas" :key="zona.id">
            <section class="tarjeta space-y-4" :aria-label="`Zona ${zona.nombre}`">
                {{-- Zona --}}
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                        <h2 class="truncate text-lg font-semibold" x-text="zona.nombre"></h2>
                        <x-insignia-modo estado="zona.modo" />
                    </div>
                    <div class="flex gap-2">
                        <button type="button" class="btn btn-secundario min-h-11 px-3 lg:min-h-9" :disabled="trabajando"
                            @click="renombrarZona(zona)" :aria-label="`Renombrar zona ${zona.nombre}`">
                            <x-icono nombre="editar" clase="size-4" /> <span class="hidden sm:inline">Renombrar</span>
                        </button>
                        <button type="button" class="btn btn-secundario min-h-11 px-3 text-error-texto lg:min-h-9"
                            :disabled="trabajando || zonas.length <= 1" @click="quitarZona(zona)"
                            :aria-label="`Quitar zona ${zona.nombre}`"
                            :title="zonas.length <= 1 ? 'El salón debe tener al menos una zona' : ''">
                            <x-icono nombre="borrar" clase="size-4" /> <span class="hidden sm:inline">Quitar zona</span>
                        </button>
                    </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                    {{-- Luces --}}
                    <div>
                        <h3 class="titulo-seccion mb-2">Luces y servos</h3>
                        <ul class="space-y-2">
                            <template x-for="luz in zona.luces" :key="luz.id">
                                <li class="space-y-2 rounded-xl bg-slate-50 p-3">
                                    {{-- Arriba el nombre con sus botones; abajo, a todo el ancho, "Mover a…" (así el nombre no se corta en celular). --}}
                                    <div class="flex items-center gap-2">
                                        <div class="min-w-0 flex-1">
                                            <p class="truncate font-medium" x-text="luz.nombre"></p>
                                            <p class="text-sm text-slate-500 lg:text-xs" x-text="luz.actuador ? luz.actuador.nombre : 'Sin servo'"></p>
                                        </div>
                                        <button type="button" class="btn btn-secundario min-h-11 shrink-0 px-3 lg:min-h-9" :disabled="trabajando"
                                            @click="renombrarLuz(luz)" :aria-label="`Renombrar ${luz.nombre}`">
                                            <x-icono nombre="editar" clase="size-4" />
                                        </button>
                                        <button type="button" class="btn btn-secundario min-h-11 shrink-0 px-3 text-error-texto lg:min-h-9"
                                            :disabled="trabajando" @click="quitarLuz(luz)" :aria-label="`Quitar ${luz.nombre}`">
                                            <x-icono nombre="borrar" clase="size-4" />
                                        </button>
                                    </div>
                                    <label class="sr-only" :for="`mover-${luz.id}`" x-text="`Mover ${luz.nombre} a otra zona`"></label>
                                    <select :id="`mover-${luz.id}`" class="campo lg:min-h-9" x-show="zonas.length > 1"
                                        :disabled="trabajando" @change="moverLuz(luz, $event.target.value)">
                                        <template x-for="destino in zonas" :key="destino.id">
                                            <option :value="destino.id" x-text="destino.id === zona.id ? `En ${destino.nombre}` : `Mover a ${destino.nombre}`"
                                                :selected="destino.id === zona.id"></option>
                                        </template>
                                    </select>
                                </li>
                            </template>
                            <li x-show="!zona.luces.length" class="text-sm text-slate-500">Esta zona no tiene luces.</li>
                        </ul>
                        <form class="mt-2 flex gap-2" @submit.prevent="agregarLuz(zona)">
                            <label class="sr-only" :for="`nueva-luz-${zona.id}`">Nombre de la luz nueva</label>
                            <input :id="`nueva-luz-${zona.id}`" class="campo" maxlength="100" placeholder="Nombre de la luz nueva"
                                x-model="nuevaLuz[zona.id]">
                            <button type="submit" class="btn btn-primario shrink-0" :disabled="trabajando">
                                <x-icono nombre="mas" clase="size-4" /> Luz
                            </button>
                        </form>
                    </div>

                    {{-- Sensores --}}
                    <div>
                        <h3 class="titulo-seccion mb-2">Sensores de presencia</h3>
                        <ul class="space-y-2">
                            <template x-for="sensor in zona.sensores" :key="sensor.id">
                                <li class="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate font-medium" x-text="sensor.nombre"></p>
                                        <p class="text-sm text-slate-500 lg:text-xs" x-text="sensor.tipo.toUpperCase()"></p>
                                    </div>
                                    <button type="button" class="btn btn-secundario min-h-11 px-3 lg:min-h-9" :disabled="trabajando"
                                        @click="renombrarSensor(sensor)" :aria-label="`Renombrar ${sensor.nombre}`">
                                        <x-icono nombre="editar" clase="size-4" />
                                    </button>
                                    <button type="button" class="btn btn-secundario min-h-11 px-3 text-error-texto lg:min-h-9"
                                        :disabled="trabajando" @click="quitarSensor(sensor)" :aria-label="`Quitar ${sensor.nombre}`">
                                        <x-icono nombre="borrar" clase="size-4" />
                                    </button>
                                </li>
                            </template>
                            <li x-show="!zona.sensores.length" class="flex items-start gap-2 rounded-xl bg-aviso-suave p-3 text-sm text-aviso-texto">
                                <x-icono nombre="alerta" clase="size-4 mt-0.5 shrink-0" />
                                Sin sensores: el sistema no sabe si hay gente y las reglas de esta zona no actúan.
                            </li>
                        </ul>
                        <form class="mt-2 flex gap-2" @submit.prevent="agregarSensor(zona)">
                            <label class="sr-only" :for="`nuevo-sensor-${zona.id}`">Nombre del sensor nuevo</label>
                            <input :id="`nuevo-sensor-${zona.id}`" class="campo" maxlength="100" placeholder="Nombre del sensor nuevo"
                                x-model="nuevoSensor[zona.id]">
                            <button type="submit" class="btn btn-primario shrink-0" :disabled="trabajando">
                                <x-icono nombre="mas" clase="size-4" /> Sensor
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </template>

        {{-- Nueva zona --}}
        <section class="tarjeta" aria-labelledby="titulo-nueva-zona">
            <h2 id="titulo-nueva-zona" class="mb-3 flex items-center gap-2 font-semibold"><x-icono nombre="mas" /> Nueva zona</h2>
            <form class="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end" @submit.prevent="crearZona" novalidate>
                <x-campo etiqueta="Nombre" x-model="nuevaZona.nombre" placeholder="Zona de la ventana" maxlength="100" required
                    error="erroresZona.nombre" />
                <x-campo etiqueta="Luces" type="number" min="0" max="10" x-model="nuevaZona.luces" error="erroresZona.luces" />
                <x-campo etiqueta="Sensores" type="number" min="0" max="3" x-model="nuevaZona.sensores" error="erroresZona.sensores" />
                <button type="submit" class="btn btn-primario" :disabled="trabajando">Crear zona</button>
            </form>
        </section>
    </div>
@endsection
