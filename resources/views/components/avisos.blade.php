{{-- Avisos flotantes (resources/js/avisos.js). Sobre la barra inferior en celular. --}}
<div class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end"
    aria-live="polite" x-data>
    <template x-for="aviso in $store.avisos.lista" :key="aviso.id">
        <div class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 text-sm shadow-lg"
            :class="{
                'border-ocupado bg-ocupado-suave text-ocupado-texto': aviso.tipo === 'exito',
                'border-error bg-error-suave text-error-texto': aviso.tipo === 'error',
                'border-marca-600 bg-marca-50 text-marca-900': aviso.tipo === 'info',
            }"
            :role="aviso.tipo === 'error' ? 'alert' : 'status'">
            <span x-show="aviso.tipo === 'exito'"><x-icono nombre="exito" /></span>
            <span x-show="aviso.tipo === 'error'"><x-icono nombre="alerta" /></span>
            <span x-show="aviso.tipo === 'info'"><x-icono nombre="info" /></span>
            <p class="flex-1" x-text="aviso.texto"></p>
            <button type="button" class="-my-2.5 -mr-2 grid size-11 shrink-0 place-items-center opacity-70 hover:opacity-100 lg:m-0 lg:block lg:size-auto" @click="$store.avisos.quitar(aviso.id)"
                aria-label="Cerrar aviso">
                <x-icono nombre="cerrar" clase="size-4" />
            </button>
        </div>
    </template>
</div>
