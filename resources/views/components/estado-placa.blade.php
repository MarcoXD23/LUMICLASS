{{-- Dashboard: "Placa en línea / desconectada". Solo aparece con LUMICLASS_DRIVER=real (estado.placa viene null en simulación). --}}
<template x-if="estado?.placa">
    <a href="{{ $enlace }}#conectar-placa" role="status"
        class="flex items-center gap-3 rounded-xl border p-3 text-sm"
        :class="estado.placa.en_linea ? 'border-ocupado bg-ocupado-suave text-ocupado-texto' : 'border-error bg-error-suave text-error-texto'">
        <span class="relative flex size-3 shrink-0">
            <span x-show="estado.placa.en_linea" class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50 motion-reduce:hidden"></span>
            <span class="relative inline-flex size-3 rounded-full bg-current"></span>
        </span>
        <span class="min-w-0 flex-1">
            <strong x-text="estado.placa.en_linea ? 'Placa en línea' : (estado.placa.configurada ? 'Placa desconectada' : 'Placa sin configurar')"></strong>
            <span class="block text-xs opacity-90"
                x-text="estado.placa.ultimo_contacto
                    ? `Último contacto ${hace(estado.placa.ultimo_contacto)}` + (estado.placa.en_linea ? '' : ': sensores y servos inactivos.')
                    : 'Toca aquí para conectarla.'"></span>
        </span>
    </a>
</template>
