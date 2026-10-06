{{--
    Banda roja si la última consulta falló. Si ya había datos, se aclara que están desactualizados y desde cuándo.
    Usa errorConexion, estado y desactualizadoDesde del componente estadoSalon.
--}}
<div x-show="errorConexion" x-cloak role="alert"
    class="mb-4 flex items-start gap-3 rounded-xl border border-error bg-error-suave p-3 text-sm text-error-texto">
    <x-icono nombre="alerta" />
    <div class="flex-1">
        <p class="font-semibold" x-text="errorConexion"></p>
        <p x-show="estado">
            Datos desactualizados (última actualización <span x-text="desactualizadoDesde"></span>).
            Se reintenta solo; puedes seguir mirando.
        </p>
        <p x-show="!estado">Se reintenta solo cada pocos segundos.</p>
    </div>
</div>
