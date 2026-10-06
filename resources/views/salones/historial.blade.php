@extends('layouts.app', ['titulo' => 'Historial', 'pagina' => 'historial'])

@section('contenido')
    <div x-data="historial({{ $salon->id }})" class="space-y-4">
        <div class="flex items-end justify-between gap-3">
            <div>
                <h1 class="text-2xl font-bold">Historial</h1>
                <p class="text-sm text-slate-600">Encendidos, apagados, presencia, cambios de modo y errores, del más reciente
                    al más antiguo. La primera página se actualiza sola.</p>
            </div>
            <a :href="urlCsv" class="btn btn-secundario shrink-0" download aria-label="Descargar CSV">
                <x-icono nombre="descargar" clase="size-4" /> <span class="hidden sm:inline">Descargar CSV</span>
            </a>
        </div>

        <form class="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" @submit.prevent="filtrar">
            <div>
                <label class="etiqueta" for="filtro-tipo">Tipo</label>
                <select id="filtro-tipo" class="campo" x-model="filtros.tipo">
                    <option value="">Todos</option>
                    <template x-for="[valor, texto] in tipos" :key="valor">
                        <option :value="valor" x-text="texto"></option>
                    </template>
                </select>
            </div>
            <div>
                <label class="etiqueta" for="filtro-severidad">Severidad</label>
                <select id="filtro-severidad" class="campo" x-model="filtros.severidad">
                    <option value="">Todas</option>
                    <option value="info">Info</option>
                    <option value="advertencia">Advertencia</option>
                    <option value="error">Error</option>
                </select>
            </div>
            <x-campo etiqueta="Desde" type="date" x-model="filtros.desde" />
            <x-campo etiqueta="Hasta" type="date" x-model="filtros.hasta" />
            <div class="flex gap-2">
                <button type="submit" class="btn btn-primario flex-1">Filtrar</button>
                <button type="button" class="btn btn-secundario" @click="limpiar">Limpiar</button>
            </div>
        </form>

        <p x-show="errorCarga" x-text="errorCarga" x-cloak role="alert"
            class="rounded-xl bg-error-suave p-3 text-sm text-error-texto"></p>

        <ol class="tarjeta divide-y divide-slate-100 p-0" :class="cargando && 'opacity-60'">
            <template x-for="evento in eventos" :key="evento.id">
                <li class="flex gap-3 p-3">
                    <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                        :class="{
                            'bg-error-suave text-error-texto': evento.severidad === 'error',
                            'bg-aviso-suave text-aviso-texto': evento.severidad === 'advertencia',
                            'bg-marca-50 text-marca-600': evento.severidad === 'info',
                        }">
                        <span x-show="evento.severidad === 'info'"><x-icono nombre="info" clase="size-4" /></span>
                        <span x-show="evento.severidad !== 'info'"><x-icono nombre="alerta" clase="size-4" /></span>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm" x-text="evento.mensaje"></p>
                        <p class="mt-0.5 text-sm lg:text-xs text-slate-500">
                            <span x-text="fechaHora(evento.fecha)"></span>
                            · <span x-text="etiqueta('evento', evento.tipo)"></span>
                            · <span x-text="etiqueta('origen', evento.origen)"></span>
                            <span x-show="evento.severidad !== 'info'">· <strong x-text="etiqueta('severidad', evento.severidad)"></strong></span>
                        </p>
                    </div>
                </li>
            </template>
            <li x-show="!cargando && !eventos.length" class="p-6 text-center text-sm text-slate-500">
                No hay eventos con esos filtros.
            </li>
        </ol>

        <nav class="flex items-center justify-between gap-2" x-show="meta && meta.last_page > 1" aria-label="Páginas">
            <button type="button" class="btn btn-secundario" :disabled="pagina <= 1" @click="irA(pagina - 1)">Anterior</button>
            <span class="text-sm text-slate-600" x-text="`Página ${meta?.current_page} de ${meta?.last_page}`"></span>
            <button type="button" class="btn btn-secundario" :disabled="pagina >= meta?.last_page" @click="irA(pagina + 1)">Siguiente</button>
        </nav>
    </div>
@endsection
