@extends('layouts.app', ['titulo' => 'Mis salones'])

@section('contenido')
    <div x-data="salones" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Mis salones</h1>
            <p class="text-sm text-slate-600">Elige un salón para ver su estado y controlar sus luces.</p>
        </div>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

        <p x-show="cargando" class="text-sm text-slate-500">Cargando salones…</p>

        <ul class="grid gap-3 sm:grid-cols-2" x-show="!cargando" x-cloak>
            <template x-for="salon in lista" :key="salon.id">
                <li class="tarjeta flex flex-col gap-3">
                    <template x-if="editandoId !== salon.id">
                        <a :href="`/salones/${salon.id}`" class="group flex items-start gap-3">
                            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600">
                                <x-icono nombre="salon" clase="size-6" />
                            </span>
                            <span class="min-w-0">
                                <span class="block truncate font-semibold group-hover:text-marca-600" x-text="salon.nombre"></span>
                                <span class="text-sm text-slate-500"
                                    x-text="`${salon.zonas} zona(s) · ${salon.luces} luz(ces)`"></span>
                            </span>
                        </a>
                    </template>

                    <template x-if="editandoId === salon.id">
                        <form class="flex gap-2" @submit.prevent="guardarNombre(salon)">
                            <label class="sr-only" :for="`nombre-${salon.id}`">Nuevo nombre</label>
                            <input :id="`nombre-${salon.id}`" class="campo" x-model="nombreEditado" maxlength="100" required>
                            <button class="btn btn-primario" type="submit">Guardar</button>
                        </form>
                    </template>

                    <div class="flex gap-2 border-t border-slate-100 pt-3">
                        <a :href="`/salones/${salon.id}`" class="btn btn-primario flex-1">Abrir</a>
                        <button type="button" class="btn btn-secundario" @click="editandoId === salon.id ? editandoId = null : editar(salon)"
                            :aria-label="`Renombrar ${salon.nombre}`">
                            <x-icono nombre="editar" clase="size-4" />
                        </button>
                        <button type="button" class="btn btn-secundario text-error-texto" @click="borrar(salon)"
                            :aria-label="`Borrar ${salon.nombre}`">
                            <x-icono nombre="borrar" clase="size-4" />
                        </button>
                    </div>
                </li>
            </template>
        </ul>

        <p x-show="!cargando && !lista.length && !errorCarga" x-cloak class="tarjeta text-center text-slate-600">
            Todavía no tienes salones. Crea el primero abajo.
        </p>

        <section class="tarjeta" aria-labelledby="titulo-nuevo">
            <h2 id="titulo-nuevo" class="mb-3 flex items-center gap-2 font-semibold">
                <x-icono nombre="mas" /> Nuevo salón
            </h2>
            <form class="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" @submit.prevent="crear" novalidate>
                <x-campo etiqueta="Nombre" x-model="nuevo.nombre" placeholder="Aula 204" maxlength="100" required
                    error="errores.nombre" />
                <x-campo etiqueta="Zonas" type="number" min="1" max="10" x-model="nuevo.zonas" error="errores.zonas" />
                <x-campo etiqueta="Luces por zona" type="number" min="1" max="10" x-model="nuevo.luces_por_zona"
                    error="errores.luces_por_zona" />
                <button type="submit" class="btn btn-primario" :disabled="creando">Crear</button>
            </form>
            <p class="mt-3 text-xs text-slate-500">Cada luz recibe su servo, cada zona un sensor PIR, y el salón las dos reglas
                iniciales (encender con presencia, apagar tras 5 min vacío).</p>
        </section>
    </div>
@endsection
