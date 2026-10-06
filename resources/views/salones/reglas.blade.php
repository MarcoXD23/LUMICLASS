@extends('layouts.app', ['titulo' => 'Reglas', 'pagina' => 'reglas'])

@section('contenido')
    <div x-data="reglas({{ $salon->id }})" class="space-y-4">
        <div class="flex items-end justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold">Reglas</h1>
                <p class="text-sm text-slate-600">Solo actúan en zonas en modo automático. Gana la de menor prioridad cuya
                    condición se cumpla.</p>
            </div>
            <button type="button" class="btn btn-primario shrink-0" @click="abrirNueva" aria-label="Nueva regla">
                <x-icono nombre="mas" /> <span class="hidden sm:inline">Nueva regla</span>
            </button>
        </div>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>
        <p x-show="cargando" class="text-sm text-slate-500">Cargando…</p>

        {{-- Formulario (crear o editar) --}}
        <section x-show="formularioAbierto" x-cloak class="tarjeta border-marca-600" aria-labelledby="titulo-formulario">
            <h2 id="titulo-formulario" class="mb-3 font-semibold" x-text="editandoId ? 'Editar regla' : 'Nueva regla'"></h2>
            <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="guardar" novalidate>
                <div class="sm:col-span-2">
                    <x-campo etiqueta="Nombre" x-model="formulario.nombre" maxlength="100" required error="errores.nombre" />
                </div>

                <div>
                    <label class="etiqueta" for="regla-presencia">Cuando el salón esté</label>
                    <select id="regla-presencia" class="campo" x-model="formulario.presencia">
                        <option value="ocupado">Ocupado</option>
                        <option value="vacio">Vacío</option>
                    </select>
                    <p class="error-campo" x-show="errores['condicion.presencia']" x-text="errores['condicion.presencia']"></p>
                </div>

                <x-campo etiqueta="Durante al menos (minutos, 0 = de inmediato)" type="number" min="0" max="1440"
                    x-model="formulario.minutos" error="errores['condicion.duracion_segundos']" />

                <div>
                    <label class="etiqueta" for="regla-accion">Entonces</label>
                    <select id="regla-accion" class="campo" x-model="formulario.accion">
                        <option value="encender">Encender las luces</option>
                        <option value="apagar">Apagar las luces</option>
                    </select>
                </div>

                <div>
                    <label class="etiqueta" for="regla-zona">En</label>
                    <select id="regla-zona" class="campo" x-model="formulario.zona_id">
                        <option value="">Todas las zonas</option>
                        <template x-for="zona in zonas" :key="zona.id">
                            <option :value="zona.id" x-text="zona.nombre" :selected="String(zona.id) === String(formulario.zona_id)"></option>
                        </template>
                    </select>
                    <p class="error-campo" x-show="errores.zona_id" x-text="errores.zona_id"></p>
                </div>

                <x-campo etiqueta="Prioridad (1 = primero)" type="number" min="1" max="1000" x-model="formulario.prioridad"
                    error="errores.prioridad" />

                <label class="flex items-center gap-2 self-end pb-3 text-sm font-medium">
                    <input type="checkbox" class="size-5 rounded" x-model="formulario.activa"> Regla activa
                </label>

                <div class="flex gap-2 sm:col-span-2">
                    <button type="submit" class="btn btn-primario" :disabled="guardando">Guardar</button>
                    <button type="button" class="btn btn-secundario" @click="formularioAbierto = false">Cancelar</button>
                </div>
            </form>
        </section>

        {{-- Lista --}}
        <ul class="space-y-3">
            <template x-for="regla in lista" :key="regla.id">
                <li class="tarjeta flex flex-col gap-3 sm:flex-row sm:items-center" :class="!regla.activa && 'opacity-60'">
                    <span class="grid size-10 shrink-0 place-items-center rounded-xl"
                        :class="regla.accion.accion === 'encender' ? 'bg-encendida-suave text-encendida-texto' : 'bg-apagada-suave text-apagada-texto'">
                        <x-icono nombre="regla" />
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold" x-text="regla.nombre"></p>
                        <p class="text-sm text-slate-600">
                            Si está <strong x-text="describirCondicion(regla.condicion).toLowerCase()"></strong>
                            → <strong x-text="regla.accion.accion === 'encender' ? 'encender' : 'apagar'"></strong>
                            · <span x-text="nombreZona(regla.zona_id)"></span>
                            · prioridad <span x-text="regla.prioridad"></span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="btn min-h-9 px-3"
                            :class="regla.activa ? 'bg-ocupado-suave text-ocupado-texto' : 'bg-slate-200 text-slate-700'"
                            :aria-pressed="regla.activa" @click="alternar(regla)">
                            <span x-text="regla.activa ? 'Activa' : 'Inactiva'"></span>
                        </button>
                        <button type="button" class="btn btn-secundario min-h-9 px-3" @click="abrirEdicion(regla)"
                            :aria-label="`Editar ${regla.nombre}`">
                            <x-icono nombre="editar" clase="size-4" />
                        </button>
                        <button type="button" class="btn btn-secundario min-h-9 px-3 text-error-texto" @click="borrar(regla)"
                            :aria-label="`Borrar ${regla.nombre}`">
                            <x-icono nombre="borrar" clase="size-4" />
                        </button>
                    </div>
                </li>
            </template>
        </ul>

        <p x-show="!cargando && !lista.length" x-cloak class="tarjeta text-center text-slate-600">
            Este salón no tiene reglas: las luces solo cambian con órdenes manuales.
        </p>
    </div>
@endsection
