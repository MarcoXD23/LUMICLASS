{{-- Banda roja si la última consulta falló: los datos en pantalla pueden estar desactualizados. --}}
<div x-show="errorConexion" x-cloak role="alert"
    class="mb-4 flex items-start gap-3 rounded-xl border border-error bg-error-suave p-3 text-sm text-error-texto">
    <x-icono nombre="alerta" />
    <div class="flex-1">
        <p class="font-semibold" x-text="errorConexion"></p>
        <p x-show="estado">Los datos de abajo pueden estar desactualizados. Se reintenta cada 3 s.</p>
    </div>
</div>
